<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CharacterController;
use App\Http\Controllers\Api\GameplayController;
use App\Http\Controllers\Api\InventoryController;
use App\Http\Controllers\Api\WorldController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/world/bootstrap', [WorldController::class, 'bootstrap']);
    Route::post('/characters', [CharacterController::class, 'store']);
    Route::get('/characters/{character}', [CharacterController::class, 'show']);

    Route::prefix('gameplay')->group(function () {
        Route::get('/monsters', [GameplayController::class, 'monsters']);
        Route::get('/history', [GameplayController::class, 'battleHistory']);
        Route::post('/meditate', [GameplayController::class, 'meditate']);
        Route::post('/allocate-stat', [GameplayController::class, 'allocateStat']);
        Route::post('/hunt', [GameplayController::class, 'hunt']);

        // Combate Tático por Turnos
        Route::get('/battle/active', [GameplayController::class, 'activeBattle']);
        Route::post('/battle/start', [GameplayController::class, 'startTacticalBattle']);
        Route::post('/battle/action', [GameplayController::class, 'tacticalAction']);
        Route::post('/battle/monster-turn', [GameplayController::class, 'tacticalMonsterTurn']);
    });

    Route::prefix('inventory')->group(function () {
        Route::get('/shop', [InventoryController::class, 'shop']);
        Route::get('/', [InventoryController::class, 'index']);
        Route::post('/buy', [InventoryController::class, 'buy']);
        Route::post('/equip', [InventoryController::class, 'equip']);
        Route::post('/use', [InventoryController::class, 'useItem']);
        Route::post('/sell', [InventoryController::class, 'sell']);
    });
});
