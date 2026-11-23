<?php

namespace Tests\Feature\Api;

use App\Models\Character;
use App\Models\CultivationRank;
use App\Models\GameServer;
use App\Models\Monster;
use App\Models\Realm;
use App\Models\User;
use Database\Seeders\MonsterSeeder;
use Database\Seeders\WorldSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class GameplayFlowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(WorldSeeder::class);
        $this->seed(MonsterSeeder::class);
    }

    private function createCharacterForUser(User $user): Character
    {
        return Character::create([
            'user_id' => $user->id,
            'game_server_id' => GameServer::firstOrFail()->id,
            'realm_id' => Realm::firstOrFail()->id,
            'cultivation_rank_id' => CultivationRank::firstOrFail()->id,
            'name' => 'Tester_' . $user->id,
            'hp' => 100,
            'max_hp' => 150,
            'energy' => 50,
            'max_energy' => 100,
            'stat_points' => 2,
        ]);
    }

    public function test_character_can_meditate_gain_xp_and_heal_hp(): void
    {
        $user = User::factory()->create();
        $character = $this->createCharacterForUser($user);
        Sanctum::actingAs($user);

        $response = $this->withHeader('X-Character-Id', (string) $character->id)
            ->postJson('/api/gameplay/meditate');

        $response->assertOk()
            ->assertJsonPath('character.energy', 40)
            ->assertJsonPath('character.hp', 150);

        $this->assertGreaterThan(0, $response->json('xp_gained'));
    }

    public function test_character_can_allocate_stat_points_and_constitution_increases_max_hp(): void
    {
        $user = User::factory()->create();
        $character = $this->createCharacterForUser($user);
        Sanctum::actingAs($user);

        $response = $this->withHeader('X-Character-Id', (string) $character->id)
            ->postJson('/api/gameplay/allocate-stat', [
                'stat' => 'constitution',
                'amount' => 2,
            ]);

        $response->assertOk()
            ->assertJsonPath('character.stat_points', 0)
            ->assertJsonPath('character.constitution', 12)
            ->assertJsonPath('character.max_hp', 174);
    }

    public function test_character_can_hunt_monster_and_record_battle_log(): void
    {
        $user = User::factory()->create();
        $character = $this->createCharacterForUser($user);
        $monster = Monster::where('slug', 'horned_sheep')->firstOrFail();

        Sanctum::actingAs($user);

        $response = $this->withHeader('X-Character-Id', (string) $character->id)
            ->postJson('/api/gameplay/hunt', [
                'monster_id' => $monster->id,
            ]);

        $response->assertOk()
            ->assertJsonStructure([
                'outcome',
                'rounds',
                'xp_gained',
                'spirit_stones_gained',
                'combat_log',
                'battle_id',
                'character',
            ]);

        $this->assertDatabaseHas('battle_logs', [
            'character_id' => $character->id,
            'monster_id' => $monster->id,
        ]);
    }
}
