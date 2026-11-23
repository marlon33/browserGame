<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('battle_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('character_id')->constrained('characters')->cascadeOnDelete();
            $table->foreignId('monster_id')->constrained('monsters')->cascadeOnDelete();
            $table->enum('outcome', ['victory', 'defeat']);
            $table->unsignedSmallInteger('rounds');
            $table->unsignedBigInteger('xp_gained')->default(0);
            $table->unsignedBigInteger('spirit_stones_gained')->default(0);
            $table->json('combat_log');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('battle_logs');
    }
};
