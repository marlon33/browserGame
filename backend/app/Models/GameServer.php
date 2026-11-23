<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class GameServer extends Model
{
    protected $fillable = [
        'code',
        'name',
        'description',
        'status',
        'max_players',
        'xp_multiplier',
        'drop_multiplier',
        'opened_at',
    ];

    protected function casts(): array
    {
        return [
            'xp_multiplier' => 'float',
            'drop_multiplier' => 'float',
            'opened_at' => 'datetime',
        ];
    }

    public function characters(): HasMany
    {
        return $this->hasMany(Character::class);
    }
}
