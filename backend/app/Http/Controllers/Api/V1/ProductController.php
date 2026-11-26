<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProductController extends Controller
{
    /**
     * GET /api/v1/products
     * Lấy danh sách sản phẩm kèm lô hàng FEFO
     */
    public function index()
    {
        $products = DB::table('products')
            ->join('categories', 'products.category_id', '=', 'categories.id')
            ->select(
                'products.id',
                'products.name',
                'products.slug',
                'products.sku',
                'products.unit',
                'products.base_price as price',
                'products.certification',
                'products.thumbnail_url as image',
                'products.description',
                'categories.name as category_name'
            )
            ->where('products.is_active', true)
            ->get();

        $today = now()->toDateString();

        foreach ($products as $p) {
            $activeBatches = DB::table('batches')
                ->where('product_id', $p->id)
                ->whereIn('status', ['con_hang', 'sap_het_han'])
                ->whereDate('expiry_date', '>=', $today)
                ->where('current_quantity', '>', 0)
                ->orderBy('expiry_date', 'asc')
                ->orderBy('id', 'asc')
                ->get();

            $fefoBatch = $activeBatches->first();

            if ($fefoBatch) {
                $basePrice = (float) $p->price;
                $discountPercent = (int) ($fefoBatch->discount_percent ?? 0);
                $isFlashSale = (bool) ($fefoBatch->is_flash_sale ?? false);
                $salePrice = $isFlashSale && $discountPercent > 0
                    ? round($basePrice * (1 - ($discountPercent / 100)), 0)
                    : $basePrice;

                $p->batch_id = $fefoBatch->id;
                $p->batch_code = $fefoBatch->batch_code;
                $p->stock = (float) $activeBatches->sum('current_quantity');
                $p->exp_date = $fefoBatch->expiry_date;
                $p->is_flash_sale = $isFlashSale;
                $p->discount_percent = $discountPercent;
                $p->sale_price = $salePrice;
            } else {
                $p->batch_id = null;
                $p->batch_code = 'N/A';
                $p->stock = 0;
                $p->exp_date = null;
                $p->is_flash_sale = false;
                $p->discount_percent = 0;
                $p->sale_price = (float) $p->price;
            }
        }

        return response()->json([
            'status' => 'success',
            'data' => $products
        ]);
    }
}
