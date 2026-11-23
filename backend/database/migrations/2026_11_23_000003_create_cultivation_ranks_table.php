<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cultivation_ranks', function (Blueprint $table) {
            $table->id();
            $table->unsignedSmallInteger('tier_order')->unique();
            $table->string('realm_tier', 50);
            $table->unsignedTinyInteger('stars');
            $table->string('title', 80);
            $table->string('badge_color', 20)->default('#cd7f32');
            $table->unsignedBigInteger('required_xp')->default(0);
            $table->decimal('stat_multiplier', 5, 2)->default(1.00);
            $table->unsignedInteger('bonus_max_energy')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cultivation_ranks');
    }
};
