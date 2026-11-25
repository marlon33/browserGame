<?php

namespace App\Services;

use App\Models\Character;
use App\Models\CultivationRank;
use App\Models\GameServer;
use App\Models\Realm;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class CharacterService
{
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'game_server_id' => ['required', 'integer', 'exists:game_servers,id'],
            'realm_id' => ['required', 'integer', 'exists:realms,id'],
            'name' => [
                'required',
                'string',
                'min:3',
                'max:20',
                'regex:/^[a-zA-Z0-9_]+$/',
                Rule::unique('characters', 'name')->where(
                    fn ($q) => $q->where('game_server_id', $request->input('game_server_id'))
                ),
            ],
        ], [
            'name.regex' => 'O nome do personagem deve conter apenas letras, números e underline (_).',
            'name.unique' => 'Este nome já está em uso neste servidor.',
        ]);

        $server = GameServer::withCount('characters')->findOrFail($validated['game_server_id']);

        if ($server->status !== 'online') {
            throw ValidationException::withMessages([
                'game_server_id' => ['Este servidor não está aceitando novos personagens no momento.'],
            ]);
        }

        if ($server->characters_count >= $server->max_players) {
            throw ValidationException::withMessages([
                'game_server_id' => ['Este servidor atingiu a capacidade máxima de jogadores.'],
            ]);
        }

        $alreadyExists = Character::where('user_id', $user->id)
            ->where('game_server_id', $server->id)
            ->exists();

        if ($alreadyExists) {
            throw ValidationException::withMessages([
                'game_server_id' => ['Você já possui um personagem ativo neste servidor.'],
            ]);
        }

        $realm = Realm::findOrFail($validated['realm_id']);
        $initialRank = CultivationRank::orderBy('tier_order')->firstOrFail();

        $baseStr = 10;
        $baseAgi = 10;
        $baseCon = 10;
        $baseSpi = 10;
        $baseHp = 120;

        $bonuses = $realm->passive_bonuses ?? [];
        if (!empty($bonuses['strength_pct'])) {
            $baseStr = (int) round($baseStr * (1 + $bonuses['strength_pct'] / 100));
        }
        if (!empty($bonuses['agility_pct'])) {
            $baseAgi = (int) round($baseAgi * (1 + $bonuses['agility_pct'] / 100));
        }
        if (!empty($bonuses['spirit_power_pct'])) {
            $baseSpi = (int) round($baseSpi * (1 + $bonuses['spirit_power_pct'] / 100));
        }
        if (!empty($bonuses['max_hp_pct'])) {
            $baseHp = (int) round($baseHp * (1 + $bonuses['max_hp_pct'] / 100));
        }

        $character = Character::create([
            'user_id' => $user->id,
            'game_server_id' => $server->id,
            'realm_id' => $realm->id,
            'cultivation_rank_id' => $initialRank->id,
            'name' => $validated['name'],
            'level' => 1,
            'experience' => 0,
            'hp' => $baseHp,
            'max_hp' => $baseHp,
            'energy' => 100 + $initialRank->bonus_max_energy,
            'max_energy' => 100 + $initialRank->bonus_max_energy,
            'last_energy_sync_at' => now(),
            'spirit_stones' => 150,
            'jade_tokens' => 0,
            'strength' => $baseStr,
            'agility' => $baseAgi,
            'constitution' => $baseCon,
            'spirit_power' => $baseSpi,
            'stat_points' => 0,
            'last_active_at' => now(),
        ]);

        $character->load(['server', 'realm', 'cultivationRank']);

        return response()->json([
            'message' => 'Personagem criado com sucesso!',
            'character' => $character,
        ], 201);
    }

    public function active(Request $request): JsonResponse
    {
        $characterId = $request->header('X-Character-Id') ?? $request->query('character_id');

        if (! $characterId) {
            return response()->json([
                'message' => 'Nenhum personagem selecionado.',
            ], 400);
        }

        $character = Character::with(['server', 'realm', 'cultivationRank'])
            ->where('id', $characterId)
            ->where('user_id', $request->user()->id)
            ->first();

        if (! $character) {
            return response()->json([
                'message' => 'Personagem não encontrado ou não pertence à sua conta.',
            ], 404);
        }

        $character->syncLazyResources();
        $character->last_active_at = now();
        $character->saveQuietly();

        return response()->json([
            'character' => $character,
        ]);
    }

    public function show(Request $request, string $character): JsonResponse
    {
        $characterId = $character === 'active'
            ? $request->header('X-Character-Id')
            : $character;

        if (! $characterId) {
            return response()->json([
                'message' => 'Personagem ativo não informado.',
            ], 400);
        }

        $char = Character::with(['server', 'realm', 'cultivationRank'])
            ->where('id', $characterId)
            ->where('user_id', $request->user()->id)
            ->first();

        if (! $char) {
            return response()->json([
                'message' => 'Personagem não encontrado ou não pertence à sua conta.',
            ], 404);
        }

        $char->syncLazyResources();
        $char->load(['server', 'realm', 'cultivationRank']);

        return response()->json([
            'character' => $char,
        ]);
    }
}
