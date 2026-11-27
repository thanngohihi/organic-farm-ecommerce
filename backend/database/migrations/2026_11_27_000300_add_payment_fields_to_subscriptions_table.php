<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            if (!Schema::hasColumn('subscriptions', 'subscription_code')) {
                $table->string('subscription_code', 50)->nullable()->unique()->after('customer_id');
            }
            if (!Schema::hasColumn('subscriptions', 'payment_method')) {
                $table->enum('payment_method', ['cod', 'momo'])->default('cod')->after('total_price');
            }
            if (!Schema::hasColumn('subscriptions', 'payment_status')) {
                $table->enum('payment_status', ['cho_thanh_toan', 'da_thanh_toan', 'that_bai'])
                    ->default('cho_thanh_toan')
                    ->after('payment_method');
            }
            if (!Schema::hasColumn('subscriptions', 'momo_trans_id')) {
                $table->string('momo_trans_id', 100)->nullable()->after('payment_status');
            }
        });
    }

    public function down(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $columns = ['momo_trans_id', 'payment_status', 'payment_method', 'subscription_code'];
            foreach ($columns as $column) {
                if (Schema::hasColumn('subscriptions', $column)) {
                    if ($column === 'subscription_code') {
                        $table->dropUnique(['subscription_code']);
                    }
                    $table->dropColumn($column);
                }
            }
        });
    }
};
