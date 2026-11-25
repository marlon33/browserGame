<?php

namespace App\Services;

use App\Models\Character;
use App\Models\CultivationRank;
use App\Models\GameServer;
use App\Models\Realm;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WorldService
{
    public function bootstrap(Request $request): JsonResponse
    {
        $user = $request->user();

        $servers = GameServer::withCount('characters')
            ->orderBy('id')
            ->get();

        $realms = Realm::orderBy('id')->get();

        $characters = Character::with(['server', 'realm', 'cultivationRank'])
            ->where('user_id', $user->id)
            ->orderByDesc('last_active_at')
            ->orderByDesc('id')
            ->get();

        $characters->each(fn (Character $char) => $char->syncLazyResources());

        $initialRank = CultivationRank::orderBy('tier_order')->first();

        return response()->json([
            'servers' => $servers,
            'realms' => $realms,
            'characters' => $characters,
            'initial_rank' => $initialRank,
        ]);
    }
}
