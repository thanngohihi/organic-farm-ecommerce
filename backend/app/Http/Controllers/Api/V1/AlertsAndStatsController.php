<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Batch;
use App\Models\Order;
use App\Models\Product;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AlertsAndStatsController extends Controller
{
    /**
     * Đồng bộ nhanh các lô cận date (<= 2 ngày) sang sap_het_han + Flash Sale
     * và khóa các lô quá hạn (expiry_date < hôm nay).
     */
    private function syncNearExpiryFlags(): void
    {
        $today = now()->toDateString();
        $cutoff = now()->addDays(2)->toDateString();

        Batch::query()
            ->whereDate('expiry_date', '<', $today)
            ->where('current_quantity', '>', 0)
            ->where('status', '!=', 'qua_han')
            ->update([
                'status'           => 'qua_han',
                'is_flash_sale'    => false,
                'discount_percent' => 0,
            ]);

        Batch::query()
            ->whereDate('expiry_date', '>=', $today)
            ->whereDate('expiry_date', '<=', $cutoff)
            ->where('current_quantity', '>', 0)
            ->where('status', 'con_hang')
            ->update([
                'status'           => 'sap_het_han',
                'is_flash_sale'    => true,
                'discount_percent' => 30,
            ]);
    }

    // GET /api/v1/alerts/near-expiry
    public function nearExpiryAlerts()
    {
        $this->syncNearExpiryFlags();

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
                    'batch_id'           => $batch->id,
                    'batch_code'         => $batch->batch_code,
                    'product_name'       => $batch->product->name ?? null,
                    'unit'               => $batch->product->unit ?? 'kg',
                    'base_price'         => $basePrice,
                    'flash_sale_price'   => $salePrice,
                    'discount_percent'   => $batch->discount_percent,
                    'current_quantity'   => (float) $batch->current_quantity,
                    'remaining_quantity' => (float) $batch->current_quantity,
                    'expiry_date'        => $batch->expiry_date?->toDateString(),
                    'days_remaining'     => $daysRemaining,
                    'days_left'          => $daysRemaining,
                    'alert_level'        => $daysRemaining < 0 ? 'expired' : ($daysRemaining <= 2 ? 'flash_sale' : 'normal'),
                    'status'             => $batch->status,
                    'is_flash_sale'      => (bool) $batch->is_flash_sale,
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
        $this->syncNearExpiryFlags();

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

        $totalOrdersInPeriod = Order::query()
            ->where('order_status', '!=', 'da_huy')
            ->whereBetween('created_at', ["{$from} 00:00:00", "{$to} 23:59:59"])
            ->count();

        $batchTotals = Batch::query()
            ->selectRaw('COALESCE(SUM(initial_quantity), 0) as total_initial, COALESCE(SUM(wasted_quantity), 0) as total_wasted')
            ->first();

        $totalInitial = (float) ($batchTotals->total_initial ?? 0);
        $totalWasted = (float) ($batchTotals->total_wasted ?? 0);
        $wasteRate = $totalInitial > 0 ? round(($totalWasted / $totalInitial) * 100, 2) : 0.0;

        $customerCounts = Order::query()
            ->select('customer_id', DB::raw('COUNT(*) as total_orders'))
            ->whereIn('order_status', ['da_xac_nhan', 'dang_giao_hang', 'da_giao_hang', 'hoan_thanh', 'da_giao_bu'])
            ->groupBy('customer_id')
            ->get();

        $uniqueCustomers = $customerCounts->count();
        $repeatCustomers = $customerCounts->where('total_orders', '>=', 2)->count();
        $repeatRate = $uniqueCustomers > 0 ? round(($repeatCustomers / $uniqueCustomers) * 100, 2) : 0.0;

        // Biểu đồ 7 ngày gần nhất: kết hợp Doanh thu & Giá trị Hao hụt thực tế
        $chartStart = now()->subDays(6)->startOfDay();
        $chartEnd = now()->endOfDay();

        $dailyRevenueMap = Order::query()
            ->selectRaw('DATE(created_at) as date, COALESCE(SUM(total_amount), 0) as revenue')
            ->where('payment_status', 'da_thanh_toan')
            ->whereBetween('created_at', [$chartStart, $chartEnd])
            ->groupByRaw('DATE(created_at)')
            ->pluck('revenue', 'date');

        $dailyWasteMap = DB::table('waste_records')
            ->join('batches', 'waste_records.batch_id', '=', 'batches.id')
            ->join('products', 'batches.product_id', '=', 'products.id')
            ->selectRaw('DATE(waste_records.created_at) as date, COALESCE(SUM(waste_records.quantity * products.base_price), 0) as waste_value')
            ->whereBetween('waste_records.created_at', [$chartStart, $chartEnd])
            ->groupByRaw('DATE(waste_records.created_at)')
            ->pluck('waste_value', 'date');

        $dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        $revenueChart = [];
        for ($i = 6; $i >= 0; $i--) {
            $d = Carbon::now()->subDays($i);
            $iso = $d->toDateString();
            $revenueChart[] = [
                'date'    => $iso,
                'day'     => $dayNames[$d->dayOfWeek] . ' (' . $d->format('d/m') . ')',
                'revenue' => round((float) ($dailyRevenueMap[$iso] ?? 0), 0),
                'waste'   => round((float) ($dailyWasteMap[$iso] ?? 0), 0),
            ];
        }

        $totalRevenue = (float) $revenueByDay->sum('revenue');
        $totalPaidOrders = (int) $revenueByDay->sum('orders_count');

        return response()->json([
            'status' => 'success',
            'data'   => [
                'period'  => ['from' => $from, 'to' => $to],
                'summary' => [
                    'total_revenue'       => $totalRevenue,
                    'total_paid_orders'   => $totalPaidOrders,
                    'total_orders'        => $totalOrdersInPeriod,
                    'total_initial_qty'   => $totalInitial,
                    'total_wasted_qty'    => $totalWasted,
                    'waste_rate_percent'  => $wasteRate,
                    'unique_customers'    => $uniqueCustomers,
                    'repeat_customers'    => $repeatCustomers,
                    'repeat_rate_percent' => $repeatRate,
                ],
                'kpis' => [
                    'total_revenue'        => $totalRevenue,
                    'total_orders'         => $totalOrdersInPeriod,
                    'total_paid_orders'    => $totalPaidOrders,
                    'waste_rate_percent'   => $wasteRate,
                    'repeat_customer_rate' => $repeatRate,
                ],
                'revenue_by_day' => $revenueByDay,
                'revenue_chart'  => $revenueChart,
            ],
        ]);
    }

    /**
     * GET /api/v1/admin/inventory
     * Admin kiểm tra tồn kho từng sản phẩm và danh sách lô FEFO trong kho.
     */
    public function productInventory()
    {
        $this->syncNearExpiryFlags();
        $today = now()->toDateString();

        $products = Product::query()
            ->with([
                'category:id,name',
                'batches' => fn ($q) => $q->orderBy('expiry_date', 'asc')->orderBy('id', 'asc'),
            ])
            ->orderBy('name', 'asc')
            ->get();

        $inventory = $products->map(function (Product $product) use ($today) {
            $validBatches = $product->batches->filter(function (Batch $b) use ($today) {
                $exp = $b->expiry_date?->toDateString();
                return in_array($b->status, ['con_hang', 'sap_het_han'], true)
                    && (float) $b->current_quantity > 0
                    && (!$exp || $exp >= $today);
            });

            $availableStock = round((float) $validBatches->sum('current_quantity'), 2);
            $nearExpiryCount = $validBatches->where('status', 'sap_het_han')->count();
            $totalWasted = round((float) $product->batches->sum('wasted_quantity'), 2);
            $nearestBatch = $validBatches->first();

            $stockStatus = $availableStock <= 0
                ? 'het_hang'
                : ($availableStock <= 15 ? 'sap_het' : 'con_hang');

            return [
                'id'                      => $product->id,
                'name'                    => $product->name,
                'sku'                     => $product->sku,
                'unit'                    => $product->unit,
                'base_price'              => (float) $product->base_price,
                'thumbnail_url'           => $product->thumbnail_url,
                'category_name'           => $product->category?->name ?? 'Khác',
                'is_active'               => (bool) $product->is_active,
                'available_stock'         => $availableStock,
                'active_batches_count'    => $validBatches->count(),
                'near_expiry_batches'     => $nearExpiryCount,
                'total_wasted_qty'        => $totalWasted,
                'nearest_expiry_date'     => $nearestBatch?->expiry_date?->toDateString(),
                'nearest_batch_code'      => $nearestBatch?->batch_code,
                'stock_status'            => $stockStatus,
                'batches'                 => $product->batches->map(fn (Batch $b) => [
                    'id'               => $b->id,
                    'batch_code'       => $b->batch_code,
                    'initial_quantity' => (float) $b->initial_quantity,
                    'current_quantity' => (float) $b->current_quantity,
                    'wasted_quantity'  => (float) $b->wasted_quantity,
                    'harvest_date'     => $b->harvest_date?->toDateString(),
                    'expiry_date'      => $b->expiry_date?->toDateString(),
                    'status'           => $b->status,
                    'is_flash_sale'    => (bool) $b->is_flash_sale,
                    'discount_percent' => (int) $b->discount_percent,
                ])->values(),
            ];
        })->values();

        return response()->json([
            'status' => 'success',
            'data'   => [
                'summary' => [
                    'total_products'  => $inventory->count(),
                    'in_stock'        => $inventory->where('stock_status', 'con_hang')->count(),
                    'low_stock'       => $inventory->where('stock_status', 'sap_het')->count(),
                    'out_of_stock'    => $inventory->where('stock_status', 'het_hang')->count(),
                ],
                'products' => $inventory,
            ],
        ]);
    }
}
