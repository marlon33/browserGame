<?php

namespace Tests\Feature\Api;

use App\Models\Character;
use App\Models\CultivationRank;
use App\Models\GameServer;
use App\Models\Realm;
use App\Models\User;
use Database\Seeders\WorldSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class WorldAndCharacterTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(WorldSeeder::class);
    }

    public function test_authenticated_user_can_fetch_world_bootstrap(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->getJson('/api/world/bootstrap');

        $response->assertOk()
            ->assertJsonCount(2, 'servers')
            ->assertJsonCount(2, 'realms')
            ->assertJsonPath('initial_rank.tier_order', 1);
    }

    public function test_character_creation_applies_server_authoritative_realm_bonuses(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $server = GameServer::where('code', 'S1')->firstOrFail();
        $solarRealm = Realm::where('slug', 'solar_empire')->firstOrFail();

        // Tentativa de enviar atributos adulterados no payload (devem ser ignorados)
        $response = $this->postJson('/api/characters', [
            'game_server_id' => $server->id,
            'realm_id' => $solarRealm->id,
            'name' => 'LongYuyin',
            'strength' => 99999,
            'spirit_stones' => 9999999,
        ]);

        $response->assertCreated()
            ->assertJsonPath('character.name', 'LongYuyin')
            ->assertJsonPath('character.level', 1)
            // Império Solar tem +5% força (10 -> 11) e +5% HP (120 -> 126)
            ->assertJsonPath('character.strength', 11)
            ->assertJsonPath('character.max_hp', 126)
            ->assertJsonPath('character.spirit_stones', 150);
    }

    public function test_user_cannot_create_two_characters_on_the_same_server(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $server = GameServer::firstOrFail();
        $realm = Realm::firstOrFail();

        $this->postJson('/api/characters', [
            'game_server_id' => $server->id,
            'realm_id' => $realm->id,
            'name' => 'Cultivador1',
        ])->assertCreated();

        $this->postJson('/api/characters', [
            'game_server_id' => $server->id,
            'realm_id' => $realm->id,
            'name' => 'Cultivador2',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['game_server_id']);
    }

    public function test_user_cannot_access_another_users_character(): void
    {
        $owner = User::factory()->create();
        $intruder = User::factory()->create();

        $server = GameServer::firstOrFail();
        $realm = Realm::firstOrFail();
        $rank = CultivationRank::firstOrFail();

        $character = Character::create([
            'user_id' => $owner->id,
            'game_server_id' => $server->id,
            'realm_id' => $realm->id,
            'cultivation_rank_id' => $rank->id,
            'name' => 'DonoReal',
        ]);

        Sanctum::actingAs($intruder);

        $this->withHeader('X-Character-Id', (string) $character->id)
            ->getJson('/api/characters/active')
            ->assertNotFound();
    }

    public function test_lazy_energy_regeneration_calculates_elapsed_minutes_accurately(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $server = GameServer::firstOrFail();
        $realm = Realm::firstOrFail();
        $rank = CultivationRank::firstOrFail();

        // Personagem com 50/100 de energia sincronizado há 10 minutos (+3 de energia = 53)
        $character = Character::create([
            'user_id' => $user->id,
            'game_server_id' => $server->id,
            'realm_id' => $realm->id,
            'cultivation_rank_id' => $rank->id,
            'name' => 'Meditador',
            'energy' => 50,
            'max_energy' => 100,
            'last_energy_sync_at' => now()->subMinutes(10),
        ]);

        $response = $this->withHeader('X-Character-Id', (string) $character->id)
            ->getJson('/api/characters/active');

        $response->assertOk()
            ->assertJsonPath('character.energy', 53);
    }
}
