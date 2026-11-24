<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Item extends Model
{
    protected $fillable = [
        'slug',
        'name',
        'description',
        'type',
        'rarity',
        'required_level',
        'buy_price',
        'sell_price',
        'is_purchasable',
        'bonus_strength',
        'bonus_agility',
        'bonus_constitution',
        'bonus_spirit_power',
        'bonus_max_hp',
        'heal_hp',
        'restore_energy',
    ];

    protected function casts(): array
    {
        return [
            'is_purchasable' => 'boolean',
        ];
    }
}
