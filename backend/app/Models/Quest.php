<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Quest extends Model
{
    protected $fillable = [
        'slug',
        'title',
        'description',
        'category',
        'min_level',
        'sort_order',
        'objective_type',
        'target_region_slug',
        'target_monster_id',
        'target_item_id',
        'target_count',
        'reward_xp',
        'reward_spirit_stones',
        'reward_cultivation_qi',
        'reward_jade_tokens',
        'reward_item_id',
        'reward_item_quantity',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    public function targetMonster(): BelongsTo
    {
        return $this->belongsTo(Monster::class, 'target_monster_id');
    }

    public function targetItem(): BelongsTo
    {
        return $this->belongsTo(Item::class, 'target_item_id');
    }

    public function rewardItem(): BelongsTo
    {
        return $this->belongsTo(Item::class, 'reward_item_id');
    }
}
