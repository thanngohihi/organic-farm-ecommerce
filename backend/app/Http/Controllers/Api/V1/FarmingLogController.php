<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Batch;
use App\Models\FarmingLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class FarmingLogController extends Controller
{
    /**
     * Danh sách nhật ký canh tác cho Farm Staff / Admin (hỗ trợ lọc theo batch_id).
     */
    public function index(Request $request)
    {
        $query = FarmingLog::query()
            ->with(['batch:id,batch_code,product_id', 'batch.product:id,name', 'staff:id,full_name'])
            ->orderBy('logged_at', 'desc')
            ->orderBy('id', 'desc');

        if ($request->filled('batch_id')) {
            $query->where('batch_id', (int) $request->query('batch_id'));
        }

        return response()->json([
            'status' => 'success',
            'data'   => $query->get(),
        ]);
    }

    /**
     * Xem toàn bộ nhật ký canh tác của 1 lô (Dùng khi khách quét mã QR).
     */
    public function indexByBatch($batchId)
    {
        $batch = Batch::with([
            'product',
            'farmStaff:id,full_name',
            'farmingLogs' => fn($q) => $q->with('staff:id,full_name')->orderBy('logged_at', 'asc'),
        ])->find($batchId);

        if (!$batch) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Không tìm thấy lô hàng.',
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data'   => $batch,
        ]);
    }

    /**
     * Farm Staff thêm tiến độ nhật ký canh tác cho lô hàng.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'batch_id'            => ['required', 'integer', 'exists:batches,id'],
            'stage'               => ['nullable', 'string', 'in:gieo_hat,bon_phan,tuoi_tieu,phong_tru_sau_benh,kiem_dinh,thu_hoach'],
            'title'               => ['required', 'string', 'max:255'],
            'description'         => ['nullable', 'string'],
            'media_urls'          => ['nullable', 'array'],
            'media_urls.*'        => ['url'],
            'media_url'           => ['nullable', 'url'],
            'soil_water_test_url' => ['nullable', 'url'],
            'logged_at'           => ['nullable', 'date'],
            'activity_date'       => ['nullable', 'date'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $validated = $validator->validated();
        $mediaUrls = $validated['media_urls']
            ?? (!empty($validated['media_url']) ? [$validated['media_url']] : []);

        $log = FarmingLog::create([
            'batch_id'            => $validated['batch_id'],
            'farm_staff_id'       => $request->user()->id,
            'stage'               => $validated['stage'] ?? 'kiem_dinh',
            'title'               => $validated['title'],
            'description'         => $validated['description'] ?? null,
            'media_urls'          => $mediaUrls,
            'soil_water_test_url' => $validated['soil_water_test_url'] ?? null,
            'logged_at'           => $validated['logged_at'] ?? $validated['activity_date'] ?? now(),
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Đã cập nhật nhật ký canh tác thành công',
            'data'    => $log->load('staff:id,full_name'),
        ], 201);
    }

    /**
     * Xóa bản ghi nhật ký canh tác theo ID.
     */
    public function destroy($id)
    {
        $log = FarmingLog::find($id);
        if (!$log) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Không tìm thấy nhật ký canh tác.',
            ], 404);
        }

        $log->delete();

        return response()->json([
            'status'  => 'success',
            'message' => 'Đã xóa nhật ký canh tác thành công',
        ]);
    }
}