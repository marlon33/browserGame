<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('characters', function (Blueprint $table) {
            $table->unsignedBigInteger('cultivation_xp')->default(0)->after('experience');
            $table->timestamp('meditation_cooldown_until')->nullable()->after('last_energy_sync_at');
            $table->unsignedTinyInteger('meditation_fatigue')->default(0)->after('meditation_cooldown_until');
            $table->timestamp('last_fatigue_sync_at')->nullable()->after('meditation_fatigue');
        });
    }

    public function down(): void
    {
        Schema::table('characters', function (Blueprint $table) {
            $table->dropColumn([
                'cultivation_xp',
                'meditation_cooldown_until',
                'meditation_fatigue',
                'last_fatigue_sync_at',
            ]);
        });
    }
};
