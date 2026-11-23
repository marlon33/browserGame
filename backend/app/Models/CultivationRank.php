<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CultivationRank extends Model
{
    protected $fillable = [
        'tier_order',
        'realm_tier',
        'stars',
        'title',
        'badge_color',
        'required_xp',
        'stat_multiplier',
        'bonus_max_energy',
    ];

    protected function casts(): array
    {
        return [
            'stat_multiplier' => 'float',
        ];
    }

    public function characters(): HasMany
    {
        return $this->hasMany(Character::class);
    }
}
