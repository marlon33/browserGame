<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\CombatEngineService;
use App\Services\GameplayService;
use App\Services\TacticalCombatService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** HTTP adapter; gameplay rules and persistence are handled by services. */
class GameplayController extends Controller
{
    public function monsters(Request $request, GameplayService $service): JsonResponse { return $service->monsters($request); }
    public function battleHistory(Request $request, GameplayService $service): JsonResponse { return $service->battleHistory($request); }
    public function meditate(Request $request, GameplayService $service): JsonResponse { return $service->meditate($request); }
    public function allocateStat(Request $request, GameplayService $service): JsonResponse { return $service->allocateStat($request); }
    public function hunt(Request $request, CombatEngineService $combatEngine, GameplayService $service): JsonResponse { return $service->hunt($request, $combatEngine); }
    public function activeBattle(Request $request, GameplayService $service): JsonResponse { return $service->activeBattle($request); }
    public function startTacticalBattle(Request $request, TacticalCombatService $tacticalService, GameplayService $service): JsonResponse { return $service->startTacticalBattle($request, $tacticalService); }
    public function tacticalAction(Request $request, TacticalCombatService $tacticalService, GameplayService $service): JsonResponse { return $service->tacticalAction($request, $tacticalService); }
    public function tacticalMonsterTurn(Request $request, TacticalCombatService $tacticalService, GameplayService $service): JsonResponse { return $service->tacticalMonsterTurn($request, $tacticalService); }
}
