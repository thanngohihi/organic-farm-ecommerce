<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained('users')->cascadeOnDelete();
            $table->string('package_name', 150);
            $table->decimal('weight_per_delivery', 8, 2);
            $table->json('delivery_days');
            $table->text('delivery_address');
            $table->decimal('distance_km', 8, 2);
            $table->decimal('total_price', 12, 2);
            $table->date('start_date');
            $table->date('end_date');
            $table->enum('status', ['dang_hoat_dong', 'tam_dung', 'da_huy', 'het_han'])->default('dang_hoat_dong');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('subscriptions');
    }
};
