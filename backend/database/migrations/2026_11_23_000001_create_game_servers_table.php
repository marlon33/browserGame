<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('game_servers', function (Blueprint $table) {
            $table->id();
            $table->string('code', 20)->unique();
            $table->string('name', 80);
            $table->text('description')->nullable();
            $table->enum('status', ['online', 'maintenance', 'full'])->default('online');
            $table->unsignedInteger('max_players')->default(5000);
            $table->decimal('xp_multiplier', 4, 2)->default(1.00);
            $table->decimal('drop_multiplier', 4, 2)->default(1.00);
            $table->timestamp('opened_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('game_servers');
    }
};
