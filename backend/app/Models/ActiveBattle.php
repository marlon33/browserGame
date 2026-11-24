<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActiveBattle extends Model
{
    protected $fillable = [
        'character_id',
        'monster_id',
        'status',
        'current_turn',
        'round',
        'player_hp',
        'player_max_hp',
        'monster_hp',
        'monster_max_hp',
        'turn_actions_used',
        'active_effects',
        'combat_log',
        'rewards_summary',
        'turn_expires_at',
    ];

    protected $appends = [
        'turn_remaining_seconds',
    ];

    protected function casts(): array
    {
        return [
            'turn_actions_used' => 'array',
            'active_effects' => 'array',
            'combat_log' => 'array',
            'rewards_summary' => 'array',
            'turn_expires_at' => 'datetime',
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

    public function getTurnRemainingSecondsAttribute(): int
    {
        if ($this->status !== 'active' || ! $this->turn_expires_at || $this->turn_expires_at->isPast()) {
            return 0;
        }

        return (int) now()->diffInSeconds($this->turn_expires_at);
    }
}
