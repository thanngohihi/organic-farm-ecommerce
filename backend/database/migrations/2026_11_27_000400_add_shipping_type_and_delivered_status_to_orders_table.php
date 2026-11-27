<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            if (!Schema::hasColumn('orders', 'shipping_type')) {
                $table->enum('shipping_type', ['binh_thuong', 'hoa_toc'])
                    ->default('binh_thuong')
                    ->after('distance_km');
            }
        });

        DB::statement(
            "ALTER TABLE orders MODIFY COLUMN order_status ENUM('cho_xac_nhan', 'da_xac_nhan', 'dang_giao_hang', 'da_giao_hang', 'hoan_thanh', 'da_huy', 'da_giao_bu') NOT NULL DEFAULT 'cho_xac_nhan'"
        );
    }

    public function down(): void
    {
        DB::statement(
            "UPDATE orders SET order_status = 'dang_giao_hang' WHERE order_status = 'da_giao_hang'"
        );

        DB::statement(
            "ALTER TABLE orders MODIFY COLUMN order_status ENUM('cho_xac_nhan', 'da_xac_nhan', 'dang_giao_hang', 'hoan_thanh', 'da_huy', 'da_giao_bu') NOT NULL DEFAULT 'cho_xac_nhan'"
        );

        Schema::table('orders', function (Blueprint $table) {
            if (Schema::hasColumn('orders', 'shipping_type')) {
                $table->dropColumn('shipping_type');
            }
        });
    }
};
