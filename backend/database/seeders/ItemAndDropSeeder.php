<?php

namespace Database\Seeders;

use App\Models\Item;
use App\Models\Monster;
use App\Models\MonsterDrop;
use Illuminate\Database\Seeder;

class ItemAndDropSeeder extends Seeder
{
    public function run(): void
    {
        $items = [
            // Consumíveis
            [
                'slug' => 'minor_healing_pill',
                'name' => 'Pílula de Recuperação Vital',
                'description' => 'Refinada com ervas espirituais básicas. Restaura 65 pontos de HP.',
                'type' => 'consumable',
                'rarity' => 'common',
                'required_level' => 1,
                'buy_price' => 30,
                'sell_price' => 10,
                'is_purchasable' => true,
                'heal_hp' => 65,
                'restore_energy' => 0,
            ],
            [
                'slug' => 'qi_condensing_elixir',
                'name' => 'Elixir de Condensação de Qi',
                'description' => 'Restaura imediatamente 20 pontos de Energia Espiritual.',
                'type' => 'consumable',
                'rarity' => 'rare',
                'required_level' => 1,
                'buy_price' => 95,
                'sell_price' => 35,
                'is_purchasable' => true,
                'heal_hp' => 0,
                'restore_energy' => 20,
            ],
            // Armas
            [
                'slug' => 'bronze_spirit_sword',
                'name' => 'Espada Espiritual de Bronze',
                'description' => 'Lâmina forjada com minério espiritual comum. Aumenta Força e Poder Espiritual.',
                'type' => 'weapon',
                'rarity' => 'common',
                'required_level' => 1,
                'buy_price' => 120,
                'sell_price' => 45,
                'is_purchasable' => true,
                'bonus_strength' => 4,
                'bonus_spirit_power' => 2,
            ],
            [
                'slug' => 'shadow_fang_dagger',
                'name' => 'Adaga Presa das Sombras',
                'description' => 'Forjada a partir das presas de um Lobo das Sombras. Concede alta Agilidade e Força.',
                'type' => 'weapon',
                'rarity' => 'rare',
                'required_level' => 2,
                'buy_price' => 320,
                'sell_price' => 120,
                'is_purchasable' => true,
                'bonus_strength' => 6,
                'bonus_agility' => 7,
            ],
            [
                'slug' => 'crimson_flame_blade',
                'name' => 'Lâmina da Píton Escarlate',
                'description' => 'Relíquia banhada em fogo demoníaco. Amplifica drasticamente o ataque.',
                'type' => 'weapon',
                'rarity' => 'epic',
                'required_level' => 5,
                'buy_price' => 950,
                'sell_price' => 380,
                'is_purchasable' => false, // Apenas via Drop!
                'bonus_strength' => 14,
                'bonus_spirit_power' => 10,
                'bonus_agility' => 5,
            ],
            // Armaduras
            [
                'slug' => 'novice_dao_robe',
                'name' => 'Manto de Cultivo do Iniciado',
                'description' => 'Veste leve inscrita com runas protetoras básicas.',
                'type' => 'armor',
                'rarity' => 'common',
                'required_level' => 1,
                'buy_price' => 110,
                'sell_price' => 40,
                'is_purchasable' => true,
                'bonus_constitution' => 3,
                'bonus_max_hp' => 35,
            ],
            [
                'slug' => 'ancient_stone_plate',
                'name' => 'Couraça de Rocha Ancestral',
                'description' => 'Armadura pesada extraída do núcleo de um Guardião de Rocha.',
                'type' => 'armor',
                'rarity' => 'rare',
                'required_level' => 3,
                'buy_price' => 450,
                'sell_price' => 170,
                'is_purchasable' => true,
                'bonus_constitution' => 8,
                'bonus_max_hp' => 90,
            ],
            // Acessórios
            [
                'slug' => 'jade_soul_pendant',
                'name' => 'Pingente de Jade da Alma',
                'description' => 'Amplifica a circulação de energia espiritual no meridiano central.',
                'type' => 'accessory',
                'rarity' => 'rare',
                'required_level' => 2,
                'buy_price' => 280,
                'sell_price' => 100,
                'is_purchasable' => true,
                'bonus_spirit_power' => 7,
                'bonus_max_hp' => 25,
            ],
        ];

        $createdItems = [];
        foreach ($items as $itemData) {
            $createdItems[$itemData['slug']] = Item::updateOrCreate(
                ['slug' => $itemData['slug']],
                $itemData
            );
        }

        // Configurar Tabela de Drops dos Monstros
        $dropMatrix = [
            'horned_sheep' => [
                ['item' => 'minor_healing_pill', 'chance' => 45, 'min' => 1, 'max' => 2],
                ['item' => 'bronze_spirit_sword', 'chance' => 15, 'min' => 1, 'max' => 1],
            ],
            'shadow_wolf' => [
                ['item' => 'minor_healing_pill', 'chance' => 50, 'min' => 1, 'max' => 2],
                ['item' => 'shadow_fang_dagger', 'chance' => 20, 'min' => 1, 'max' => 1],
            ],
            'stone_golem' => [
                ['item' => 'qi_condensing_elixir', 'chance' => 30, 'min' => 1, 'max' => 1],
                ['item' => 'ancient_stone_plate', 'chance' => 18, 'min' => 1, 'max' => 1],
            ],
            'crimson_python' => [
                ['item' => 'qi_condensing_elixir', 'chance' => 45, 'min' => 1, 'max' => 2],
                ['item' => 'crimson_flame_blade', 'chance' => 12, 'min' => 1, 'max' => 1],
            ],
        ];

        foreach ($dropMatrix as $monsterSlug => $drops) {
            $monster = Monster::where('slug', $monsterSlug)->first();
            if (! $monster) {
                continue;
            }

            foreach ($drops as $drop) {
                $item = $createdItems[$drop['item']] ?? null;
                if ($item) {
                    MonsterDrop::updateOrCreate(
                        ['monster_id' => $monster->id, 'item_id' => $item->id],
                        [
                            'drop_chance_pct' => $drop['chance'],
                            'min_quantity' => $drop['min'],
                            'max_quantity' => $drop['max'],
                        ]
                    );
                }
            }
        }
    }
}
