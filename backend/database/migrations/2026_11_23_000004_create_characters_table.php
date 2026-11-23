<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('characters', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('game_server_id')->constrained('game_servers')->cascadeOnDelete();
            $table->foreignId('realm_id')->constrained('realms');
            $table->foreignId('cultivation_rank_id')->constrained('cultivation_ranks');

            $table->string('name', 24);
            $table->unsignedInteger('level')->default(1);
            $table->unsignedBigInteger('experience')->default(0);

            $table->unsignedInteger('hp')->default(120);
            $table->unsignedInteger('max_hp')->default(120);
            $table->unsignedInteger('energy')->default(100);
            $table->unsignedInteger('max_energy')->default(100);
            $table->timestamp('last_energy_sync_at')->useCurrent();

            $table->unsignedBigInteger('spirit_stones')->default(100);
            $table->unsignedBigInteger('jade_tokens')->default(0);

            $table->unsignedInteger('strength')->default(10);
            $table->unsignedInteger('agility')->default(10);
            $table->unsignedInteger('constitution')->default(10);
            $table->unsignedInteger('spirit_power')->default(10);
            $table->unsignedInteger('stat_points')->default(0);

            $table->timestamp('last_active_at')->nullable();
            $table->timestamps();

            $table->unique(['user_id', 'game_server_id']);
            $table->unique(['game_server_id', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('characters');
    }
};
