<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_code', 50)->unique();
            $table->foreignId('customer_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('subscription_id')->nullable()->constrained('subscriptions')->nullOnDelete();
            $table->text('delivery_address');
            $table->decimal('distance_km', 8, 2);
            $table->decimal('subtotal', 12, 2);
            $table->decimal('shipping_fee', 12, 2);
            $table->decimal('loyalty_discount', 12, 2)->default(0);
            $table->decimal('total_amount', 12, 2);
            $table->enum('payment_method', ['cod', 'momo', 'vnpay'])->default('momo');
            $table->enum('payment_status', ['cho_thanh_toan', 'da_thanh_toan', 'that_bai', 'da_hoan_tien'])->default('cho_thanh_toan');
            $table->string('momo_trans_id', 100)->nullable();
            $table->enum('order_status', ['cho_xac_nhan', 'da_xac_nhan', 'dang_giao_hang', 'hoan_thanh', 'da_huy', 'da_giao_bu'])->default('cho_xac_nhan');
            $table->string('delivery_partner', 50)->nullable();
            $table->string('delivery_tracking_url', 500)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
