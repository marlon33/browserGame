<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\InventoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** HTTP adapter for inventory operations. */
class InventoryController extends Controller
{
    public function index(Request $request, InventoryService $service): JsonResponse { return $service->index($request); }
    public function buy(Request $request, InventoryService $service): JsonResponse { return $service->buy($request); }
    public function toggleEquip(Request $request, int $characterItemId, InventoryService $service): JsonResponse { return $service->toggleEquip($request, $characterItemId); }
    public function useItem(Request $request, int $characterItemId, InventoryService $service): JsonResponse { return $service->useItem($request, $characterItemId); }
    public function sell(Request $request, int $characterItemId, InventoryService $service): JsonResponse { return $service->sell($request, $characterItemId); }
}
