<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('email_blast_recipients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('email_blast_id')->constrained('email_blasts')->cascadeOnDelete();
            $table->unsignedBigInteger('customer_id')->nullable();
            $table->string('name', 150)->nullable();
            $table->string('email', 200);
            $table->string('status', 20)->default('pending'); // pending | sent | failed
            $table->string('error', 300)->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();

            $table->index(['email_blast_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('email_blast_recipients');
    }
};
