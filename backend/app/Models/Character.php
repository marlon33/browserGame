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

    protected $appends = [
        'effective_stats',
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

    public function items(): HasMany
    {
        return $this->hasMany(CharacterItem::class);
    }

    /**
     * Calcula os atributos totais somando atributos base + itens equipados
     */
    public function getEffectiveStatsAttribute(): array
    {
        $equipped = $this->items()->with('item')->where('is_equipped', true)->get();

        $bonusStr = 0;
        $bonusAgi = 0;
        $bonusCon = 0;
        $bonusSpi = 0;
        $bonusHp = 0;

        foreach ($equipped as $charItem) {
            if ($charItem->item) {
                $bonusStr += $charItem->item->bonus_strength;
                $bonusAgi += $charItem->item->bonus_agility;
                $bonusCon += $charItem->item->bonus_constitution;
                $bonusSpi += $charItem->item->bonus_spirit_power;
                $bonusHp += $charItem->item->bonus_max_hp;
            }
        }

        return [
            'strength' => $this->strength + $bonusStr,
            'agility' => $this->agility + $bonusAgi,
            'constitution' => $this->constitution + $bonusCon,
            'spirit_power' => $this->spirit_power + $bonusSpi,
            'max_hp' => $this->max_hp + $bonusHp,
            'bonus_strength' => $bonusStr,
            'bonus_agility' => $bonusAgi,
            'bonus_constitution' => $bonusCon,
            'bonus_spirit_power' => $bonusSpi,
            'bonus_max_hp' => $bonusHp,
        ];
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

    public function xpForNextLevel(): int
    {
        return (int) round(100 * pow($this->level, 1.45));
    }

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
            $this->hp = $this->effective_stats['max_hp'];
            $levelsGained++;
        }

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
            $this->hp = $this->effective_stats['max_hp'];
            $rankUpTitle = $nextRank->title;
        }

        return [
            'levels_gained' => $levelsGained,
            'rank_up_title' => $rankUpTitle,
        ];
    }

    /**
     * Adiciona um item empilhável ou individual ao inventário do personagem
     */
    public function addItemToInventory(Item $item, int $quantity = 1): CharacterItem
    {
        if ($item->type === 'consumable') {
            $existing = $this->items()->where('item_id', $item->id)->first();
            if ($existing) {
                $existing->increment('quantity', $quantity);
                return $existing->fresh('item');
            }
        }

        return $this->items()->create([
            'item_id' => $item->id,
            'quantity' => $quantity,
            'is_equipped' => false,
        ])->load('item');
    }
}
