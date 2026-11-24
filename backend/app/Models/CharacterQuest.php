<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CharacterQuest extends Model
{
    protected $fillable = [
        'character_id',
        'quest_id',
        'daily_date',
        'current_count',
        'status',
        'completed_at',
        'claimed_at',
    ];

    protected function casts(): array
    {
        return [
            'daily_date' => 'date:Y-m-d',
            'completed_at' => 'datetime',
            'claimed_at' => 'datetime',
        ];
    }

    public function character(): BelongsTo
    {
        return $this->belongsTo(Character::class);
    }

    public function quest(): BelongsTo
    {
        return $this->belongsTo(Quest::class);
    }
}
