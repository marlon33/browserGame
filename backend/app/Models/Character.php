<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

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

    public function battleLogs(): HasMany
    {
        return $this->hasMany(BattleLog::class);
    }

    /**
     * Sincronização Lazy de Energia (+1 a cada 3 minutos)
     */
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

    /**
     * XP necessária para subir do nível atual para o próximo
     */
    public function xpForNextLevel(): int
    {
        return (int) round(100 * pow($this->level, 1.45));
    }

    /**
     * Aplica ganho de XP, sobe níveis, concede pontos de atributo e verifica avanço de Patente de Cultivo
     */
    public function grantExperience(int $amount): array
    {
        $this->experience += max(0, $amount);
        $levelsGained = 0;
        $rankUpTitle = null;

        while ($this->experience >= $this->xpForNextLevel()) {
            $this->experience -= $this->xpForNextLevel();
            $this->level += 1;
            $this->stat_points += 3;
            $this->max_hp += 15;
            $this->hp = $this->max_hp;
            $levelsGained++;
        }

        // Verifica avanço automático de Patente de Cultivo baseado em XP total acumulado + nível
        $totalProgressionScore = $this->experience + ($this->level - 1) * 150;
        $nextRank = CultivationRank::where('tier_order', '>', $this->cultivationRank->tier_order)
            ->where('required_xp', '<=', $totalProgressionScore)
            ->orderByDesc('tier_order')
            ->first();

        if ($nextRank) {
            $energyDiff = max(0, $nextRank->bonus_max_energy - $this->cultivationRank->bonus_max_energy);
            $this->cultivation_rank_id = $nextRank->id;
            $this->max_energy += $energyDiff;
            $this->energy = min($this->max_energy, $this->energy + $energyDiff);
            $this->hp = $this->max_hp;
            $rankUpTitle = $nextRank->title;
        }

        return [
            'levels_gained' => $levelsGained,
            'rank_up_title' => $rankUpTitle,
        ];
    }
}
