<?php

namespace Database\Seeders;

use App\Models\CultivationRank;
use App\Models\GameServer;
use App\Models\Realm;
use Illuminate\Database\Seeder;

class WorldSeeder extends Seeder
{
    public function run(): void
    {
        GameServer::updateOrCreate(
            ['code' => 'S1'],
            [
                'name' => 'Vale do Dragão Celestial',
                'description' => 'Servidor inaugural. Disputa equilibrada entre os dois reinos.',
                'status' => 'online',
                'max_players' => 5000,
                'xp_multiplier' => 1.00,
                'drop_multiplier' => 1.00,
                'opened_at' => now(),
            ]
        );

        GameServer::updateOrCreate(
            ['code' => 'S2'],
            [
                'name' => 'Pico da Fênix Escarlate',
                'description' => 'Novo reino aberto para cultivadores recém-chegados.',
                'status' => 'online',
                'max_players' => 5000,
                'xp_multiplier' => 1.15,
                'drop_multiplier' => 1.10,
                'opened_at' => now(),
            ]
        );

        Realm::updateOrCreate(
            ['slug' => 'solar_empire'],
            [
                'name' => 'Império Solar',
                'tagline' => 'Ordem, Glória e Força Inabalável',
                'description' => 'Forjados sob a luz das antigas cidadelas celestiais, seus guerreiros priorizam vigor físico e domínio frontal.',
                'primary_color' => '#eab308',
                'passive_bonuses' => [
                    'strength_pct' => 5,
                    'max_hp_pct' => 5,
                ],
            ]
        );

        Realm::updateOrCreate(
            ['slug' => 'abyssal_dominion'],
            [
                'name' => 'Domínio Abissal',
                'tagline' => 'Astúcia, Sombras e Poder Espiritual',
                'description' => 'Mestres das artes ocultas e da velocidade letal, canalizam a essência espiritual para golpes críticos devastadores.',
                'primary_color' => '#a855f7',
                'passive_bonuses' => [
                    'agility_pct' => 5,
                    'spirit_power_pct' => 5,
                ],
            ]
        );

        $tiers = [
            ['name' => 'Bronze', 'color' => '#cd7f32', 'base_xp' => 100, 'mult_step' => 0.08, 'energy_step' => 5],
            ['name' => 'Prata', 'color' => '#cbd5e1', 'base_xp' => 600, 'mult_step' => 0.15, 'energy_step' => 10],
            ['name' => 'Ouro', 'color' => '#eab308', 'base_xp' => 2500, 'mult_step' => 0.25, 'energy_step' => 15],
            ['name' => 'Ouro Negro', 'color' => '#38bdf8', 'base_xp' => 10000, 'mult_step' => 0.40, 'energy_step' => 25],
            ['name' => 'Lendário', 'color' => '#f97316', 'base_xp' => 45000, 'mult_step' => 0.65, 'energy_step' => 40],
            ['name' => 'Semideus', 'color' => '#ef4444', 'base_xp' => 180000, 'mult_step' => 1.00, 'energy_step' => 60],
        ];

        $order = 1;
        $currentMultiplier = 1.00;
        $currentBonusEnergy = 0;

        foreach ($tiers as $tier) {
            for ($star = 1; $star <= 5; $star++) {
                $requiredXp = ($order === 1)
                    ? 0
                    : (int) round($tier['base_xp'] * pow(1.45, $star - 1));

                CultivationRank::updateOrCreate(
                    ['tier_order' => $order],
                    [
                        'realm_tier' => $tier['name'],
                        'stars' => $star,
                        'title' => "{$tier['name']} {$star} Estrela" . ($star > 1 ? 's' : ''),
                        'badge_color' => $tier['color'],
                        'required_xp' => $requiredXp,
                        'stat_multiplier' => round($currentMultiplier, 2),
                        'bonus_max_energy' => $currentBonusEnergy,
                    ]
                );

                $order++;
                $currentMultiplier += $tier['mult_step'];
                $currentBonusEnergy += $tier['energy_step'];
            }
        }
    }
}
