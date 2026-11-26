<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Batch;
use App\Services\FefoWarehouseService;
use App\Services\QrTraceabilityService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
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
        $query = Batch::query()
            ->with(['product:id,name,sku,unit,base_price', 'farmStaff:id,full_name'])
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
        $data = $request->validate([
            'product_id'       => ['required', 'integer', 'exists:products,id'],
            'harvest_date'     => ['required', 'date'],
            'expiry_date'      => ['required', 'date', 'after:harvest_date'],
            'initial_quantity' => ['required', 'numeric', 'min:0.01'],
            'qr_format'        => ['nullable', 'in:svg,png'],
        ]);

        $batchCode = 'BATCH-' . now()->format('Ymd') . '-' . strtoupper(bin2hex(random_bytes(2)));

        $result = DB::transaction(function () use ($batchCode, $data, $request) {
            $batch = Batch::query()->create([
                'batch_code'       => $batchCode,
                'product_id'       => $data['product_id'],
                'farm_staff_id'    => $request->user()->id,
                'harvest_date'     => $data['harvest_date'],
                'expiry_date'      => $data['expiry_date'],
                'initial_quantity' => $data['initial_quantity'],
                'current_quantity' => $data['initial_quantity'],
                'wasted_quantity'  => 0,
                'status'           => 'con_hang',
            ]);

            $qr = $this->qrService->generateBatchQr($batch, $data['qr_format'] ?? 'svg');

            return [
                'batch' => $batch->fresh(),
                'qr'    => $qr,
            ];
        });

        return response()->json([
            'status'  => 'success',
            'message' => 'Tạo lô hàng và sinh mã QR thành công',
            'data'    => $result['batch'],
            'qr'      => $result['qr'],
        ], 201);
    }

    // GET /api/v1/batches/qr/{id} (nhận batch_code hoặc batch id)
    public function showByQr(string $id)
    {
        $query = Batch::query()->with([
            'product',
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

        return response()->json([
            'status' => 'success',
            'data'   => $batch,
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