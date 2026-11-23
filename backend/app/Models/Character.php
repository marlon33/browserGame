<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Character extends Model
{
    protected $fillable = [
        'user_id',
        'game_server_id',
        'realm_id',
        'cultivation_rank_id',
        'name',
        'level',
        'experience',
        'hp',
        'max_hp',
        'energy',
        'max_energy',
        'last_energy_sync_at',
        'spirit_stones',
        'jade_tokens',
        'strength',
        'agility',
        'constitution',
        'spirit_power',
        'stat_points',
        'last_active_at',
    ];

    protected function casts(): array
    {
        return [
            'last_energy_sync_at' => 'datetime',
            'last_active_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function server(): BelongsTo
    {
        return $this->belongsTo(GameServer::class, 'game_server_id');
    }

    public function realm(): BelongsTo
    {
        return $this->belongsTo(Realm::class);
    }

    public function cultivationRank(): BelongsTo
    {
        return $this->belongsTo(CultivationRank::class);
    }

    public function syncLazyResources(): void
    {
        if ($this->energy >= $this->max_energy) {
            if ($this->last_energy_sync_at === null || $this->last_energy_sync_at->diffInMinutes(now()) >= 3) {
                $this->last_energy_sync_at = now();
                $this->saveQuietly();
            }
            return;
        }

        $lastSync = $this->last_energy_sync_at ?? now();
        $minutesElapsed = (int) $lastSync->diffInMinutes(now());
        $regenInterval = 3;

        if ($minutesElapsed >= $regenInterval) {
            $pointsGained = intdiv($minutesElapsed, $regenInterval);
            $newEnergy = min($this->max_energy, $this->energy + $pointsGained);

            $this->energy = $newEnergy;
            $this->last_energy_sync_at = $newEnergy >= $this->max_energy
                ? now()
                : $lastSync->addMinutes($pointsGained * $regenInterval);

            $this->saveQuietly();
        }
    }
}
