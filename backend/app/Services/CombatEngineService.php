<?php

namespace App\Services;

use App\Models\BattleLog;
use App\Models\Character;
use App\Models\CharacterMonsterStat;
use App\Models\Monster;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CombatEngineService
{
    public function fightMonster(Character $character, Monster $monster, int $times = 1): array
    {
        $times = max(1, min(3, $times));

        if ($monster->is_boss && $times > 1) {
            throw ValidationException::withMessages([
                'times' => ['Chefes de Zona não permitem varredura múltipla. Enfrente-o individualmente!'],
            ]);
        }

        return DB::transaction(function () use ($character, $monster, $times) {
            /** @var Character $char */
            $char = Character::with(['server', 'realm', 'cultivationRank'])
                ->where('id', $character->id)
                ->lockForUpdate()
                ->firstOrFail();

            $char->syncLazyResources();

            // Carrega/cria registro no Bestiário
            $bestiary = CharacterMonsterStat::firstOrCreate(
                ['character_id' => $char->id, 'monster_id' => $monster->id],
                ['kills_count' => 0, 'defeats_count' => 0]
            );

            // Verifica Cooldown de Chefe
            if ($monster->is_boss && $bestiary->boss_cooldown_until && $bestiary->boss_cooldown_until->isFuture()) {
                $secs = (int) now()->diffInSeconds($bestiary->boss_cooldown_until);
                throw ValidationException::withMessages([
                    'boss_cooldown' => ["O Chefe {$monster->name} está se regenerando. Aguarde {$secs}s para desafiá-lo novamente."],
                ]);
            }

            // Varredura (x3) exige já ter derrotado a besta ao menos 3 vezes
            if ($times > 1 && $bestiary->kills_count < 3) {
                throw ValidationException::withMessages([
                    'sweep' => ['Derrote esta besta pelo menos 3 vezes antes de liberar a Varredura Rápida (x3).'],
                ]);
            }

            $totalEnergyCost = $monster->energy_cost * $times;

            if ($char->energy < $totalEnergyCost) {
                throw ValidationException::withMessages([
                    'energy' => ["Energia insuficiente (necessário: {$totalEnergyCost}, atual: {$char->energy})."],
                ]);
            }

            if ($char->hp <= 0) {
                throw ValidationException::withMessages([
                    'hp' => ['Seu personagem está gravemente ferido. Cure-se antes de caçar!'],
                ]);
            }

            // Deduz energia total
            $char->energy -= $totalEnergyCost;

            $effStats = $char->effective_stats;
            $rankMult = $char->cultivationRank->stat_multiplier ?? 1.0;
            $mastery = $bestiary->masteryTier();
            $masteryDamageMult = 1 + ($mastery['damage_bonus_pct'] / 100);

            $playerAttack = (int) round(($effStats['strength'] * 1.8 + $effStats['spirit_power'] * 1.2) * $rankMult * $masteryDamageMult);
            $playerDefense = (int) round(($effStats['constitution'] * 1.4 + $effStats['agility'] * 0.5) * $rankMult);
            $playerCritChance = min(45, 5 + (int) floor($effStats['agility'] * 0.4));
            $playerSpeed = $effStats['agility'];

            $monster->load('drops.item');

            $totalXp = 0;
            $totalStones = 0;
            $totalQi = 0;
            $totalLevels = 0;
            $allDrops = [];
            $lastLog = [];
            $lastRounds = 0;
            $lastOutcome = 'victory';
            $lastBattleId = 0;
            $fightsCompleted = 0;

            for ($fightIdx = 1; $fightIdx <= $times; $fightIdx++) {
                if ($char->hp <= 0) {
                    break;
                }

                $fightsCompleted++;
                $playerHp = $char->hp;
                $monsterHp = $monster->max_hp;
                $round = 0;
                $maxRounds = 25;
                $log = [];
                $playerTurn = $playerSpeed >= $monster->agility;

                while ($playerHp > 0 && $monsterHp > 0 && $round < $maxRounds) {
                    $round++;

                    if ($playerTurn) {
                        $isCrit = random_int(1, 100) <= $playerCritChance;
                        $variance = random_int(90, 112) / 100;
                        $rawDamage = max(3, ($playerAttack - ($monster->defense * 0.65)) * $variance);
                        $damage = (int) round($isCrit ? $rawDamage * 1.65 : $rawDamage);

                        $monsterHp = max(0, $monsterHp - $damage);
                        $log[] = [
                            'round' => $round,
                            'actor' => 'player',
                            'damage' => $damage,
                            'crit' => $isCrit,
                            'target_hp' => $monsterHp,
                            'text' => $isCrit
                                ? "Rodada {$round}: Golpe Crítico! Você causou {$damage} de dano em {$monster->name}."
                                : "Rodada {$round}: Você atacou {$monster->name} causando {$damage} de dano.",
                        ];
                    } else {
                        // Boss tem 20% de chance de habilidade furiosa (1.4x dano)
                        $bossFury = $monster->is_boss && random_int(1, 100) <= 20;
                        $variance = random_int(90, 110) / 100;
                        $rawDamage = max(2, ($monster->attack - ($playerDefense * 0.6)) * $variance);
                        $damage = (int) round($bossFury ? $rawDamage * 1.4 : $rawDamage);

                        $playerHp = max(0, $playerHp - $damage);
                        $log[] = [
                            'round' => $round,
                            'actor' => 'monster',
                            'damage' => $damage,
                            'crit' => $bossFury,
                            'target_hp' => $playerHp,
                            'text' => $bossFury
                                ? "Rodada {$round}: 💥 Fúria de Chefe! {$monster->name} desferiu {$damage} de dano!"
                                : "Rodada {$round}: {$monster->name} contra-atacou causando {$damage} de dano.",
                        ];
                    }

                    $playerTurn = ! $playerTurn;
                }

                $victory = $monsterHp <= 0 && $playerHp > 0;
                $outcome = $victory ? 'victory' : 'defeat';

                $xpGained = 0;
                $stonesGained = 0;
                $qiGained = 0;

                if ($victory) {
                    $xpMult = $char->server->xp_multiplier ?? 1.0;
                    $dropMult = $char->server->drop_multiplier ?? 1.0;

                    $xpGained = (int) round($monster->xp_reward * $xpMult);
                    $stonesGained = (int) round($monster->spirit_stones_reward * $dropMult);
                    $qiGained = (int) round(($monster->cultivation_qi_reward ?? 0) * $xpMult);

                    $char->hp = $playerHp;
                    $char->spirit_stones += $stonesGained;

                    $progress = $char->grantExperience($xpGained);
                    $totalLevels += $progress['levels_gained'];

                    if ($qiGained > 0) {
                        $char->grantCultivationXp($qiGained);
                    }

                    $bestiary->kills_count += 1;
                    if ($monster->is_boss && $monster->boss_cooldown_seconds > 0) {
                        $bestiary->boss_cooldown_until = now()->addSeconds($monster->boss_cooldown_seconds);
                    }

                    // Rolagem de Drops com bônus do Bestiário
                    $masteryDropBonus = $bestiary->masteryTier()['drop_bonus_pct'];
                    foreach ($monster->drops as $drop) {
                        if (! $drop->item) {
                            continue;
                        }
                        $effectiveChance = min(100, ($drop->drop_chance_pct + $masteryDropBonus) * $dropMult);
                        $roll = random_int(1, 10000) / 100;

                        if ($roll <= $effectiveChance) {
                            $qty = random_int($drop->min_quantity, max($drop->min_quantity, $drop->max_quantity));
                            $char->addItemToInventory($drop->item, $qty);

                            $itemId = $drop->item->id;
                            if (! isset($allDrops[$itemId])) {
                                $allDrops[$itemId] = [
                                    'item_id' => $itemId,
                                    'name' => $drop->item->name,
                                    'rarity' => $drop->item->rarity,
                                    'quantity' => 0,
                                ];
                            }
                            $allDrops[$itemId]['quantity'] += $qty;
                        }
                    }

                    $totalXp += $xpGained;
                    $totalStones += $stonesGained;
                    $totalQi += $qiGained;
                } else {
                    $char->hp = max(1, (int) round($effStats['max_hp'] * 0.1));
                    $bestiary->defeats_count += 1;
                }

                $battleLog = BattleLog::create([
                    'character_id' => $char->id,
                    'monster_id' => $monster->id,
                    'outcome' => $outcome,
                    'rounds' => $round,
                    'xp_gained' => $xpGained,
                    'spirit_stones_gained' => $stonesGained,
                    'combat_log' => $log,
                ]);

                $lastLog = $log;
                $lastRounds = $round;
                $lastOutcome = $outcome;
                $lastBattleId = $battleLog->id;

                if (! $victory) {
                    break;
                }
            }

            $bestiary->save();
            $char->last_active_at = now();
            $char->save();
            $char->load(['server', 'realm', 'cultivationRank']);

            return [
                'outcome' => $lastOutcome,
                'fights_completed' => $fightsCompleted,
                'rounds' => $lastRounds,
                'xp_gained' => $totalXp,
                'spirit_stones_gained' => $totalStones,
                'qi_gained' => $totalQi,
                'items_dropped' => array_values($allDrops),
                'levels_gained' => $totalLevels,
                'rank_up_title' => null,
                'combat_log' => $lastLog,
                'battle_id' => $lastBattleId,
                'bestiary' => [
                    'monster_id' => $monster->id,
                    'kills_count' => $bestiary->kills_count,
                    'mastery' => $bestiary->masteryTier(),
                    'boss_cooldown_until' => $bestiary->boss_cooldown_until?->toIso8601String(),
                ],
                'character' => $char,
            ];
        });
    }
}
