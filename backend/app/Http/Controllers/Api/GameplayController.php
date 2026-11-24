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

    /**
     * Lista monstros disponíveis com tabela de drops (transparência de farming)
     */
    public function monsters(): JsonResponse
    {
        $monsters = Monster::with(['drops.item:id,name,rarity,type'])
            ->orderBy('recommended_level')
            ->get();

        return response()->json([
            'monsters' => $monsters,
        ]);
    }

    /**
     * Histórico das últimas 10 batalhas do personagem
     */
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
     * Treino de Meditação Espiritual
     */
    public function meditate(Request $request): JsonResponse
    {
        $character = $this->resolveCharacter($request);
        $energyCost = 10;

        return DB::transaction(function () use ($character, $energyCost) {
            /** @var Character $char */
            $char = Character::with(['server', 'realm', 'cultivationRank'])
                ->where('id', $character->id)
                ->lockForUpdate()
                ->firstOrFail();

            $char->syncLazyResources();

            if ($char->energy < $energyCost) {
                throw ValidationException::withMessages([
                    'energy' => ["Você precisa de {$energyCost} de energia para meditar (atual: {$char->energy})."],
                ]);
            }

            $char->energy -= $energyCost;

            $effectiveMaxHp = $char->effective_stats['max_hp'];
            $healedHp = (int) round($effectiveMaxHp * 0.35);
            $char->hp = min($effectiveMaxHp, $char->hp + $healedHp);

            $xpMult = $char->server->xp_multiplier ?? 1.0;
            $baseXp = 35 + ($char->level * 12);
            $xpGained = (int) round($baseXp * $xpMult);
            $stonesGained = 15 + ($char->level * 4);

            $char->spirit_stones += $stonesGained;
            $progression = $char->grantExperience($xpGained);
            $char->last_active_at = now();
            $char->save();

            $char->load(['server', 'realm', 'cultivationRank']);

            return response()->json([
                'message' => "Meditação concluída! +{$xpGained} XP, +{$stonesGained} Pedras Espirituais e HP restaurado.",
                'xp_gained' => $xpGained,
                'spirit_stones_gained' => $stonesGained,
                'levels_gained' => $progression['levels_gained'],
                'rank_up_title' => $progression['rank_up_title'],
                'character' => $char,
            ]);
        });
    }

    /**
     * Distribui pontos de atributo (+1 ou +5)
     */
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
     * Inicia caça PvE
     */
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
