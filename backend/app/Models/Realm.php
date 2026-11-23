<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Realm extends Model
{
    protected $fillable = [
        'slug',
        'name',
        'tagline',
        'description',
        'primary_color',
        'passive_bonuses',
    ];

    protected function casts(): array
    {
        return [
            'passive_bonuses' => 'array',
        ];
    }

    public function characters(): HasMany
    {
        return $this->hasMany(Character::class);
    }
}
