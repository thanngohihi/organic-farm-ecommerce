<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('batches', function (Blueprint $table) {
            $table->id();
            $table->string('batch_code', 50)->unique();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignId('farm_staff_id')->constrained('users')->restrictOnDelete();
            $table->date('harvest_date');
            $table->date('expiry_date');
            $table->decimal('initial_quantity', 10, 2);
            $table->decimal('current_quantity', 10, 2);
            $table->decimal('wasted_quantity', 10, 2)->default(0);
            $table->boolean('is_flash_sale')->default(false);
            $table->unsignedInteger('discount_percent')->default(0);
            $table->string('qr_code_url', 500)->nullable();
            $table->enum('status', ['con_hang', 'sap_het_han', 'qua_han', 'het_hang'])->default('con_hang');
            $table->timestamps();

            // Đánh Index tối ưu cho thuật toán FEFO lúc truy vấn
            $table->index(['product_id', 'status', 'expiry_date', 'current_quantity'], 'idx_fefo');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('batches');
    }
};