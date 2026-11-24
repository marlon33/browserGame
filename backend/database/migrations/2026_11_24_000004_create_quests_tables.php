<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quests', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 80)->unique();
            $table->string('title', 120);
            $table->text('description');
            $table->string('category', 20)->default('story'); // story, daily
            $table->unsignedSmallInteger('min_level')->default(1);
            $table->unsignedSmallInteger('sort_order')->default(1);

            // Objetivo: visit_region, kill_monster, kill_any, reach_level, collect_item
            $table->string('objective_type', 30);
            $table->string('target_region_slug', 60)->nullable();
            $table->foreignId('target_monster_id')->nullable()->constrained('monsters')->nullOnDelete();
            $table->foreignId('target_item_id')->nullable()->constrained('items')->nullOnDelete();
            $table->unsignedInteger('target_count')->default(1);

            // Recompensas combináveis (qualquer uma pode ser > 0 ou null)
            $table->unsignedInteger('reward_xp')->default(0);
            $table->unsignedInteger('reward_spirit_stones')->default(0);
            $table->unsignedInteger('reward_cultivation_qi')->default(0);
            $table->unsignedInteger('reward_jade_tokens')->default(0);
            $table->foreignId('reward_item_id')->nullable()->constrained('items')->nullOnDelete();
            $table->unsignedInteger('reward_item_quantity')->default(0);

            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('character_quests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('character_id')->constrained('characters')->cascadeOnDelete();
            $table->foreignId('quest_id')->constrained('quests')->cascadeOnDelete();
            $table->date('daily_date')->nullable(); // null para story; YYYY-MM-DD para daily
            $table->unsignedInteger('current_count')->default(0);
            $table->string('status', 20)->default('in_progress'); // in_progress, completed, claimed
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('claimed_at')->nullable();
            $table->timestamps();

            $table->unique(['character_id', 'quest_id', 'daily_date'], 'char_quest_daily_unique');
            $table->index(['character_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('character_quests');
        Schema::dropIfExists('quests');
    }
};
