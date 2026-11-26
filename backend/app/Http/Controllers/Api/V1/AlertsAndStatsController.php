<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Batch;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AlertsAndStatsController extends Controller
{
    // GET /api/v1/alerts/near-expiry
    public function nearExpiryAlerts()
    {
        $today = now()->toDateString();
        $cutoff = now()->addDays(2)->toDateString();

        $batches = Batch::query()
            ->with('product:id,name,sku,unit,base_price,thumbnail_url')
            ->where('current_quantity', '>', 0)
            ->where(function ($q) use ($today, $cutoff) {
                $q->where('is_flash_sale', true)
                  ->orWhereBetween('expiry_date', [$today, $cutoff])
                  ->orWhereDate('expiry_date', '<', $today);
            })
            ->orderBy('expiry_date', 'asc')
            ->get()
            ->map(function (Batch $batch) {
                $daysRemaining = $batch->expiry_date
                    ? now()->startOfDay()->diffInDays($batch->expiry_date->startOfDay(), false)
                    : 0;
                $basePrice = (float) ($batch->product->base_price ?? 0);
                $salePrice = round($basePrice * (1 - ($batch->discount_percent / 100)), 0);

                return [
                    'batch_id'         => $batch->id,
                    'batch_code'       => $batch->batch_code,
                    'product_name'     => $batch->product->name ?? null,
                    'base_price'       => $basePrice,
                    'flash_sale_price' => $salePrice,
                    'discount_percent' => $batch->discount_percent,
                    'current_quantity' => (float) $batch->current_quantity,
                    'expiry_date'      => $batch->expiry_date?->toDateString(),
                    'days_remaining'   => $daysRemaining,
                    'alert_level'      => $daysRemaining < 0 ? 'expired' : ($daysRemaining <= 2 ? 'flash_sale' : 'normal'),
                    'status'           => $batch->status,
                    'is_flash_sale'    => (bool) $batch->is_flash_sale,
                ];
            });

        return response()->json([
            'status'       => 'success',
            'total_alerts' => $batches->count(),
            'data'         => $batches,
        ]);
    }

    // GET /api/v1/admin/dashboard-stats
    public function dashboardStats(Request $request)
    {
        $validated = $request->validate([
            'from_date' => ['nullable', 'date'],
            'to_date'   => ['nullable', 'date', 'after_or_equal:from_date'],
        ]);

        $from = $validated['from_date'] ?? now()->subDays(30)->toDateString();
        $to = $validated['to_date'] ?? now()->toDateString();

        $revenueByDay = Order::query()
            ->selectRaw('DATE(created_at) as date, COUNT(*) as orders_count, SUM(total_amount) as revenue')
            ->where('payment_status', 'da_thanh_toan')
            ->whereBetween('created_at', ["{$from} 00:00:00", "{$to} 23:59:59"])
            ->groupByRaw('DATE(created_at)')
            ->orderBy('date', 'asc')
            ->get();

        $batchTotals = Batch::query()
            ->selectRaw('COALESCE(SUM(initial_quantity), 0) as total_initial, COALESCE(SUM(wasted_quantity), 0) as total_wasted')
            ->first();

        $totalInitial = (float) ($batchTotals->total_initial ?? 0);
        $totalWasted = (float) ($batchTotals->total_wasted ?? 0);
        $wasteRate = $totalInitial > 0 ? round(($totalWasted / $totalInitial) * 100, 2) : 0.0;

        $customerCounts = Order::query()
            ->select('customer_id', DB::raw('COUNT(*) as total_orders'))
            ->whereIn('order_status', ['da_xac_nhan', 'dang_giao_hang', 'hoan_thanh', 'da_giao_bu'])
            ->groupBy('customer_id')
            ->get();

        $uniqueCustomers = $customerCounts->count();
        $repeatCustomers = $customerCounts->where('total_orders', '>=', 2)->count();
        $repeatRate = $uniqueCustomers > 0 ? round(($repeatCustomers / $uniqueCustomers) * 100, 2) : 0.0;

        return response()->json([
            'status' => 'success',
            'data'   => [
                'period'  => ['from' => $from, 'to' => $to],
                'summary' => [
                    'total_revenue'        => (float) $revenueByDay->sum('revenue'),
                    'total_paid_orders'    => (int) $revenueByDay->sum('orders_count'),
                    'total_initial_qty'    => $totalInitial,
                    'total_wasted_qty'     => $totalWasted,
                    'waste_rate_percent'   => $wasteRate,
                    'unique_customers'     => $uniqueCustomers,
                    'repeat_customers'     => $repeatCustomers,
                    'repeat_rate_percent'  => $repeatRate,
                ],
                'revenue_by_day' => $revenueByDay,
            ],
        ]);
    }
}