<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('items', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 60)->unique();
            $table->string('name', 80);
            $table->text('description');
            $table->enum('type', ['weapon', 'armor', 'accessory', 'consumable']);
            $table->enum('rarity', ['common', 'rare', 'epic', 'legendary'])->default('common');
            $table->unsignedInteger('required_level')->default(1);
            $table->unsignedBigInteger('buy_price')->default(50);
            $table->unsignedBigInteger('sell_price')->default(20);
            $table->boolean('is_purchasable')->default(true);

            // Bônus de Equipamento
            $table->integer('bonus_strength')->default(0);
            $table->integer('bonus_agility')->default(0);
            $table->integer('bonus_constitution')->default(0);
            $table->integer('bonus_spirit_power')->default(0);
            $table->integer('bonus_max_hp')->default(0);

            // Efeito de Consumível
            $table->integer('heal_hp')->default(0);
            $table->integer('restore_energy')->default(0);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('items');
    }
};
