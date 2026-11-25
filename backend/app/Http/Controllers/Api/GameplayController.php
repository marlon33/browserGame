<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActiveBattle;
use App\Models\BattleLog;
use App\Models\Character;
use App\Models\CharacterMonsterStat;
use App\Models\Monster;
use App\Services\CombatEngineService;
use App\Services\TacticalCombatService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class GameplayController extends Controller
{
    private function resolveCharacter(Request $request): Character
    {
        $characterId = $request->header('X-Character-Id');

        if (! $characterId) {
            abort(400, 'Header X-Character-Id ausente.');
        }

        $character = Character::with(['server', 'realm', 'cultivationRank'])
            ->where('id', $characterId)
            ->where('user_id', $request->user()->id)
            ->first();

        if (! $character) {
            abort(404, 'Personagem não encontrado ou não pertence à sua conta.');
        }

        return $character;
    }

    public function monsters(Request $request): JsonResponse
    {
        $character = $this->resolveCharacter($request);

        $monsters = Monster::with(['drops.item:id,name,rarity,type'])
            ->orderBy('region_order')
            ->orderBy('recommended_level')
            ->orderBy('is_boss')
            ->get();

        $statsMap = CharacterMonsterStat::where('character_id', $character->id)
            ->get()
            ->keyBy('monster_id');

        $enriched = $monsters->map(function (Monster $m) use ($statsMap) {
            $stat = $statsMap->get($m->id);
            $kills = $stat?->kills_count ?? 0;
            $mastery = $stat
                ? $stat->masteryTier()
                : ['tier' => 0, 'label' => 'Novato', 'damage_bonus_pct' => 0, 'drop_bonus_pct' => 0, 'next_target' => 10];

            $cooldownRemaining = 0;
            if ($stat && $stat->boss_cooldown_until && $stat->boss_cooldown_until->isFuture()) {
                $cooldownRemaining = (int) now()->diffInSeconds($stat->boss_cooldown_until);
            }

            $arr = $m->toArray();
            $arr['bestiary'] = [
                'kills_count' => $kills,
                'mastery' => $mastery,
                'can_sweep' => ! $m->is_boss && $kills >= 3,
                'boss_cooldown_until' => $stat?->boss_cooldown_until?->toIso8601String(),
                'boss_cooldown_remaining' => $cooldownRemaining,
            ];

            return $arr;
        });

        return response()->json([
            'monsters' => $enriched,
        ]);
    }

    public function battleHistory(Request $request): JsonResponse
    {
        $character = $this->resolveCharacter($request);

        $logs = BattleLog::with('monster:id,slug,name,zone_name,recommended_level,is_boss')
            ->where('character_id', $character->id)
            ->orderByDesc('id')
            ->limit(10)
            ->get();

        return response()->json([
            'history' => $logs,
        ]);
    }

    public function meditate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'stones' => ['nullable', 'integer', 'min:1', 'max:25'],
        ]);

        $stonesToSpend = $validated['stones'] ?? 1;
        $character = $this->resolveCharacter($request);

        return DB::transaction(function () use ($character, $stonesToSpend) {
            /** @var Character $char */
            $char = Character::with(['server', 'realm', 'cultivationRank'])
                ->where('id', $character->id)
                ->lockForUpdate()
                ->firstOrFail();

            $char->syncLazyResources();

            if ($char->meditation_cooldown_until && $char->meditation_cooldown_until->isFuture()) {
                $secs = (int) now()->diffInSeconds($char->meditation_cooldown_until);
                throw ValidationException::withMessages([
                    'cooldown' => ["Seus meridianos estão estabilizando. Aguarde {$secs}s para meditar novamente."],
                ]);
            }

            if ($char->meditation_fatigue >= 85) {
                throw ValidationException::withMessages([
                    'fatigue' => ["Fadiga espiritual crítica ({$char->meditation_fatigue}%). Aguarde sua mente descansar antes de refinar mais Qi."],
                ]);
            }

            $energyCost = 4 + ($stonesToSpend * 2) + (int) floor($char->level * 0.5);
            $cooldownSeconds = ($stonesToSpend * 5) + ($char->level * 2);

            if ($char->spirit_stones < $stonesToSpend) {
                throw ValidationException::withMessages([
                    'spirit_stones' => ["Pedras Espirituais insuficientes (necessário: {$stonesToSpend}, atual: {$char->spirit_stones})."],
                ]);
            }

            if ($char->energy < $energyCost) {
                throw ValidationException::withMessages([
                    'energy' => ["Energia insuficiente para refinar {$stonesToSpend} pedra(s) no Nv.{$char->level} (necessário: {$energyCost}, atual: {$char->energy})."],
                ]);
            }

            $efficiencyPct = max(20, 100 - (int) $char->meditation_fatigue);
            $xpMult = $char->server->xp_multiplier ?? 1.0;

            $rawQi = $stonesToSpend * (32 + ($char->level * 4));
            $qiGained = max(5, (int) round($rawQi * ($efficiencyPct / 100) * $xpMult));

            $char->spirit_stones -= $stonesToSpend;
            $char->energy -= $energyCost;
            $char->meditation_cooldown_until = now()->addSeconds($cooldownSeconds);

            $fatigueGain = 12 + ($stonesToSpend * 2);
            $char->meditation_fatigue = min(100, (int) $char->meditation_fatigue + $fatigueGain);
            if ($char->last_fatigue_sync_at === null) {
                $char->last_fatigue_sync_at = now();
            }

            $effectiveMaxHp = $char->effective_stats['max_hp'];
            $healPct = min(0.50, 0.20 + ($stonesToSpend * 0.03));
            $healedHp = (int) round($effectiveMaxHp * $healPct);
            $char->hp = min($effectiveMaxHp, $char->hp + $healedHp);

            $rankUpTitle = $char->grantCultivationXp($qiGained);
            $char->last_active_at = now();
            $char->save();

            $char->load(['server', 'realm', 'cultivationRank']);

            return response()->json([
                'message' => "Refino concluído ({$efficiencyPct}% eficiência): +{$qiGained} Qi de Cultivo e +{$healedHp} HP!",
                'qi_gained' => $qiGained,
                'stones_spent' => $stonesToSpend,
                'energy_spent' => $energyCost,
                'cooldown_seconds' => $cooldownSeconds,
                'efficiency_pct' => $efficiencyPct,
                'rank_up_title' => $rankUpTitle,
                'character' => $char,
            ]);
        });
    }

    public function allocateStat(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'stat' => ['required', 'string', Rule::in(['strength', 'agility', 'constitution', 'spirit_power'])],
            'amount' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $amount = $validated['amount'] ?? 1;
        $stat = $validated['stat'];
        $character = $this->resolveCharacter($request);

        return DB::transaction(function () use ($character, $stat, $amount) {
            /** @var Character $char */
            $char = Character::with(['server', 'realm', 'cultivationRank'])
                ->where('id', $character->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ($char->stat_points < $amount) {
                throw ValidationException::withMessages([
                    'stat_points' => ["Pontos livres insuficientes ({$char->stat_points} disponíveis)."],
                ]);
            }

            $char->stat_points -= $amount;
            $char->{$stat} += $amount;

            if ($stat === 'constitution') {
                $hpBonus = $amount * 12;
                $char->max_hp += $hpBonus;
                $char->hp += $hpBonus;
            }

            $char->save();

            return response()->json([
                'message' => 'Atributo aprimorado com sucesso!',
                'character' => $char,
            ]);
        });
    }

    /**
     * Varredura rápida (x3) para monstros já dominados
     */
    public function hunt(Request $request, CombatEngineService $combatEngine): JsonResponse
    {
        $validated = $request->validate([
            'monster_id' => ['required', 'integer', 'exists:monsters,id'],
            'times' => ['nullable', 'integer', 'min:1', 'max:3'],
        ]);

        $character = $this->resolveCharacter($request);
        $monster = Monster::findOrFail($validated['monster_id']);
        $times = $validated['times'] ?? 1;

        $result = $combatEngine->fightMonster($character, $monster, $times);

        return response()->json($result);
    }

    /**
     * Retorna a batalha tática ativa (caso o jogador recarregue a página no meio do combate)
     */
    public function activeBattle(Request $request): JsonResponse
    {
        $character = $this->resolveCharacter($request);

        $battle = ActiveBattle::with('monster.drops.item')
            ->where('character_id', $character->id)
            ->where('status', 'active')
            ->first();

        return response()->json([
            'battle' => $battle,
        ]);
    }

    /**
     * Inicia uma batalha tática por turnos contra o monstro selecionado
     */
    public function startTacticalBattle(Request $request, TacticalCombatService $tacticalService): JsonResponse
    {
        $validated = $request->validate([
            'monster_id' => ['required', 'integer', 'exists:monsters,id'],
        ]);

        $character = $this->resolveCharacter($request);
        $monster = Monster::findOrFail($validated['monster_id']);

        $battle = $tacticalService->startBattle($character, $monster);
        $character->refresh()->load(['server', 'realm', 'cultivationRank']);

        return response()->json([
            'battle' => $battle,
            'character' => $character,
        ]);
    }

    /**
     * Executa ação do jogador no turno (heal, buff, debuff, physical, magic, pass)
     */
    public function tacticalAction(Request $request, TacticalCombatService $tacticalService): JsonResponse
    {
        $validated = $request->validate([
            'battle_id' => ['required', 'integer', 'exists:active_battles,id'],
            'action' => ['required', 'string', Rule::in(['heal', 'buff', 'debuff', 'physical', 'magic', 'pass'])],
        ]);

        $character = $this->resolveCharacter($request);
        $battle = ActiveBattle::where('id', $validated['battle_id'])
            ->where('character_id', $character->id)
            ->firstOrFail();

        $result = $tacticalService->performPlayerAction($character, $battle, $validated['action']);

        return response()->json($result);
    }

    /**
     * Executa o turno do monstro (após os 3s) e devolve a vez ao jogador
     */
    public function tacticalMonsterTurn(Request $request, TacticalCombatService $tacticalService): JsonResponse
    {
        $validated = $request->validate([
            'battle_id' => ['required', 'integer', 'exists:active_battles,id'],
        ]);

        $character = $this->resolveCharacter($request);
        $battle = ActiveBattle::where('id', $validated['battle_id'])
            ->where('character_id', $character->id)
            ->firstOrFail();

        $result = $tacticalService->executeMonsterTurn($character, $battle);

        return response()->json($result);
    }
}
