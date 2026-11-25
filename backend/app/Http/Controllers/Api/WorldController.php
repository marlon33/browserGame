<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\WorldService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** HTTP adapter for world bootstrap data. */
class WorldController extends Controller
{
    public function bootstrap(Request $request, WorldService $service): JsonResponse { return $service->bootstrap($request); }
}
