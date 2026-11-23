<?php

namespace Database\Seeders;

use App\Models\Monster;
use Illuminate\Database\Seeder;

class MonsterSeeder extends Seeder
{
    public function run(): void
    {
        $monsters = [
            [
                'slug' => 'horned_sheep',
                'name' => 'Carneiro de Chifres Espirituais',
                'zone_name' => 'Bosque da Névoa Inicial',
                'recommended_level' => 1,
                'energy_cost' => 5,
                'max_hp' => 75,
                'attack' => 14,
                'defense' => 4,
                'agility' => 8,
                'xp_reward' => 45,
                'spirit_stones_reward' => 25,
            ],
            [
                'slug' => 'shadow_wolf',
                'name' => 'Lobo das Sombras de Bronze',
                'zone_name' => 'Bosque da Névoa Inicial',
                'recommended_level' => 2,
                'energy_cost' => 8,
                'max_hp' => 130,
                'attack' => 22,
                'defense' => 8,
                'agility' => 14,
                'xp_reward' => 95,
                'spirit_stones_reward' => 55,
            ],
            [
                'slug' => 'stone_golem',
                'name' => 'Guardião de Rocha Antiga',
                'zone_name' => 'Ruínas da Cidade Orquídea',
                'recommended_level' => 4,
                'energy_cost' => 12,
                'max_hp' => 260,
                'attack' => 34,
                'defense' => 18,
                'agility' => 9,
                'xp_reward' => 220,
                'spirit_stones_reward' => 130,
            ],
            [
                'slug' => 'crimson_python',
                'name' => 'Píton Escarlate de Prata',
                'zone_name' => 'Abismo das Chamas Negras',
                'recommended_level' => 7,
                'energy_cost' => 15,
                'max_hp' => 450,
                'attack' => 56,
                'defense' => 26,
                'agility' => 28,
                'xp_reward' => 520,
                'spirit_stones_reward' => 310,
            ],
        ];

        foreach ($monsters as $monster) {
            Monster::updateOrCreate(['slug' => $monster['slug']], $monster);
        }
    }
}
