<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Adicionar campos de Região, Chefe e Cooldown em monsters
        Schema::table('monsters', function (Blueprint $table) {
            $table->string('region_slug', 60)->default('floresta-nevoa')->after('slug');
            $table->unsignedSmallInteger('region_order')->default(1)->after('region_slug');
            $table->boolean('is_boss')->default(false)->after('recommended_level');
            $table->unsignedInteger('boss_cooldown_seconds')->default(0)->after('is_boss');
            $table->unsignedInteger('cultivation_qi_reward')->default(0)->after('spirit_stones_reward');
        });

        // 2. Bestiário & Cooldowns individuais de Boss por personagem
        Schema::create('character_monster_stats', function (Blueprint $table) {
            $table->id();
            $table->foreignId('character_id')->constrained('characters')->cascadeOnDelete();
            $table->foreignId('monster_id')->constrained('monsters')->cascadeOnDelete();
            $table->unsignedInteger('kills_count')->default(0);
            $table->unsignedInteger('defeats_count')->default(0);
            $table->timestamp('boss_cooldown_until')->nullable();
            $table->timestamps();

            $table->unique(['character_id', 'monster_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('character_monster_stats');

        Schema::table('monsters', function (Blueprint $table) {
            $table->dropColumn([
                'region_slug',
                'region_order',
                'is_boss',
                'boss_cooldown_seconds',
                'cultivation_qi_reward',
            ]);
        });
    }
};
