<?php

namespace Tests\Feature\Api;

use App\Models\Character;
use App\Models\CultivationRank;
use App\Models\GameServer;
use App\Models\Item;
use App\Models\Realm;
use App\Models\User;
use Database\Seeders\ItemAndDropSeeder;
use Database\Seeders\MonsterSeeder;
use Database\Seeders\WorldSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class InventoryAndShopTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(WorldSeeder::class);
        $this->seed(MonsterSeeder::class);
        $this->seed(ItemAndDropSeeder::class);
    }

    private function createCharacterForUser(User $user, int $stones = 500): Character
    {
        return Character::create([
            'user_id' => $user->id,
            'game_server_id' => GameServer::firstOrFail()->id,
            'realm_id' => Realm::firstOrFail()->id,
            'cultivation_rank_id' => CultivationRank::firstOrFail()->id,
            'name' => 'Merchant_' . $user->id,
            'hp' => 50,
            'max_hp' => 120,
            'energy' => 40,
            'max_energy' => 100,
            'spirit_stones' => $stones,
        ]);
    }

    public function test_player_can_buy_and_equip_weapon_increasing_effective_stats(): void
    {
        $user = User::factory()->create();
        $character = $this->createCharacterForUser($user, 500);
        $sword = Item::where('slug', 'bronze_spirit_sword')->firstOrFail();

        Sanctum::actingAs($user);

        // Compra a espada (custo 120)
        $buyResponse = $this->withHeader('X-Character-Id', (string) $character->id)
            ->postJson('/api/inventory/buy', ['item_id' => $sword->id]);

        $buyResponse->assertOk()
            ->assertJsonPath('character.spirit_stones', 380);

        $charItemId = $character->items()->firstOrFail()->id;

        // Equipa a espada (+4 força)
        $equipResponse = $this->withHeader('X-Character-Id', (string) $character->id)
            ->postJson("/api/inventory/{$charItemId}/equip");

        $equipResponse->assertOk()
            ->assertJsonPath('character.effective_stats.strength', 14);
    }

    public function test_player_can_consume_healing_pill(): void
    {
        $user = User::factory()->create();
        $character = $this->createCharacterForUser($user, 200);
        $pill = Item::where('slug', 'minor_healing_pill')->firstOrFail();
        $charItem = $character->addItemToInventory($pill, 1);

        Sanctum::actingAs($user);

        $response = $this->withHeader('X-Character-Id', (string) $character->id)
            ->postJson("/api/inventory/{$charItem->id}/use");

        $response->assertOk()
            ->assertJsonPath('character.hp', 115);

        $this->assertDatabaseMissing('character_items', ['id' => $charItem->id]);
    }
}
