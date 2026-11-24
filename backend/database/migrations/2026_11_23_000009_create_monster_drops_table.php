<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('monster_drops', function (Blueprint $table) {
            $table->id();
            $table->foreignId('monster_id')->constrained('monsters')->cascadeOnDelete();
            $table->foreignId('item_id')->constrained('items')->cascadeOnDelete();
            $table->unsignedSmallInteger('drop_chance_pct'); // 1 a 100
            $table->unsignedTinyInteger('min_quantity')->default(1);
            $table->unsignedTinyInteger('max_quantity')->default(1);
            $table->timestamps();

            $table->unique(['monster_id', 'item_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('monster_drops');
    }
};
