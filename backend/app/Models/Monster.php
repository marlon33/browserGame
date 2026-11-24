<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Monster extends Model
{
    protected $fillable = [
        'slug',
        'region_slug',
        'region_order',
        'name',
        'zone_name',
        'recommended_level',
        'is_boss',
        'boss_cooldown_seconds',
        'energy_cost',
        'max_hp',
        'attack',
        'defense',
        'agility',
        'xp_reward',
        'spirit_stones_reward',
        'cultivation_qi_reward',
    ];

    protected function casts(): array
    {
        return [
            'is_boss' => 'boolean',
        ];
    }

    public function drops(): HasMany
    {
        return $this->hasMany(MonsterDrop::class);
    }

    public function characterStats(): HasMany
    {
        return $this->hasMany(CharacterMonsterStat::class);
    }
}
