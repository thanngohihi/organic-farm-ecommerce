<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('farming_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('batch_id')->constrained('batches')->cascadeOnDelete();
            $table->foreignId('farm_staff_id')->constrained('users')->restrictOnDelete();
            $table->enum('stage', [
                'gieo_hat',
                'bon_phan',
                'tuoi_tieu',
                'phong_tru_sau_benh',
                'kiem_dinh',
                'thu_hoach',
            ]);
            $table->string('title', 255);
            $table->text('description');
            $table->json('media_urls')->nullable();
            $table->string('soil_water_test_url', 500)->nullable();
            $table->dateTime('logged_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('farming_logs');
    }
};
