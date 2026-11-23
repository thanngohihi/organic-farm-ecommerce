<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('delivery_schedules', function (Blueprint $table) {
            $table->id();

            // Thuộc về gói định kỳ nào
            $table->foreignId('subscription_id')
                ->constrained('subscriptions')
                ->cascadeOnDelete();

            // Liên kết đơn hàng được Cron-job tạo ra (NULL khi chưa đến ngày)
            $table->foreignId('order_id')
                ->nullable()
                ->constrained('orders')
                ->nullOnDelete();

            // Ngày dự kiến giao hàng (cơ sở để Cron-job quét và sinh đơn)
            $table->date('delivery_date');

            // Trạng thái của từng lịch giao
            $table->enum('status', [
                'cho_tao_don',  // Chưa đến ngày giao
                'da_tao_don',   // Cron-job đã sinh đơn hàng thành công
                'da_giao',      // Đơn đã giao thành công cho khách
                'that_bai',     // Cron-job chạy nhưng không đủ hàng / lỗi
                'da_huy',       // Khách hoặc Admin hủy lịch giao này
            ])->default('cho_tao_don');

            $table->timestamps();

            // Index để Cron-job quét lịch giao theo ngày và trạng thái nhanh
            $table->index('delivery_date', 'idx_schedules_delivery_date');
            $table->index('status', 'idx_schedules_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('delivery_schedules');
    }
};
