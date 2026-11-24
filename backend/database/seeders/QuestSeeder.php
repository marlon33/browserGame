<?php

namespace Database\Seeders;

use App\Models\Item;
use App\Models\Monster;
use App\Models\Quest;
use Illuminate\Database\Seeder;

class QuestSeeder extends Seeder
{
    public function run(): void
    {
        $wolf = Monster::where('slug', 'lobo-sombrio-nevoa')->first() ?? Monster::first();
        $boar = Monster::where('slug', 'javali-coura-ferro')->first() ?? $wolf;
        $wolfBoss = Monster::where('slug', 'boss-rei-lobo-lunar')->first() ?? $wolf;
        $scorpion = Monster::where('slug', 'escorpiao-cristal-rubro')->first() ?? $wolf;

        $healingPill = Item::where('type', 'consumable')->first();
        $starterWeapon = Item::where('type', 'weapon')->orderBy('required_level')->first();
        $rareEquip = Item::whereIn('rarity', ['rare', 'epic'])->first() ?? $starterWeapon;

        $quests = [
            // ================= MISSÕES PRINCIPAIS (STORY) =================
            [
                'slug' => 'story-primeiros-passos-nevoa',
                'title' => 'Batismo na Floresta da Névoa',
                'description' => 'Prove seu valor como cultivador derrotando 3 Lobos Sombrios da Névoa.',
                'category' => 'story',
                'min_level' => 1,
                'sort_order' => 1,
                'objective_type' => 'kill_monster',
                'target_region_slug' => null,
                'target_monster_id' => $wolf?->id,
                'target_item_id' => null,
                'target_count' => 3,
                'reward_xp' => 80,
                'reward_spirit_stones' => 45,
                'reward_cultivation_qi' => 25,
                'reward_jade_tokens' => 0,
                'reward_item_id' => $healingPill?->id,
                'reward_item_quantity' => $healingPill ? 2 : 0,
            ],
            [
                'slug' => 'story-provisoes-alquimicas',
                'title' => 'Reservas de Sobrevivência',
                'description' => 'Tenha pelo menos 2 Pílulas de Recuperação Vital em sua mochila (comprando no Mercado ou saqueando bestas).',
                'category' => 'story',
                'min_level' => 1,
                'sort_order' => 2,
                'objective_type' => 'collect_item',
                'target_region_slug' => null,
                'target_monster_id' => null,
                'target_item_id' => $healingPill?->id,
                'target_count' => 2,
                'reward_xp' => 60,
                'reward_spirit_stones' => 60,
                'reward_cultivation_qi' => 0,
                'reward_jade_tokens' => 0,
                'reward_item_id' => $starterWeapon?->id,
                'reward_item_quantity' => $starterWeapon ? 1 : 0,
            ],
            [
                'slug' => 'story-despertar-nivel-3',
                'title' => 'Despertar dos Meridianos',
                'description' => 'Alcance o Nível 3 de combate para fortalecer seu corpo espiritual.',
                'category' => 'story',
                'min_level' => 1,
                'sort_order' => 3,
                'objective_type' => 'reach_level',
                'target_region_slug' => null,
                'target_monster_id' => null,
                'target_item_id' => null,
                'target_count' => 3,
                'reward_xp' => 0,
                'reward_spirit_stones' => 110,
                'reward_cultivation_qi' => 60,
                'reward_jade_tokens' => 2,
                'reward_item_id' => null,
                'reward_item_quantity' => 0,
            ],
            [
                'slug' => 'story-cacada-rei-lobo',
                'title' => 'O Soberano da Lua Pálida',
                'description' => 'Desafie e derrote o Chefe de Zona [CHEFE] Rei Lobo da Lua Pálida na Floresta da Névoa.',
                'category' => 'story',
                'min_level' => 3,
                'sort_order' => 4,
                'objective_type' => 'kill_monster',
                'target_region_slug' => null,
                'target_monster_id' => $wolfBoss?->id,
                'target_item_id' => null,
                'target_count' => 1,
                'reward_xp' => 260,
                'reward_spirit_stones' => 180,
                'reward_cultivation_qi' => 100,
                'reward_jade_tokens' => 5,
                'reward_item_id' => $rareEquip?->id,
                'reward_item_quantity' => $rareEquip ? 1 : 0,
            ],
            [
                'slug' => 'story-expedicao-desfiladeiro',
                'title' => 'Rumo às Pedras Rubras',
                'description' => 'Explore o território do Desfiladeiro das Pedras Rubras selecionando a região no mapa de Caça.',
                'category' => 'story',
                'min_level' => 4,
                'sort_order' => 5,
                'objective_type' => 'visit_region',
                'target_region_slug' => 'desfiladeiro-rubro',
                'target_monster_id' => null,
                'target_item_id' => null,
                'target_count' => 1,
                'reward_xp' => 150,
                'reward_spirit_stones' => 120,
                'reward_cultivation_qi' => 75,
                'reward_jade_tokens' => 0,
                'reward_item_id' => null,
                'reward_item_quantity' => 0,
            ],
            [
                'slug' => 'story-expedicao-abismo',
                'title' => 'Sussurros do Dragão Adormecido',
                'description' => 'Aventure-se até o Abismo do Dragão Adormecido para reconhecer o território.',
                'category' => 'story',
                'min_level' => 8,
                'sort_order' => 6,
                'objective_type' => 'visit_region',
                'target_region_slug' => 'abismo-dragao',
                'target_monster_id' => null,
                'target_item_id' => null,
                'target_count' => 1,
                'reward_xp' => 350,
                'reward_spirit_stones' => 250,
                'reward_cultivation_qi' => 150,
                'reward_jade_tokens' => 8,
                'reward_item_id' => null,
                'reward_item_quantity' => 0,
            ],

            // ================= MISSÕES DIÁRIAS (DAILY) =================
            [
                'slug' => 'daily-patrulha-diaria',
                'title' => '[Diária] Patrulha dos Territórios',
                'description' => 'Elimine 5 criaturas de qualquer região para manter as rotas espirituais seguras.',
                'category' => 'daily',
                'min_level' => 1,
                'sort_order' => 10,
                'objective_type' => 'kill_any',
                'target_region_slug' => null,
                'target_monster_id' => null,
                'target_item_id' => null,
                'target_count' => 5,
                'reward_xp' => 120,
                'reward_spirit_stones' => 75,
                'reward_cultivation_qi' => 40,
                'reward_jade_tokens' => 1,
                'reward_item_id' => null,
                'reward_item_quantity' => 0,
            ],
            [
                'slug' => 'daily-caca-javalis',
                'title' => '[Diária] Controle de Couraças',
                'description' => 'Abata 2 Javalis de Couraça de Ferro hoje.',
                'category' => 'daily',
                'min_level' => 2,
                'sort_order' => 11,
                'objective_type' => 'kill_monster',
                'target_region_slug' => null,
                'target_monster_id' => $boar?->id,
                'target_item_id' => null,
                'target_count' => 2,
                'reward_xp' => 140,
                'reward_spirit_stones' => 90,
                'reward_cultivation_qi' => 35,
                'reward_jade_tokens' => 0,
                'reward_item_id' => $healingPill?->id,
                'reward_item_quantity' => $healingPill ? 1 : 0,
            ],
            [
                'slug' => 'daily-escorpioes-rubros',
                'title' => '[Diária] Cristais do Desfiladeiro',
                'description' => 'Derrote 2 Escorpiões de Cristal Rubro no Desfiladeiro.',
                'category' => 'daily',
                'min_level' => 5,
                'sort_order' => 12,
                'objective_type' => 'kill_monster',
                'target_region_slug' => null,
                'target_monster_id' => $scorpion?->id,
                'target_item_id' => null,
                'target_count' => 2,
                'reward_xp' => 240,
                'reward_spirit_stones' => 140,
                'reward_cultivation_qi' => 70,
                'reward_jade_tokens' => 2,
                'reward_item_id' => null,
                'reward_item_quantity' => 0,
            ],
        ];

        foreach ($quests as $q) {
            if ($q['objective_type'] === 'collect_item' && ! $q['target_item_id']) {
                continue;
            }
            Quest::updateOrCreate(['slug' => $q['slug']], $q);
        }
    }
}
