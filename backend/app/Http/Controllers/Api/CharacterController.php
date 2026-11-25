<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\CharacterService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** HTTP adapter for character operations. */
class CharacterController extends Controller
{
    public function store(Request $request, CharacterService $service): JsonResponse { return $service->store($request); }
    public function active(Request $request, CharacterService $service): JsonResponse { return $service->active($request); }
    public function show(Request $request, string $character, CharacterService $service): JsonResponse { return $service->show($request, $character); }
}
