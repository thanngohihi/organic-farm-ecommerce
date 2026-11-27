<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('customer_vouchers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained('users')->cascadeOnDelete();
            $table->unsignedTinyInteger('voucher_template_id');
            $table->string('voucher_code', 30)->unique();
            $table->string('voucher_name', 150);
            $table->enum('voucher_type', ['free_ship', 'percent_discount', 'free_gift']);
            $table->unsignedInteger('points_cost');
            $table->decimal('discount_amount', 12, 2)->default(0);
            $table->foreignId('gift_product_id')->nullable()->constrained('products')->nullOnDelete();
            $table->foreignId('order_id')->nullable()->constrained('orders')->nullOnDelete();
            $table->enum('status', ['chua_dung', 'da_dung', 'het_han'])->default('chua_dung');
            $table->timestamp('used_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('customer_vouchers');
    }
};
