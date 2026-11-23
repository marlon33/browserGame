<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CharacterController;
use App\Http\Controllers\Api\GameplayController;
use App\Http\Controllers\Api\WorldController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::middleware('throttle:10,1')->group(function () {
        Route::post('/register', [AuthController::class, 'register']);
        Route::post('/login', [AuthController::class, 'login']);
        Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
        Route::post('/reset-password', [AuthController::class, 'resetPassword']);
    });

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::put('/password', [AuthController::class, 'updatePassword']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/world/bootstrap', [WorldController::class, 'bootstrap']);
    Route::post('/characters', [CharacterController::class, 'store']);
    Route::get('/characters/active', [CharacterController::class, 'active']);

    // Loop Principal: Cultivo, Atributos & Caça PvE
    Route::get('/gameplay/monsters', [GameplayController::class, 'monsters']);
    Route::post('/gameplay/meditate', [GameplayController::class, 'meditate']);
    Route::post('/gameplay/allocate-stat', [GameplayController::class, 'allocateStat']);
    Route::post('/gameplay/hunt', [GameplayController::class, 'hunt']);
});
