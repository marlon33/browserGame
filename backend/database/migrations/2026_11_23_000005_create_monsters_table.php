<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('monsters', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 50)->unique();
            $table->string('name', 80);
            $table->string('zone_name', 80);
            $table->unsignedInteger('recommended_level')->default(1);
            $table->unsignedInteger('energy_cost')->default(5);
            $table->unsignedInteger('max_hp');
            $table->unsignedInteger('attack');
            $table->unsignedInteger('defense');
            $table->unsignedInteger('agility');
            $table->unsignedBigInteger('xp_reward');
            $table->unsignedBigInteger('spirit_stones_reward');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('monsters');
    }
};
