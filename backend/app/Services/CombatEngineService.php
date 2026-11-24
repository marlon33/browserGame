<?php

namespace App\Services;

use App\Models\BattleLog;
use App\Models\Character;
use App\Models\Monster;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CombatEngineService
{
    public function fightMonster(Character $character, Monster $monster): array
    {
        return DB::transaction(function () use ($character, $monster) {
            /** @var Character $char */
            $char = Character::with(['server', 'realm', 'cultivationRank', 'items.item'])
                ->where('id', $character->id)
                ->lockForUpdate()
                ->firstOrFail();

            $char->syncLazyResources();

            if ($char->energy < $monster->energy_cost) {
                throw ValidationException::withMessages([
                    'energy' => ["Energia insuficiente. Necessário: {$monster->energy_cost}, atual: {$char->energy}."],
                ]);
            }

            if ($char->hp <= 0) {
                throw ValidationException::withMessages([
                    'hp' => ['Seu cultivador está ferido. Medite ou use uma pílula de cura antes de caçar.'],
                ]);
            }

            $char->energy -= $monster->energy_cost;

            // Usa effective_stats (Base + Equipamentos)
            $stats = $char->effective_stats;
            $rankMult = $char->cultivationRank->stat_multiplier ?? 1.0;

            $playerAtk = (int) round(($stats['strength'] * 1.8 + $stats['spirit_power'] * 1.2) * $rankMult);
            $playerDef = (int) round(($stats['constitution'] * 1.4 + $stats['agility'] * 0.5) * $rankMult);
            $playerCritChance = min(45, 5 + (int) floor($stats['agility'] * 0.4));

            $playerHp = min($char->hp, $stats['max_hp']);
            $monsterHp = $monster->max_hp;

            $rounds = 0;
            $maxRounds = 25;
            $log = [];

            $playerFirst = $stats['agility'] >= $monster->agility;

            while ($playerHp > 0 && $monsterHp > 0 && $rounds < $maxRounds) {
                $rounds++;
                $turnOrder = $playerFirst ? ['player', 'monster'] : ['monster', 'player'];

                foreach ($turnOrder as $actor) {
                    if ($playerHp <= 0 || $monsterHp <= 0) {
                        break;
                    }

                    if ($actor === 'player') {
                        $isCrit = random_int(1, 100) <= $playerCritChance;
                        $variance = random_int(90, 110) / 100;
                        $rawDamage = max(3, ($playerAtk - (int) floor($monster->defense * 0.6)));
                        $damage = (int) max(1, round($rawDamage * $variance * ($isCrit ? 1.65 : 1.0)));

                        $monsterHp = max(0, $monsterHp - $damage);

                        $log[] = [
                            'round' => $rounds,
                            'actor' => 'player',
                            'damage' => $damage,
                            'crit' => $isCrit,
                            'target_hp' => $monsterHp,
                            'text' => $isCrit
                                ? "Rodada {$rounds}: Golpe Espiritual Crítico de {$char->name} causou {$damage} de dano!"
                                : "Rodada {$rounds}: {$char->name} atacou e causou {$damage} de dano.",
                        ];
                    } else {
                        $variance = random_int(90, 110) / 100;
                        $rawDamage = max(2, ($monster->attack - (int) floor($playerDef * 0.55)));
                        $damage = (int) max(1, round($rawDamage * $variance));

                        $playerHp = max(0, $playerHp - $damage);

                        $log[] = [
                            'round' => $rounds,
                            'actor' => 'monster',
                            'damage' => $damage,
                            'crit' => false,
                            'target_hp' => $playerHp,
                            'text' => "Rodada {$rounds}: {$monster->name} contra-atacou causando {$damage} de dano.",
                        ];
                    }
                }
            }

            $victory = $monsterHp <= 0 && $playerHp > 0;
            $xpGained = 0;
            $stonesGained = 0;
            $itemsDropped = [];
            $progression = ['levels_gained' => 0, 'rank_up_title' => null];

            if ($victory) {
                $xpMult = $char->server->xp_multiplier ?? 1.0;
                $dropMult = $char->server->drop_multiplier ?? 1.0;

                $xpGained = (int) round($monster->xp_reward * $xpMult);
                $stonesGained = (int) round($monster->spirit_stones_reward * $dropMult);

                $char->hp = $playerHp;
                $char->spirit_stones += $stonesGained;
                $progression = $char->grantExperience($xpGained);

                // Sorteio Server-Authoritative de Drops
                $monster->load('drops.item');
                foreach ($monster->drops as $drop) {
                    $effectiveChance = min(100, (int) round($drop->drop_chance_pct * $dropMult));
                    if (random_int(1, 100) <= $effectiveChance && $drop->item) {
                        $qty = random_int($drop->min_quantity, max($drop->min_quantity, $drop->max_quantity));
                        $char->addItemToInventory($drop->item, $qty);
                        $itemsDropped[] = [
                            'item_id' => $drop->item->id,
                            'name' => $drop->item->name,
                            'rarity' => $drop->item->rarity,
                            'quantity' => $qty,
                        ];
                    }
                }
            } else {
                $char->hp = max(1, (int) floor($stats['max_hp'] * 0.1));
            }

            $char->last_active_at = now();
            $char->save();
            $char->load(['server', 'realm', 'cultivationRank']);

            $battleLog = BattleLog::create([
                'character_id' => $char->id,
                'monster_id' => $monster->id,
                'outcome' => $victory ? 'victory' : 'defeat',
                'rounds' => $rounds,
                'xp_gained' => $xpGained,
                'spirit_stones_gained' => $stonesGained,
                'combat_log' => $log,
            ]);

            return [
                'outcome' => $victory ? 'victory' : 'defeat',
                'rounds' => $rounds,
                'xp_gained' => $xpGained,
                'spirit_stones_gained' => $stonesGained,
                'items_dropped' => $itemsDropped,
                'levels_gained' => $progression['levels_gained'],
                'rank_up_title' => $progression['rank_up_title'],
                'combat_log' => $log,
                'battle_id' => $battleLog->id,
                'character' => $char,
            ];
        });
    }
}
