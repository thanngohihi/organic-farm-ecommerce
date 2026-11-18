<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('complaints', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->foreignId('customer_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('handled_by_sales_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('reason');
            $table->json('evidence_media_urls');
            $table->enum('resolution_type', ['cho_xu_ly', 'hoan_tien', 'giao_bu_hang', 'tu_choi'])->default('cho_xu_ly');
            $table->decimal('refund_amount', 12, 2)->default(0);
            $table->unsignedBigInteger('compensation_order_id')->nullable();
            $table->text('sales_note')->nullable();
            $table->enum('status', ['cho_tiep_nhan', 'dang_xu_ly', 'da_hoan_tat', 'tu_choi'])->default('cho_tiep_nhan');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('complaints');
    }
};
