<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** HTTP adapter: authentication rules and persistence live in AuthService. */
class AuthController extends Controller
{
    public function register(Request $request, AuthService $service): JsonResponse { return $service->register($request); }
    public function login(Request $request, AuthService $service): JsonResponse { return $service->login($request); }
    public function me(Request $request, AuthService $service): JsonResponse { return $service->me($request); }
    public function logout(Request $request, AuthService $service): JsonResponse { return $service->logout($request); }
    public function updatePassword(Request $request, AuthService $service): JsonResponse { return $service->updatePassword($request); }
    public function forgotPassword(Request $request, AuthService $service): JsonResponse { return $service->forgotPassword($request); }
    public function resetPassword(Request $request, AuthService $service): JsonResponse { return $service->resetPassword($request); }
}
