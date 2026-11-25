<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\QuestApiService;
use App\Services\QuestProgressService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** HTTP adapter for quest operations. */
class QuestController extends Controller
{
    public function index(Request $request, QuestApiService $service, QuestProgressService $progress): JsonResponse { return $service->index($request, $progress); }
    public function visitRegion(Request $request, QuestApiService $service, QuestProgressService $progress): JsonResponse { return $service->visitRegion($request, $progress); }
    public function claim(Request $request, int $characterQuestId, QuestApiService $service, QuestProgressService $progress): JsonResponse { return $service->claim($request, $characterQuestId, $progress); }
}
