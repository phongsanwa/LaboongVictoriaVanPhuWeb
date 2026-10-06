<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasColumn('stores', 'wage_probation')) {
            Schema::table('stores', function (Blueprint $table) {
                $table->unsignedInteger('wage_probation')->default(18000)->after('royalty_pct');
                $table->unsignedInteger('wage_official')->default(20000)->after('wage_probation');
            });
        }

        // Hourly shop workers (separate from admin/staff login accounts).
        if (!Schema::hasTable('workers')) {
            Schema::create('workers', function (Blueprint $table) {
                $table->id();
                $table->foreignId('store_id')->nullable()->constrained('stores')->nullOnDelete();
                $table->string('name', 100);
                $table->string('phone', 20)->nullable();
                $table->enum('type', ['probation', 'official'])->default('probation');
                $table->date('official_from')->nullable(); // probation → official from this day
                $table->boolean('active')->default(true);
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('daily_entry_shifts')) {
            Schema::create('daily_entry_shifts', function (Blueprint $table) {
                $table->id();
                $table->foreignId('daily_entry_id')->constrained('daily_entries')->cascadeOnDelete();
                $table->foreignId('worker_id')->constrained('workers')->restrictOnDelete();
                $table->time('time_in');
                $table->time('time_out');
                $table->decimal('hours', 5, 2);
                $table->unsignedInteger('rate');            // đ/giờ at the time worked
                $table->unsignedInteger('kpi_bonus')->default(0);
                $table->unsignedInteger('allowance')->default(0);
                $table->string('note', 255)->nullable();
                $table->unsignedInteger('wage_total');      // hours × rate + kpi + allowance
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('daily_entry_shifts');
        Schema::dropIfExists('workers');
        if (Schema::hasColumn('stores', 'wage_probation')) {
            Schema::table('stores', fn (Blueprint $t) => $t->dropColumn(['wage_probation', 'wage_official']));
        }
    }
};
