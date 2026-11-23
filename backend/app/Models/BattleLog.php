<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BattleLog extends Model
{
    protected $fillable = [
        'character_id',
        'monster_id',
        'outcome',
        'rounds',
        'xp_gained',
        'spirit_stones_gained',
        'combat_log',
    ];

    protected function casts(): array
    {
        return [
            'combat_log' => 'array',
        ];
    }

    public function character(): BelongsTo
    {
        return $this->belongsTo(Character::class);
    }

    public function monster(): BelongsTo
    {
        return $this->belongsTo(Monster::class);
    }
}
