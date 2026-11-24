<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('active_battles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('character_id')->constrained('characters')->cascadeOnDelete();
            $table->foreignId('monster_id')->constrained('monsters')->cascadeOnDelete();
            $table->string('status', 20)->default('active'); // active, victory, defeat
            $table->string('current_turn', 20)->default('player'); // player, monster
            $table->unsignedSmallInteger('round')->default(1);
            $table->unsignedInteger('player_hp');
            $table->unsignedInteger('player_max_hp');
            $table->unsignedInteger('monster_hp');
            $table->unsignedInteger('monster_max_hp');
            $table->json('turn_actions_used')->nullable(); // ['heal' => bool, 'support' => bool]
            $table->json('active_effects')->nullable(); // ['player_buff_turns' => int, 'monster_debuff_turns' => int]
            $table->json('combat_log')->nullable();
            $table->json('rewards_summary')->nullable();
            $table->timestamp('turn_expires_at')->nullable();
            $table->timestamps();

            $table->index(['character_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('active_battles');
    }
};
