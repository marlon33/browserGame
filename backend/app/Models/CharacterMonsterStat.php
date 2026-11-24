<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CharacterMonsterStat extends Model
{
    protected $fillable = [
        'character_id',
        'monster_id',
        'kills_count',
        'defeats_count',
        'boss_cooldown_until',
    ];

    protected function casts(): array
    {
        return [
            'boss_cooldown_until' => 'datetime',
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

    /**
     * Bônus de domínio do Bestiário:
     * - 10+ abates: +3% dano & +2% chance de drop
     * - 25+ abates: +6% dano & +5% chance de drop
     * - 50+ abates: +10% dano & +8% chance de drop
     */
    public function masteryTier(): array
    {
        if ($this->kills_count >= 50) {
            return ['tier' => 3, 'label' => 'Mestre Caçador', 'damage_bonus_pct' => 10, 'drop_bonus_pct' => 8, 'next_target' => null];
        }
        if ($this->kills_count >= 25) {
            return ['tier' => 2, 'label' => 'Veterano', 'damage_bonus_pct' => 6, 'drop_bonus_pct' => 5, 'next_target' => 50];
        }
        if ($this->kills_count >= 10) {
            return ['tier' => 1, 'label' => 'Rastreador', 'damage_bonus_pct' => 3, 'drop_bonus_pct' => 2, 'next_target' => 25];
        }

        return ['tier' => 0, 'label' => 'Novato', 'damage_bonus_pct' => 0, 'drop_bonus_pct' => 0, 'next_target' => 10];
    }
}
