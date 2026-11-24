<?php

namespace Database\Seeders;

use App\Models\Item;
use App\Models\Monster;
use App\Models\MonsterDrop;
use Illuminate\Database\Seeder;

class PveExpansionSeeder extends Seeder
{
    public function run(): void
    {
        // Atualizar monstros existentes para a Região 1 (Floresta da Névoa)
        Monster::where('recommended_level', '<=', 4)->update([
            'region_slug' => 'floresta-nevoa',
            'region_order' => 1,
            'zone_name' => 'Floresta da Névoa',
        ]);

        Monster::where('recommended_level', '>', 4)->update([
            'region_slug' => 'desfiladeiro-rubro',
            'region_order' => 2,
            'zone_name' => 'Desfiladeiro das Pedras Rubras',
        ]);

        $monstersData = [
            // REGIÃO 1: FLORESTA DA NÉVOA (Nv. 1 a 4 + Chefe)
            [
                'slug' => 'lobo-sombrio-nevoa',
                'region_slug' => 'floresta-nevoa',
                'region_order' => 1,
                'name' => 'Lobo Sombrio da Névoa',
                'zone_name' => 'Floresta da Névoa',
                'recommended_level' => 1,
                'is_boss' => false,
                'boss_cooldown_seconds' => 0,
                'energy_cost' => 5,
                'max_hp' => 75,
                'attack' => 12,
                'defense' => 4,
                'agility' => 9,
                'xp_reward' => 35,
                'spirit_stones_reward' => 14,
                'cultivation_qi_reward' => 0,
            ],
            [
                'slug' => 'javali-coura-ferro',
                'region_slug' => 'floresta-nevoa',
                'region_order' => 1,
                'name' => 'Javali de Couraça de Ferro',
                'zone_name' => 'Floresta da Névoa',
                'recommended_level' => 3,
                'is_boss' => false,
                'boss_cooldown_seconds' => 0,
                'energy_cost' => 7,
                'max_hp' => 135,
                'attack' => 20,
                'defense' => 11,
                'agility' => 7,
                'xp_reward' => 68,
                'spirit_stones_reward' => 26,
                'cultivation_qi_reward' => 0,
            ],
            [
                'slug' => 'boss-rei-lobo-lunar',
                'region_slug' => 'floresta-nevoa',
                'region_order' => 1,
                'name' => '[CHEFE] Rei Lobo da Lua Pálida',
                'zone_name' => 'Floresta da Névoa',
                'recommended_level' => 4,
                'is_boss' => true,
                'boss_cooldown_seconds' => 180, // 3 minutos
                'energy_cost' => 12,
                'max_hp' => 260,
                'attack' => 32,
                'defense' => 16,
                'agility' => 16,
                'xp_reward' => 180,
                'spirit_stones_reward' => 85,
                'cultivation_qi_reward' => 45,
            ],

            // REGIÃO 2: DESFILADEIRO DAS PEDRAS RUBRAS (Nv. 5 a 8 + Chefe)
            [
                'slug' => 'escorpiao-cristal-rubro',
                'region_slug' => 'desfiladeiro-rubro',
                'region_order' => 2,
                'name' => 'Escorpião de Cristal Rubro',
                'zone_name' => 'Desfiladeiro das Pedras Rubras',
                'recommended_level' => 5,
                'is_boss' => false,
                'boss_cooldown_seconds' => 0,
                'energy_cost' => 9,
                'max_hp' => 210,
                'attack' => 34,
                'defense' => 18,
                'agility' => 14,
                'xp_reward' => 115,
                'spirit_stones_reward' => 45,
                'cultivation_qi_reward' => 0,
            ],
            [
                'slug' => 'golem-magma-antigo',
                'region_slug' => 'desfiladeiro-rubro',
                'region_order' => 2,
                'name' => 'Golem de Magma Antigo',
                'zone_name' => 'Desfiladeiro das Pedras Rubras',
                'recommended_level' => 7,
                'is_boss' => false,
                'boss_cooldown_seconds' => 0,
                'energy_cost' => 11,
                'max_hp' => 340,
                'attack' => 48,
                'defense' => 30,
                'agility' => 10,
                'xp_reward' => 185,
                'spirit_stones_reward' => 72,
                'cultivation_qi_reward' => 0,
            ],
            [
                'slug' => 'boss-serpente-chama-escarlate',
                'region_slug' => 'desfiladeiro-rubro',
                'region_order' => 2,
                'name' => '[CHEFE] Serpente da Chama Escarlate',
                'zone_name' => 'Desfiladeiro das Pedras Rubras',
                'recommended_level' => 8,
                'is_boss' => true,
                'boss_cooldown_seconds' => 300, // 5 minutos
                'energy_cost' => 16,
                'max_hp' => 520,
                'attack' => 66,
                'defense' => 34,
                'agility' => 24,
                'xp_reward' => 390,
                'spirit_stones_reward' => 170,
                'cultivation_qi_reward' => 110,
            ],

            // REGIÃO 3: ABISMO DO DRAGÃO ADORMECIDO (Nv. 10+ + Chefe)
            [
                'slug' => 'espectro-abissal',
                'region_slug' => 'abismo-dragao',
                'region_order' => 3,
                'name' => 'Espectro das Profundezas',
                'zone_name' => 'Abismo do Dragão Adormecido',
                'recommended_level' => 10,
                'is_boss' => false,
                'boss_cooldown_seconds' => 0,
                'energy_cost' => 14,
                'max_hp' => 560,
                'attack' => 78,
                'defense' => 42,
                'agility' => 28,
                'xp_reward' => 320,
                'spirit_stones_reward' => 125,
                'cultivation_qi_reward' => 0,
            ],
            [
                'slug' => 'boss-guardiao-draconico',
                'region_slug' => 'abismo-dragao',
                'region_order' => 3,
                'name' => '[CHEFE] Guardião Dracônico Corrompido',
                'zone_name' => 'Abismo do Dragão Adormecido',
                'recommended_level' => 12,
                'is_boss' => true,
                'boss_cooldown_seconds' => 480, // 8 minutos
                'energy_cost' => 20,
                'max_hp' => 980,
                'attack' => 112,
                'defense' => 58,
                'agility' => 35,
                'xp_reward' => 750,
                'spirit_stones_reward' => 340,
                'cultivation_qi_reward' => 240,
            ],
        ];

        $items = Item::all();
        $healingPill = $items->where('type', 'consumable')->first();
        $rareEquip = $items->whereIn('rarity', ['rare', 'epic'])->first() ?? $items->first();

        foreach ($monstersData as $data) {
            $monster = Monster::updateOrCreate(
                ['slug' => $data['slug']],
                $data
            );

            if ($healingPill) {
                MonsterDrop::updateOrCreate(
                    ['monster_id' => $monster->id, 'item_id' => $healingPill->id],
                    [
                        'drop_chance_pct' => $monster->is_boss ? 75 : 30,
                        'min_quantity' => 1,
                        'max_quantity' => $monster->is_boss ? 3 : 1,
                    ]
                );
            }

            if ($monster->is_boss && $rareEquip) {
                MonsterDrop::updateOrCreate(
                    ['monster_id' => $monster->id, 'item_id' => $rareEquip->id],
                    [
                        'drop_chance_pct' => 40,
                        'min_quantity' => 1,
                        'max_quantity' => 1,
                    ]
                );
            }
        }
    }
}
