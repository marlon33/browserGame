<?php

namespace App\Services;

use App\Models\Character;
use App\Models\CharacterItem;
use App\Models\CharacterQuest;
use App\Models\Quest;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class QuestProgressService
{
    public function syncAndGetQuests(Character $character): Collection
    {
        $today = now()->toDateString();

        $activeQuests = Quest::with(['targetMonster:id,name,zone_name', 'targetItem:id,name,rarity', 'rewardItem:id,name,rarity'])
            ->where('is_active', true)
            ->where('min_level', '<=', $character->level)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        foreach ($activeQuests as $quest) {
            $dailyDate = $quest->category === 'daily' ? $today : null;

            $cq = CharacterQuest::firstOrCreate(
                [
                    'character_id' => $character->id,
                    'quest_id' => $quest->id,
                    'daily_date' => $dailyDate,
                ],
                [
                    'current_count' => 0,
                    'status' => 'in_progress',
                ]
            );

            if ($cq->status === 'claimed') {
                continue;
            }

            if ($quest->objective_type === 'reach_level') {
                $newCount = min($quest->target_count, $character->level);
                if ($newCount !== $cq->current_count) {
                    $cq->current_count = $newCount;
                }
            } elseif ($quest->objective_type === 'collect_item' && $quest->target_item_id) {
                $ownedQty = (int) CharacterItem::where('character_id', $character->id)
                    ->where('item_id', $quest->target_item_id)
                    ->sum('quantity');

                $newCount = min($quest->target_count, $ownedQty);
                if ($newCount !== $cq->current_count) {
                    $cq->current_count = $newCount;
                }
            }

            if ($cq->current_count >= $quest->target_count && $cq->status === 'in_progress') {
                $cq->status = 'completed';
                $cq->completed_at = now();
            }

            if ($cq->isDirty()) {
                $cq->save();
            }
        }

        return CharacterQuest::with([
            'quest.targetMonster:id,name,zone_name',
            'quest.targetItem:id,name,rarity',
            'quest.rewardItem:id,name,rarity',
        ])
            ->where('character_id', $character->id)
            ->where(function ($q) use ($today) {
                $q->whereNull('daily_date')
                    ->orWhere('daily_date', $today);
            })
            ->get()
            ->sortBy(fn (CharacterQuest $cq) => $cq->quest->sort_order ?? 999)
            ->values();
    }

    public function recordMonsterKills(Character $character, int $monsterId, int $kills = 1): void
    {
        if ($kills <= 0) {
            return;
        }

        $this->syncAndGetQuests($character);
        $today = now()->toDateString();

        $inProgress = CharacterQuest::with('quest')
            ->where('character_id', $character->id)
            ->where('status', 'in_progress')
            ->where(function ($q) use ($today) {
                $q->whereNull('daily_date')->orWhere('daily_date', $today);
            })
            ->get();

        foreach ($inProgress as $cq) {
            $quest = $cq->quest;
            if (! $quest) {
                continue;
            }

            $matches =
                ($quest->objective_type === 'kill_monster' && (int) $quest->target_monster_id === $monsterId) ||
                ($quest->objective_type === 'kill_any');

            if (! $matches) {
                continue;
            }

            $cq->current_count = min($quest->target_count, $cq->current_count + $kills);
            if ($cq->current_count >= $quest->target_count) {
                $cq->status = 'completed';
                $cq->completed_at = now();
            }
            $cq->save();
        }
    }

    public function recordRegionVisit(Character $character, string $regionSlug): Collection
    {
        $this->syncAndGetQuests($character);
        $today = now()->toDateString();

        $inProgress = CharacterQuest::with('quest')
            ->where('character_id', $character->id)
            ->where('status', 'in_progress')
            ->where(function ($q) use ($today) {
                $q->whereNull('daily_date')->orWhere('daily_date', $today);
            })
            ->get();

        foreach ($inProgress as $cq) {
            $quest = $cq->quest;
            if (! $quest) {
                continue;
            }

            if ($quest->objective_type === 'visit_region' && $quest->target_region_slug === $regionSlug) {
                $cq->current_count = $quest->target_count;
                $cq->status = 'completed';
                $cq->completed_at = now();
                $cq->save();
            }
        }

        return $this->syncAndGetQuests($character);
    }

    public function claimReward(Character $character, int $characterQuestId): array
    {
        return DB::transaction(function () use ($character, $characterQuestId) {
            /** @var Character $char */
            $char = Character::with(['server', 'realm', 'cultivationRank'])
                ->where('id', $character->id)
                ->lockForUpdate()
                ->firstOrFail();

            /** @var CharacterQuest $cq */
            $cq = CharacterQuest::with(['quest.rewardItem'])
                ->where('id', $characterQuestId)
                ->where('character_id', $char->id)
                ->lockForUpdate()
                ->firstOrFail();

            $quest = $cq->quest;

            if ($cq->status === 'claimed') {
                throw ValidationException::withMessages([
                    'quest' => ['A recompensa desta missão já foi resgatada.'],
                ]);
            }

            if ($cq->status !== 'completed' && $cq->current_count < $quest->target_count) {
                throw ValidationException::withMessages([
                    'quest' => ['Você ainda não concluiu todos os objetivos desta missão.'],
                ]);
            }

            $rewardsApplied = [];

            if ($quest->reward_xp > 0) {
                $char->grantExperience($quest->reward_xp);
                $rewardsApplied[] = "+{$quest->reward_xp} XP";
            }

            if ($quest->reward_spirit_stones > 0) {
                $char->spirit_stones += $quest->reward_spirit_stones;
                $rewardsApplied[] = "+{$quest->reward_spirit_stones} Pedras";
            }

            if ($quest->reward_cultivation_qi > 0) {
                $char->grantCultivationXp($quest->reward_cultivation_qi);
                $rewardsApplied[] = "+{$quest->reward_cultivation_qi} Qi";
            }

            if ($quest->reward_jade_tokens > 0) {
                $char->jade_tokens += $quest->reward_jade_tokens;
                $rewardsApplied[] = "+{$quest->reward_jade_tokens} Jades";
            }

            if ($quest->rewardItem && $quest->reward_item_quantity > 0) {
                $char->addItemToInventory($quest->rewardItem, $quest->reward_item_quantity);
                $rewardsApplied[] = "{$quest->reward_item_quantity}x {$quest->rewardItem->name}";
            }

            $cq->status = 'claimed';
            $cq->claimed_at = now();
            $cq->save();

            $char->last_active_at = now();
            $char->save();
            $char->load(['server', 'realm', 'cultivationRank']);

            $summary = implode(' • ', $rewardsApplied);

            return [
                'message' => "Missão '{$quest->title}' concluída! Recompensas: {$summary}.",
                'character' => $char,
                'quests' => $this->syncAndGetQuests($char),
            ];
        });
    }
}
