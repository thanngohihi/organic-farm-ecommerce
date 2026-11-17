<?php

namespace App\Http\Controllers;

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

        foreach ($products as $p) {
            $latestBatch = DB::table('batches')
                ->where('product_id', $p->id)
                ->where('status', 'con_hang')
                ->where('current_quantity', '>', 0)
                ->orderBy('expiry_date', 'asc')
                ->first();

            if ($latestBatch) {
                $p->batch_id = $latestBatch->id;
                $p->batch_code = $latestBatch->batch_code;
                $p->stock = (float) $latestBatch->current_quantity;
                $p->exp_date = $latestBatch->expiry_date;
            } else {
                $p->batch_id = null;
                $p->batch_code = 'N/A';
                $p->stock = 0;
                $p->exp_date = null;
            }
        }

        return response()->json([
            'status' => 'success',
            'data' => $products
        ]);
    }
}
