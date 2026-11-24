<?php

namespace App\Services;

use App\Models\ActiveBattle;
use App\Models\BattleLog;
use App\Models\Character;
use App\Models\CharacterMonsterStat;
use App\Models\Monster;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TacticalCombatService
{
    public const PLAYER_TURN_SECONDS = 15;
    public const MONSTER_TURN_SECONDS = 3;

    /**
     * Inicia uma nova batalha tática por turnos ou retorna a batalha ativa existente
     */
    public function startBattle(Character $character, Monster $monster): ActiveBattle
    {
        return DB::transaction(function () use ($character, $monster) {
            /** @var Character $char */
            $char = Character::with(['server', 'realm', 'cultivationRank'])
                ->where('id', $character->id)
                ->lockForUpdate()
                ->firstOrFail();

            $char->syncLazyResources();

            // Se já houver uma batalha ativa, retorna ela
            $existing = ActiveBattle::with('monster.drops.item')
                ->where('character_id', $char->id)
                ->where('status', 'active')
                ->first();

            if ($existing) {
                return $existing;
            }

            $bestiary = CharacterMonsterStat::firstOrCreate(
                ['character_id' => $char->id, 'monster_id' => $monster->id],
                ['kills_count' => 0, 'defeats_count' => 0]
            );

            if ($monster->is_boss && $bestiary->boss_cooldown_until && $bestiary->boss_cooldown_until->isFuture()) {
                $secs = (int) now()->diffInSeconds($bestiary->boss_cooldown_until);
                throw ValidationException::withMessages([
                    'boss_cooldown' => ["O Chefe {$monster->name} está se regenerando. Aguarde {$secs}s."],
                ]);
            }

            if ($char->energy < $monster->energy_cost) {
                throw ValidationException::withMessages([
                    'energy' => ["Energia insuficiente (necessário: {$monster->energy_cost}, atual: {$char->energy})."],
                ]);
            }

            if ($char->hp <= 0) {
                throw ValidationException::withMessages([
                    'hp' => ['Seu personagem está sem HP. Cure-se antes de entrar em combate!'],
                ]);
            }

            // Deduz energia de entrada no combate
            $char->energy -= $monster->energy_cost;
            $char->last_active_at = now();
            $char->save();

            $effStats = $char->effective_stats;
            $playerStarts = $effStats['agility'] >= $monster->agility;

            $initialLog = [
                [
                    'round' => 1,
                    'actor' => 'system',
                    'damage' => 0,
                    'crit' => false,
                    'text' => $playerStarts
                        ? "⚔️ Encontro iniciado contra {$monster->name}! Sua agilidade garante o primeiro turno (15s)."
                        : "⚠️ Emboscada! {$monster->name} é mais veloz e atacará primeiro em 3s!",
                ],
            ];

            $battle = ActiveBattle::create([
                'character_id' => $char->id,
                'monster_id' => $monster->id,
                'status' => 'active',
                'current_turn' => $playerStarts ? 'player' : 'monster',
                'round' => 1,
                'player_hp' => $char->hp,
                'player_max_hp' => $effStats['max_hp'],
                'monster_hp' => $monster->max_hp,
                'monster_max_hp' => $monster->max_hp,
                'turn_actions_used' => [
                    'heal' => false,
                    'support' => false,
                ],
                'active_effects' => [
                    'player_buff_turns' => 0,
                    'monster_debuff_turns' => 0,
                ],
                'combat_log' => $initialLog,
                'turn_expires_at' => now()->addSeconds(
                    $playerStarts ? self::PLAYER_TURN_SECONDS : self::MONSTER_TURN_SECONDS
                ),
            ]);

            return $battle->load('monster.drops.item');
        });
    }

    /**
     * Executa uma ação do jogador no turno atual:
     * - 'heal' (Recuperação de vida - até 1x no turno, não passa a vez)
     * - 'buff' (Aura Espiritual - até 1x apoio no turno, não passa a vez)
     * - 'debuff' (Selo de Fraqueza - até 1x apoio no turno, não passa a vez)
     * - 'physical' (Ataque Físico - encerra turno do jogador e passa para o mob)
     * - 'magic' (Técnica Espiritual / Magia - encerra turno do jogador e passa para o mob)
     * - 'pass' (Passar turno / tempo esgotado de 15s - passa para o mob)
     */
    public function performPlayerAction(Character $character, ActiveBattle $battle, string $action): array
    {
        return DB::transaction(function () use ($character, $battle, $action) {
            /** @var ActiveBattle $b */
            $b = ActiveBattle::with(['monster.drops.item'])
                ->where('id', $battle->id)
                ->where('character_id', $character->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($b->status !== 'active') {
                throw ValidationException::withMessages([
                    'battle' => ['Esta batalha já foi encerrada.'],
                ]);
            }

            if ($b->current_turn !== 'player') {
                throw ValidationException::withMessages([
                    'turn' => ['Aguarde o turno do inimigo finalizar!'],
                ]);
            }

            /** @var Character $char */
            $char = Character::with(['server', 'realm', 'cultivationRank'])
                ->where('id', $character->id)
                ->lockForUpdate()
                ->firstOrFail();

            $effStats = $char->effective_stats;
            $rankMult = $char->cultivationRank->stat_multiplier ?? 1.0;

            $bestiary = CharacterMonsterStat::firstOrCreate(
                ['character_id' => $char->id, 'monster_id' => $b->monster_id],
                ['kills_count' => 0, 'defeats_count' => 0]
            );
            $masteryDamageMult = 1 + ($bestiary->masteryTier()['damage_bonus_pct'] / 100);

            $actionsUsed = $b->turn_actions_used ?? ['heal' => false, 'support' => false];
            $effects = $b->active_effects ?? ['player_buff_turns' => 0, 'monster_debuff_turns' => 0];
            $log = $b->combat_log ?? [];

            $buffActive = ($effects['player_buff_turns'] ?? 0) > 0;
            $debuffActive = ($effects['monster_debuff_turns'] ?? 0) > 0;
            $buffMult = $buffActive ? 1.25 : 1.0;
            $debuffDefMult = $debuffActive ? 0.70 : 1.0;

            // Se o tempo de 15s expirou, força passagem de turno
            if ($b->turn_expires_at && $b->turn_expires_at->isPast() && $action !== 'pass') {
                $action = 'pass';
            }

            switch ($action) {
                case 'heal':
                    if ($actionsUsed['heal'] ?? false) {
                        throw ValidationException::withMessages([
                            'action' => ['Você já usou Recuperação de Vida neste turno!'],
                        ]);
                    }
                    $healAmount = max(12, (int) round(($effStats['spirit_power'] * 2.4 + $b->player_max_hp * 0.14) * $rankMult));
                    $b->player_hp = min($b->player_max_hp, $b->player_hp + $healAmount);
                    $actionsUsed['heal'] = true;

                    $log[] = [
                        'round' => $b->round,
                        'actor' => 'player',
                        'damage' => 0,
                        'crit' => false,
                        'text' => "💚 Turno {$b->round}: Você canalizou Qi Vital e recuperou +{$healAmount} HP!",
                    ];
                    break;

                case 'buff':
                    if ($actionsUsed['support'] ?? false) {
                        throw ValidationException::withMessages([
                            'action' => ['Você já utilizou uma técnica de Buff/Debuff neste turno!'],
                        ]);
                    }
                    $effects['player_buff_turns'] = 2;
                    $actionsUsed['support'] = true;

                    $log[] = [
                        'round' => $b->round,
                        'actor' => 'player',
                        'damage' => 0,
                        'crit' => false,
                        'text' => "🔥 Turno {$b->round}: Aura Espiritual ativada! (+25% Ataque e Defesa por 2 turnos).",
                    ];
                    break;

                case 'debuff':
                    if ($actionsUsed['support'] ?? false) {
                        throw ValidationException::withMessages([
                            'action' => ['Você já utilizou uma técnica de Buff/Debuff neste turno!'],
                        ]);
                    }
                    $effects['monster_debuff_turns'] = 2;
                    $actionsUsed['support'] = true;

                    $log[] = [
                        'round' => $b->round,
                        'actor' => 'player',
                        'damage' => 0,
                        'crit' => false,
                        'text' => "🌀 Turno {$b->round}: Selo de Fraqueza aplicado em {$b->monster->name}! (-30% Defesa e -20% Ataque por 2 turnos).",
                    ];
                    break;

                case 'physical':
                    $critChance = min(45, 5 + (int) floor($effStats['agility'] * 0.4));
                    $isCrit = random_int(1, 100) <= $critChance;
                    $variance = random_int(92, 110) / 100;

                    $physAtk = ($effStats['strength'] * 2.3 + $effStats['agility'] * 0.6) * $rankMult * $masteryDamageMult * $buffMult;
                    $targetDef = $b->monster->defense * $debuffDefMult * 0.65;
                    $rawDmg = max(4, ($physAtk - $targetDef) * $variance);
                    $damage = (int) round($isCrit ? $rawDmg * 1.65 : $rawDmg);

                    $b->monster_hp = max(0, $b->monster_hp - $damage);
                    $log[] = [
                        'round' => $b->round,
                        'actor' => 'player',
                        'damage' => $damage,
                        'crit' => $isCrit,
                        'text' => $isCrit
                            ? "⚔️ Turno {$b->round}: Golpe Físico CRÍTICO! {$damage} de dano em {$b->monster->name}!"
                            : "⚔️ Turno {$b->round}: Ataque Físico causou {$damage} de dano em {$b->monster->name}.",
                    ];

                    // Encerra turno do jogador -> passa para o Mob (3s)
                    $b->current_turn = 'monster';
                    $b->turn_expires_at = now()->addSeconds(self::MONSTER_TURN_SECONDS);
                    break;

                case 'magic':
                    $critChance = min(45, 5 + (int) floor($effStats['agility'] * 0.35));
                    $isCrit = random_int(1, 100) <= $critChance;
                    $variance = random_int(94, 114) / 100;

                    // Magia escala fortemente com Poder Espiritual e ignora metade da defesa física
                    $magicAtk = ($effStats['spirit_power'] * 2.6 + $effStats['strength'] * 0.4) * $rankMult * $masteryDamageMult * $buffMult;
                    $targetDef = $b->monster->defense * $debuffDefMult * 0.30;
                    $rawDmg = max(5, ($magicAtk - $targetDef) * $variance);
                    $damage = (int) round($isCrit ? $rawDmg * 1.7 : $rawDmg);

                    $b->monster_hp = max(0, $b->monster_hp - $damage);
                    $log[] = [
                        'round' => $b->round,
                        'actor' => 'player',
                        'damage' => $damage,
                        'crit' => $isCrit,
                        'text' => $isCrit
                            ? "✨ Turno {$b->round}: Técnica Espiritual CRÍTICA! {$damage} de dano arcano!"
                            : "✨ Turno {$b->round}: Técnica Espiritual causou {$damage} de dano arcano.",
                    ];

                    // Encerra turno do jogador -> passa para o Mob (3s)
                    $b->current_turn = 'monster';
                    $b->turn_expires_at = now()->addSeconds(self::MONSTER_TURN_SECONDS);
                    break;

                case 'pass':
                default:
                    $log[] = [
                        'round' => $b->round,
                        'actor' => 'player',
                        'damage' => 0,
                        'crit' => false,
                        'text' => "⏳ Turno {$b->round}: Você encerrou sua postura e passou a vez para {$b->monster->name}.",
                    ];
                    $b->current_turn = 'monster';
                    $b->turn_expires_at = now()->addSeconds(self::MONSTER_TURN_SECONDS);
                    break;
            }

            $b->turn_actions_used = $actionsUsed;
            $b->active_effects = $effects;
            $b->combat_log = $log;

            // Verifica se o monstro morreu
            if ($b->monster_hp <= 0) {
                return $this->finalizeBattle($char, $b, $bestiary, true);
            }

            $b->save();
            $char->load(['server', 'realm', 'cultivationRank']);

            return [
                'battle' => $b->fresh('monster.drops.item'),
                'character' => $char,
            ];
        });
    }

    /**
     * Executa o turno do Monstro após os 3s e devolve a vez para o Jogador (com novo timer de 15s)
     */
    public function executeMonsterTurn(Character $character, ActiveBattle $battle): array
    {
        return DB::transaction(function () use ($character, $battle) {
            /** @var ActiveBattle $b */
            $b = ActiveBattle::with(['monster.drops.item'])
                ->where('id', $battle->id)
                ->where('character_id', $character->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($b->status !== 'active') {
                /** @var Character $char */
                $char = Character::with(['server', 'realm', 'cultivationRank'])->findOrFail($character->id);
                return [
                    'battle' => $b,
                    'character' => $char,
                ];
            }

            // Se ainda está no turno do jogador, mas os 15s expiraram, passa automaticamente para o mob
            if ($b->current_turn === 'player') {
                if ($b->turn_expires_at && $b->turn_expires_at->isPast()) {
                    $log = $b->combat_log ?? [];
                    $log[] = [
                        'round' => $b->round,
                        'actor' => 'system',
                        'damage' => 0,
                        'crit' => false,
                        'text' => "⌛ Tempo de 15s esgotado! O turno passou para {$b->monster->name}.",
                    ];
                    $b->combat_log = $log;
                    $b->current_turn = 'monster';
                } else {
                    /** @var Character $char */
                    $char = Character::with(['server', 'realm', 'cultivationRank'])->findOrFail($character->id);
                    return [
                        'battle' => $b,
                        'character' => $char,
                    ];
                }
            }

            /** @var Character $char */
            $char = Character::with(['server', 'realm', 'cultivationRank'])
                ->where('id', $character->id)
                ->lockForUpdate()
                ->firstOrFail();

            $bestiary = CharacterMonsterStat::firstOrCreate(
                ['character_id' => $char->id, 'monster_id' => $b->monster_id],
                ['kills_count' => 0, 'defeats_count' => 0]
            );

            $effStats = $char->effective_stats;
            $rankMult = $char->cultivationRank->stat_multiplier ?? 1.0;

            $effects = $b->active_effects ?? ['player_buff_turns' => 0, 'monster_debuff_turns' => 0];
            $log = $b->combat_log ?? [];

            $buffActive = ($effects['player_buff_turns'] ?? 0) > 0;
            $debuffActive = ($effects['monster_debuff_turns'] ?? 0) > 0;

            $playerDefense = ($effStats['constitution'] * 1.4 + $effStats['agility'] * 0.5) * $rankMult * ($buffActive ? 1.25 : 1.0);
            $monsterAttack = $b->monster->attack * ($debuffActive ? 0.80 : 1.0);

            $bossFury = $b->monster->is_boss && random_int(1, 100) <= 22;
            $variance = random_int(90, 110) / 100;
            $rawDamage = max(2, ($monsterAttack - ($playerDefense * 0.6)) * $variance);
            $damage = (int) round($bossFury ? $rawDamage * 1.4 : $rawDamage);

            $b->player_hp = max(0, $b->player_hp - $damage);
            $log[] = [
                'round' => $b->round,
                'actor' => 'monster',
                'damage' => $damage,
                'crit' => $bossFury,
                'text' => $bossFury
                    ? "💥 Rodada {$b->round}: Fúria de Chefe! {$b->monster->name} desferiu {$damage} de dano!"
                    : "🩸 Rodada {$b->round}: {$b->monster->name} atacou você causando {$damage} de dano.",
            ];

            $b->combat_log = $log;

            // Verifica derrota do jogador
            if ($b->player_hp <= 0) {
                return $this->finalizeBattle($char, $b, $bestiary, false);
            }

            // Decrementa duração dos efeitos ativos e inicia novo turno do jogador (15s + 3 ações liberadas)
            if (($effects['player_buff_turns'] ?? 0) > 0) {
                $effects['player_buff_turns'] -= 1;
            }
            if (($effects['monster_debuff_turns'] ?? 0) > 0) {
                $effects['monster_debuff_turns'] -= 1;
            }

            $b->round += 1;
            $b->current_turn = 'player';
            $b->turn_actions_used = [
                'heal' => false,
                'support' => false,
            ];
            $b->active_effects = $effects;
            $b->turn_expires_at = now()->addSeconds(self::PLAYER_TURN_SECONDS);
            $b->save();

            $char->load(['server', 'realm', 'cultivationRank']);

            return [
                'battle' => $b->fresh('monster.drops.item'),
                'character' => $char,
            ];
        });
    }

    /**
     * Finaliza a batalha, aplica recompensas/drops/bestiário e grava no BattleLog
     */
    private function finalizeBattle(
        Character $char,
        ActiveBattle $b,
        CharacterMonsterStat $bestiary,
        bool $victory
    ): array {
        $monster = $b->monster;
        $xpGained = 0;
        $stonesGained = 0;
        $qiGained = 0;
        $levelsGained = 0;
        $droppedItems = [];

        if ($victory) {
            $xpMult = $char->server->xp_multiplier ?? 1.0;
            $dropMult = $char->server->drop_multiplier ?? 1.0;

            $xpGained = (int) round($monster->xp_reward * $xpMult);
            $stonesGained = (int) round($monster->spirit_stones_reward * $dropMult);
            $qiGained = (int) round(($monster->cultivation_qi_reward ?? 0) * $xpMult);

            $char->hp = max(1, $b->player_hp);
            $char->spirit_stones += $stonesGained;

            $progress = $char->grantExperience($xpGained);
            $levelsGained = $progress['levels_gained'];

            if ($qiGained > 0) {
                $char->grantCultivationXp($qiGained);
            }

            $bestiary->kills_count += 1;
            if ($monster->is_boss && $monster->boss_cooldown_seconds > 0) {
                $bestiary->boss_cooldown_until = now()->addSeconds($monster->boss_cooldown_seconds);
            }

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
                    $droppedItems[] = [
                        'item_id' => $drop->item->id,
                        'name' => $drop->item->name,
                        'rarity' => $drop->item->rarity,
                        'quantity' => $qty,
                    ];
                }
            }
        } else {
            $char->hp = max(1, (int) round($b->player_max_hp * 0.1));
            $bestiary->defeats_count += 1;
        }

        $bestiary->save();
        $char->last_active_at = now();
        $char->save();

        $outcome = $victory ? 'victory' : 'defeat';
        $rewardsSummary = [
            'outcome' => $outcome,
            'xp_gained' => $xpGained,
            'spirit_stones_gained' => $stonesGained,
            'qi_gained' => $qiGained,
            'levels_gained' => $levelsGained,
            'items_dropped' => $droppedItems,
        ];

        $b->status = $outcome;
        $b->rewards_summary = $rewardsSummary;
        $b->turn_expires_at = null;
        $b->save();

        BattleLog::create([
            'character_id' => $char->id,
            'monster_id' => $monster->id,
            'outcome' => $outcome,
            'rounds' => $b->round,
            'xp_gained' => $xpGained,
            'spirit_stones_gained' => $stonesGained,
            'combat_log' => $b->combat_log ?? [],
        ]);

        $char->load(['server', 'realm', 'cultivationRank']);

        return [
            'battle' => $b->fresh('monster.drops.item'),
            'character' => $char,
        ];
    }
}
