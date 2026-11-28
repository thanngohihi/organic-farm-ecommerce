<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Batch;
use App\Models\Product;
use App\Services\FefoWarehouseService;
use App\Services\QrTraceabilityService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use RuntimeException;

class BatchController extends Controller
{
    public function __construct(
        private readonly QrTraceabilityService $qrService,
        private readonly FefoWarehouseService $fefoService
    ) {}

    // GET /api/v1/farm/batches
    public function index(Request $request)
    {
        Batch::syncExpiryStatuses();

        $query = Batch::query()
            ->with(['product:id,category_id,name,sku,unit,base_price,thumbnail_url', 'product.category:id,name', 'farmStaff:id,full_name'])
            ->orderBy('expiry_date', 'asc')
            ->orderBy('id', 'desc');

        if ($request->filled('product_id')) {
            $query->where('product_id', (int) $request->query('product_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->query('status'));
        }

        return response()->json([
            'status' => 'success',
            'data'   => $query->get(),
        ]);
    }

    // POST /api/v1/farm/batches
    public function store(Request $request)
    {
        $today = now()->toDateString();

        $data = $request->validate([
            'product_id'       => ['required', 'integer', 'exists:products,id'],
            'harvest_date'     => ['required', 'date'],
            'expiry_date'      => ['required', 'date', "after:{$today}", 'after:harvest_date'],
            'initial_quantity' => ['required', 'numeric', 'min:0.01'],
            'qr_format'        => ['nullable', 'in:svg,png'],
        ], [
            'expiry_date.after' => 'Hạn sử dụng FEFO phải lớn hơn ngày hiện tại và lớn hơn ngày thu hoạch.',
        ]);

        $product = Product::query()->findOrFail($data['product_id']);
        try {
            $normalizedQty = Product::validateQuantityForUnit(
                (float) $data['initial_quantity'],
                $product->unit,
                'Số lượng nhập kho'
            );
        } catch (RuntimeException $e) {
            throw ValidationException::withMessages([
                'initial_quantity' => [$e->getMessage()],
            ]);
        }

        $data['initial_quantity'] = $normalizedQty;
        $initialExpiryState = Batch::resolveInitialStateForExpiry($data['expiry_date']);
        $batchCode = 'BATCH-' . now()->format('Ymd') . '-' . strtoupper(bin2hex(random_bytes(2)));

        $result = DB::transaction(function () use ($batchCode, $data, $request, $initialExpiryState) {
            $batch = Batch::query()->create([
                'batch_code'       => $batchCode,
                'product_id'       => $data['product_id'],
                'farm_staff_id'    => $request->user()->id,
                'harvest_date'     => $data['harvest_date'],
                'expiry_date'      => $data['expiry_date'],
                'initial_quantity' => $data['initial_quantity'],
                'current_quantity' => $data['initial_quantity'],
                'wasted_quantity'  => 0,
                'status'           => $initialExpiryState['status'],
                'is_flash_sale'    => $initialExpiryState['is_flash_sale'],
                'discount_percent' => $initialExpiryState['discount_percent'],
            ]);

            $qr = $this->qrService->generateBatchQr($batch, $data['qr_format'] ?? 'svg');

            return [
                'batch' => $batch->fresh(),
                'qr'    => $qr,
            ];
        });

        $message = $initialExpiryState['is_flash_sale']
            ? "Tạo lô hàng thành công! Do HSD trong vòng 3 ngày tới, lô được tự động bật Siêu Sale (-{$initialExpiryState['discount_percent']}%)."
            : 'Tạo lô hàng và sinh mã QR thành công';

        return response()->json([
            'status'  => 'success',
            'message' => $message,
            'data'    => $result['batch'],
            'qr'      => $result['qr'],
        ], 201);
    }

    // GET /api/v1/batches/qr/{id} (nhận batch_code hoặc batch id)
    public function showByQr(string $id)
    {
        $query = Batch::query()->with([
            'product.category:id,name',
            'farmStaff:id,full_name',
            'farmingLogs' => fn($q) => $q->with('staff:id,full_name')->orderBy('logged_at', 'asc'),
        ]);

        $batch = is_numeric($id)
            ? $query->find($id)
            : $query->where('batch_code', $id)->first();

        if (!$batch) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Không tìm thấy lô hàng truy xuất',
            ], 404);
        }

        $harvestDate = $batch->harvest_date instanceof \DateTimeInterface
            ? $batch->harvest_date->format('Y-m-d')
            : $batch->harvest_date;
        $expiryDate = $batch->expiry_date instanceof \DateTimeInterface
            ? $batch->expiry_date->format('Y-m-d')
            : $batch->expiry_date;

        return response()->json([
            'status' => 'success',
            'data'   => [
                'batch' => [
                    'id'                    => $batch->id,
                    'batch_code'            => $batch->batch_code,
                    'product_id'            => $batch->product_id,
                    'product_name'          => $batch->product?->name,
                    'category_name'         => $batch->product?->category?->name,
                    'certification'         => $batch->product?->certification,
                    'certification_doc_url' => $batch->product?->certification_doc_url,
                    'harvest_date'          => $harvestDate,
                    'expiry_date'           => $expiryDate,
                    'quantity'              => rtrim(rtrim((string) $batch->initial_quantity, '0'), '.') . ' ' . ($batch->product?->unit ?? 'kg'),
                    'initial_quantity'      => (float) $batch->initial_quantity,
                    'current_quantity'      => (float) $batch->current_quantity,
                    'farm_staff_name'       => $batch->farmStaff?->full_name,
                    'qr_code_url'           => $batch->qr_code_url,
                ],
                'farming_logs' => $batch->farmingLogs,
            ],
        ]);
    }

    // POST /api/v1/farm/batches/fefo-export
    public function fefoExport(Request $request)
    {
        $data = $request->validate([
            'product_id' => ['required', 'integer', 'exists:products,id'],
            'quantity'   => ['required', 'numeric', 'min:0.01'],
        ]);

        try {
            $result = $this->fefoService->exportByFefo((int) $data['product_id'], (float) $data['quantity']);

            return response()->json([
                'status'  => 'success',
                'message' => 'Xuất kho theo nguyên tắc FEFO thành công',
                'data'    => $result,
            ]);
        } catch (RuntimeException $e) {
            return response()->json([
                'status'  => 'error',
                'message' => $e->getMessage(),
            ], 422);
        }
    }

    // POST /api/v1/farm/batches/waste-record
    public function recordWaste(Request $request)
    {
        $data = $request->validate([
            'batch_id' => ['required', 'integer', 'exists:batches,id'],
            'quantity' => ['required', 'numeric', 'min:0.01'],
            'reason'   => ['required', 'string', 'max:255'],
            'evidence' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp', 'max:10240'],
        ]);

        try {
            $result = $this->fefoService->recordWaste(
                (int) $data['batch_id'],
                (int) $request->user()->id,
                (float) $data['quantity'],
                $data['reason'],
                $request->file('evidence')
            );

            return response()->json([
                'status'  => 'success',
                'message' => 'Ghi nhận xuất hủy hao hụt thành công',
                'data'    => $result,
            ], 201);
        } catch (RuntimeException $e) {
            return response()->json([
                'status'  => 'error',
                'message' => $e->getMessage(),
            ], 422);
        }
    }
}