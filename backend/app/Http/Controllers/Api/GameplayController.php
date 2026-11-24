<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BattleLog;
use App\Models\Character;
use App\Models\Monster;
use App\Services\CombatEngineService;
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

    public function monsters(): JsonResponse
    {
        $monsters = Monster::with(['drops.item:id,name,rarity,type'])
            ->orderBy('recommended_level')
            ->get();

        return response()->json([
            'monsters' => $monsters,
        ]);
    }

    public function battleHistory(Request $request): JsonResponse
    {
        $character = $this->resolveCharacter($request);

        $logs = BattleLog::with('monster:id,name,zone_name,recommended_level')
            ->where('character_id', $character->id)
            ->orderByDesc('id')
            ->limit(10)
            ->get();

        return response()->json([
            'history' => $logs,
        ]);
    }

    /**
     * Meditação de Refino Espiritual:
     * - Consome Pedras Espirituais (stones_spent: 1..25)
     * - Consome Energia escalável: 4 + (pedras * 2) + floor(nível * 0.5)
     * - Aplica Cooldown escalável: (pedras * 5s) + (nível * 2s)
     * - Acumula Fadiga de Meditação (+12% + pedras * 2%), reduzindo eficiência
     * - Concede exclusivamente Qi de Cultivo (cultivation_xp) para Patente + cura HP
     */
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

            // 1. Verifica Cooldown
            if ($char->meditation_cooldown_until && $char->meditation_cooldown_until->isFuture()) {
                $secs = (int) now()->diffInSeconds($char->meditation_cooldown_until);
                throw ValidationException::withMessages([
                    'cooldown' => ["Seus meridianos estão estabilizando. Aguarde {$secs}s para meditar novamente."],
                ]);
            }

            // 2. Verifica Saturação por Fadiga
            if ($char->meditation_fatigue >= 85) {
                throw ValidationException::withMessages([
                    'fatigue' => ["Fadiga espiritual crítica ({$char->meditation_fatigue}%). Aguarde sua mente descansar antes de refinar mais Qi."],
                ]);
            }

            // 3. Calcula custos escaláveis por pedras + nível
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

            // 4. Calcula eficiência com base na fadiga atual
            $efficiencyPct = max(20, 100 - (int) $char->meditation_fatigue);
            $xpMult = $char->server->xp_multiplier ?? 1.0;

            $rawQi = $stonesToSpend * (32 + ($char->level * 4));
            $qiGained = max(5, (int) round($rawQi * ($efficiencyPct / 100) * $xpMult));

            // 5. Deduz recursos e aplica cooldown + fadiga
            $char->spirit_stones -= $stonesToSpend;
            $char->energy -= $energyCost;
            $char->meditation_cooldown_until = now()->addSeconds($cooldownSeconds);

            $fatigueGain = 12 + ($stonesToSpend * 2);
            $char->meditation_fatigue = min(100, (int) $char->meditation_fatigue + $fatigueGain);
            if ($char->last_fatigue_sync_at === null) {
                $char->last_fatigue_sync_at = now();
            }

            // Cura proporcional ao lote refinado (20% + 3% por pedra, máx 50%)
            $effectiveMaxHp = $char->effective_stats['max_hp'];
            $healPct = min(0.50, 0.20 + ($stonesToSpend * 0.03));
            $healedHp = (int) round($effectiveMaxHp * $healPct);
            $char->hp = min($effectiveMaxHp, $char->hp + $healedHp);

            // Concede Qi de Cultivo (Patente) - NÃO mexe no level!
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

    public function hunt(Request $request, CombatEngineService $combatEngine): JsonResponse
    {
        $validated = $request->validate([
            'monster_id' => ['required', 'integer', 'exists:monsters,id'],
        ]);

        $character = $this->resolveCharacter($request);
        $monster = Monster::findOrFail($validated['monster_id']);

        $result = $combatEngine->fightMonster($character, $monster);

        return response()->json($result);
    }
}
