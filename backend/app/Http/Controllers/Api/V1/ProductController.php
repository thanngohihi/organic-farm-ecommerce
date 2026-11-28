<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Batch;
use App\Models\Category;
use App\Models\Product;
use App\Services\MediaUploadService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use RuntimeException;

class ProductController extends Controller
{
    public const ALLOWED_UNITS = [
        'kg',
        'gram',
        'hộp 250g',
        'hộp 500g',
        'bó',
        'túi 500g',
        'túi 1kg',
        'khay',
        'thùng',
        'trái',
        'quả',
        'củ',
        'nải',
        'chai',
    ];

    public function __construct(
        private readonly MediaUploadService $mediaUploadService
    ) {}

    /**
     * GET /api/v1/categories
     * Danh sách danh mục sản phẩm
     */
    public function categories()
    {
        $categories = Category::query()
            ->withCount('products')
            ->orderBy('name', 'asc')
            ->get();

        return response()->json([
            'status' => 'success',
            'data'   => $categories,
        ]);
    }

    /**
     * POST /api/v1/farm/categories
     * Farm Staff / Admin tạo danh mục mới
     */
    public function storeCategory(Request $request)
    {
        $validated = $request->validate([
            'name'        => ['required', 'string', 'max:150'],
            'description' => ['nullable', 'string'],
        ]);

        $name = trim($validated['name']);
        $slug = Str::slug($name) ?: ('cat-' . strtolower(Str::random(6)));

        $existing = Category::query()
            ->where('slug', $slug)
            ->orWhereRaw('LOWER(name) = ?', [mb_strtolower($name)])
            ->first();

        if ($existing) {
            return response()->json([
                'status'  => 'success',
                'message' => 'Danh mục đã tồn tại.',
                'data'    => $existing,
            ], 200);
        }

        $category = Category::query()->create([
            'name'        => $name,
            'slug'        => $slug,
            'description' => $validated['description'] ?? null,
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Tạo danh mục sản phẩm thành công.',
            'data'    => $category,
        ], 201);
    }

    /**
     * DELETE /api/v1/farm/categories/{id}
     * Farm Staff / Admin xóa danh mục nếu chưa có sản phẩm nào thuộc danh mục đó.
     */
    public function destroyCategory(int $id)
    {
        $category = Category::query()->withCount('products')->find($id);
        if (!$category) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Không tìm thấy danh mục cần xóa.',
            ], 404);
        }

        if (($category->products_count ?? 0) > 0) {
            return response()->json([
                'status'  => 'error',
                'message' => "Danh mục \"{$category->name}\" đang có {$category->products_count} sản phẩm nên không thể xóa.",
            ], 422);
        }

        $category->delete();

        return response()->json([
            'status'  => 'success',
            'message' => "Đã xóa danh mục \"{$category->name}\" thành công.",
        ], 200);
    }

    /**
     * GET /api/v1/products
     * Lấy danh sách sản phẩm kèm lô hàng FEFO
     */
    public function index()
    {
        Batch::syncExpiryStatuses();

        $products = DB::table('products')
            ->join('categories', 'products.category_id', '=', 'categories.id')
            ->select(
                'products.id',
                'products.category_id',
                'products.name',
                'products.slug',
                'products.sku',
                'products.unit',
                'products.base_price as price',
                'products.certification',
                'products.thumbnail_url as image',
                'products.thumbnail_url',
                'products.description',
                'categories.name as category_name'
            )
            ->where('products.is_active', true)
            ->orderBy('products.id', 'desc')
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
                $p->qr_code_url = $fefoBatch->qr_code_url ?? null;
                $p->stock = (float) $activeBatches->sum('current_quantity');
                $p->exp_date = $fefoBatch->expiry_date;
                $p->is_flash_sale = $isFlashSale;
                $p->discount_percent = $discountPercent;
                $p->sale_price = $salePrice;
            } else {
                $p->batch_id = null;
                $p->batch_code = 'N/A';
                $p->qr_code_url = null;
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

    /**
     * POST /api/v1/farm/products
     * Farm Staff / Admin tạo sản phẩm mới kèm hình ảnh
     */
    public function store(Request $request)
    {
        $request->merge([
            'unit' => trim((string) $request->input('unit', '')),
        ]);

        $validated = $request->validate([
            'name'          => ['required', 'string', 'max:200'],
            'category_id'   => ['nullable', 'integer', 'exists:categories,id'],
            'category_name' => ['nullable', 'string', 'max:150'],
            'sku'           => ['nullable', 'string', 'max:50'],
            'unit'          => ['required', 'string', Rule::in(self::ALLOWED_UNITS)],
            'base_price'    => ['required', 'numeric', 'min:0'],
            'certification' => ['nullable', 'string', 'max:100'],
            'description'   => ['nullable', 'string'],
            'thumbnail_url' => ['nullable', 'string', 'max:500'],
            'thumbnail'     => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:10240'],
            'image'         => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:10240'],
        ], [
            'unit.required' => 'Vui lòng chọn đơn vị tính hợp lệ.',
            'unit.in'       => 'Đơn vị tính không hợp lệ! Chỉ chấp nhận các đơn vị chuẩn nông sản (' . implode(', ', self::ALLOWED_UNITS) . ').',
        ]);

        if (empty($validated['category_id']) && empty(trim((string) ($validated['category_name'] ?? '')))) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Vui lòng chọn hoặc nhập danh mục sản phẩm.',
            ], 422);
        }

        if (!empty($validated['category_id'])) {
            $category = Category::findOrFail((int) $validated['category_id']);
        } else {
            $catName = trim((string) $validated['category_name']);
            $catSlug = Str::slug($catName) ?: ('cat-' . strtolower(Str::random(6)));
            $category = Category::query()
                ->where('slug', $catSlug)
                ->orWhereRaw('LOWER(name) = ?', [mb_strtolower($catName)])
                ->first();

            if (!$category) {
                $category = Category::query()->create([
                    'name' => $catName,
                    'slug' => $catSlug,
                ]);
            }
        }

        $name = trim($validated['name']);
        $baseSlug = Str::slug($name) ?: 'product';
        $slug = $baseSlug;
        if (Product::where('slug', $slug)->exists()) {
            $slug = "{$baseSlug}-" . strtolower(Str::random(4));
        }

        $sku = trim((string) ($validated['sku'] ?? ''));
        if ($sku === '' || Product::where('sku', $sku)->exists()) {
            $sku = 'PROD-' . strtoupper(Str::random(6));
        }

        $thumbnailUrl = trim((string) ($validated['thumbnail_url'] ?? '')) ?: null;
        $uploadedFile = $request->file('thumbnail') ?? $request->file('image');
        if ($uploadedFile) {
            $thumbnailUrl = $this->mediaUploadService->uploadMedia($uploadedFile, 'products');
        }

        $product = Product::query()->create([
            'category_id'   => $category->id,
            'name'          => $name,
            'slug'          => $slug,
            'sku'           => $sku,
            'unit'          => trim($validated['unit']),
            'base_price'    => (float) $validated['base_price'],
            'certification' => trim((string) ($validated['certification'] ?? '')) ?: null,
            'thumbnail_url' => $thumbnailUrl,
            'description'   => $validated['description'] ?? null,
            'is_active'     => true,
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Thêm sản phẩm thành công.',
            'data'    => [
                'id'            => $product->id,
                'category_id'   => $product->category_id,
                'category_name' => $category->name,
                'name'          => $product->name,
                'slug'          => $product->slug,
                'sku'           => $product->sku,
                'unit'          => $product->unit,
                'price'         => (float) $product->base_price,
                'base_price'    => (float) $product->base_price,
                'certification' => $product->certification,
                'image'         => $product->thumbnail_url,
                'thumbnail_url' => $product->thumbnail_url,
                'description'   => $product->description,
            ],
        ], 201);
    }

    /**
     * GET /api/v1/products/{id}/stock
     * Kiểm tra tồn kho FEFO thời gian thực trước khi thêm vào giỏ hàng / tăng số lượng.
     */
    public function checkStock(Request $request, int $id)
    {
        $product = Product::query()
            ->where('is_active', true)
            ->find($id);

        if (!$product) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Sản phẩm không tồn tại hoặc đã ngừng kinh doanh.',
            ], 404);
        }

        Batch::syncExpiryStatuses();

        $today = now()->toDateString();
        $activeBatches = DB::table('batches')
            ->where('product_id', $product->id)
            ->whereIn('status', ['con_hang', 'sap_het_han'])
            ->whereDate('expiry_date', '>=', $today)
            ->where('current_quantity', '>', 0)
            ->orderBy('expiry_date', 'asc')
            ->orderBy('id', 'asc')
            ->get();

        $allowsDecimal = Product::allowsDecimalQuantity($product->unit);
        $availableStock = round((float) $activeBatches->sum('current_quantity'), $allowsDecimal ? 2 : 0);

        try {
            $requestedQty = Product::validateQuantityForUnit(
                (float) $request->query('requested_quantity', 1),
                $product->unit,
                'Số lượng đặt mua'
            );
        } catch (RuntimeException $e) {
            return response()->json([
                'status'  => 'error',
                'message' => $e->getMessage(),
            ], 422);
        }

        $sufficient = $availableStock > 0 && $availableStock >= $requestedQty;
        $fefoBatch = $activeBatches->first();

        return response()->json([
            'status' => 'success',
            'data'   => [
                'product_id'              => $product->id,
                'product_name'            => $product->name,
                'unit'                    => $product->unit,
                'allows_decimal_quantity' => $allowsDecimal,
                'available_stock'         => $availableStock,
                'requested_quantity'      => $requestedQty,
                'sufficient'              => $sufficient,
                'fefo_batch_code'         => $fefoBatch?->batch_code,
                'expiry_date'             => $fefoBatch?->expiry_date,
            ],
        ], 200);
    }

    /**
     * DELETE /api/v1/admin/products/{id}
     * Admin xóa sản phẩm khỏi hệ thống (hoặc ẩn ngừng kinh doanh nếu đã phát sinh đơn hàng).
     */
    public function destroy(int $id)
    {
        $product = Product::query()->find($id);
        if (!$product) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Không tìm thấy sản phẩm cần xóa.',
            ], 404);
        }

        $productName = $product->name;

        $hasOrders = DB::table('order_items')
            ->where('product_id', $product->id)
            ->exists()
            || DB::table('order_items')
                ->join('batches', 'order_items.batch_id', '=', 'batches.id')
                ->where('batches.product_id', $product->id)
                ->exists();

        if ($hasOrders) {
            $product->update(['is_active' => false]);

            return response()->json([
                'status'  => 'success',
                'action'  => 'deactivated',
                'message' => "Sản phẩm \"{$productName}\" đã từng có trong đơn hàng nên đã được ngừng kinh doanh (ẩn khỏi cửa hàng & kho đang bán) để bảo toàn lịch sử hóa đơn.",
            ], 200);
        }

        DB::transaction(function () use ($product) {
            $product->delete();
        });

        return response()->json([
            'status'  => 'success',
            'action'  => 'deleted',
            'message' => "Đã xóa sản phẩm \"{$productName}\" khỏi hệ thống.",
        ], 200);
    }
}
