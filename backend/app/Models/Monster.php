<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Monster extends Model
{
    protected $fillable = [
        'slug',
        'name',
        'zone_name',
        'recommended_level',
        'energy_cost',
        'max_hp',
        'attack',
        'defense',
        'agility',
        'xp_reward',
        'spirit_stones_reward',
    ];

    public function drops(): HasMany
    {
        return $this->hasMany(MonsterDrop::class);
    }
}
