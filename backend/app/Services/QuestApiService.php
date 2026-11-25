<?php

namespace App\Services;

use App\Models\Character;
use App\Services\QuestProgressService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class QuestApiService
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

    public function index(Request $request, QuestProgressService $questService): JsonResponse
    {
        $character = $this->resolveCharacter($request);
        $quests = $questService->syncAndGetQuests($character);

        return response()->json([
            'quests' => $quests,
        ]);
    }

    public function visitRegion(Request $request, QuestProgressService $questService): JsonResponse
    {
        $validated = $request->validate([
            'region_slug' => ['required', 'string', 'max:60'],
        ]);

        $character = $this->resolveCharacter($request);
        $quests = $questService->recordRegionVisit($character, $validated['region_slug']);

        return response()->json([
            'quests' => $quests,
        ]);
    }

    public function claim(Request $request, int $characterQuestId, QuestProgressService $questService): JsonResponse
    {
        $character = $this->resolveCharacter($request);
        $result = $questService->claimReward($character, $characterQuestId);

        return response()->json($result);
    }
}
