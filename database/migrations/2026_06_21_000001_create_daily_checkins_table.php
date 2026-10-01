<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('daily_checkins', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('customer_id');
            $table->date('checkin_date');
            $table->unsignedInteger('streak')->default(1);
            $table->unsignedInteger('points_awarded')->default(5);
            $table->timestamps();
            $table->unique(['customer_id', 'checkin_date']);
            $table->index('customer_id');
        });
    }
    public function down(): void { Schema::dropIfExists('daily_checkins'); }
};
