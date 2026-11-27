<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Batch;
use App\Models\FarmingLog;
use App\Services\MediaUploadService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class FarmingLogController extends Controller
{
    public function __construct(
        private readonly MediaUploadService $mediaUploadService
    ) {}
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
            'batch_id'            => ['nullable', 'integer', 'exists:batches,id'],
            'batch_code'          => ['nullable', 'string', 'exists:batches,batch_code'],
            'stage'               => ['nullable', 'string', 'in:gieo_hat,bon_phan,tuoi_tieu,phong_tru_sau_benh,kiem_dinh,thu_hoach'],
            'title'               => ['required', 'string', 'max:255'],
            'description'         => ['nullable', 'string'],
            'media_urls'          => ['nullable', 'array'],
            'media_urls.*'        => ['url'],
            'media_url'           => ['nullable', 'url'],
            'media'               => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,mp4,mov,webm,pdf', 'max:20480'],
            'media_files'         => ['nullable', 'array', 'max:5'],
            'media_files.*'       => ['file', 'mimes:jpg,jpeg,png,webp,mp4,mov,webm', 'max:20480'],
            'soil_water_test_url' => ['nullable', 'url'],
            'soil_water_test'     => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png,webp', 'max:10240'],
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
        $batchId = $validated['batch_id'] ?? null;
        if (!$batchId && !empty($validated['batch_code'])) {
            $batchId = Batch::where('batch_code', $validated['batch_code'])->value('id');
        }

        if (!$batchId) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Vui lòng chọn lô hàng áp dụng.',
            ], 422);
        }

        $mediaUrls = $validated['media_urls']
            ?? (!empty($validated['media_url']) ? [$validated['media_url']] : []);

        if ($request->hasFile('media')) {
            $mediaUrls[] = $this->mediaUploadService->uploadMedia($request->file('media'), 'farming_logs');
        }

        if ($request->hasFile('media_files')) {
            $uploadedMulti = $this->mediaUploadService->uploadMultiple(
                $request->file('media_files'),
                'farming_logs'
            );
            $mediaUrls = array_values(array_merge($mediaUrls, $uploadedMulti));
        }

        $soilWaterTestUrl = $validated['soil_water_test_url'] ?? null;
        if ($request->hasFile('soil_water_test')) {
            $soilWaterTestUrl = $this->mediaUploadService->uploadMedia($request->file('soil_water_test'), 'certifications');
        }

        $log = FarmingLog::create([
            'batch_id'            => $batchId,
            'farm_staff_id'       => $request->user()->id,
            'stage'               => $validated['stage'] ?? 'kiem_dinh',
            'title'               => $validated['title'],
            'description'         => $validated['description'] ?? null,
            'media_urls'          => $mediaUrls,
            'soil_water_test_url' => $soilWaterTestUrl,
            'logged_at'           => $validated['logged_at'] ?? $validated['activity_date'] ?? now(),
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Đã cập nhật nhật ký canh tác thành công',
            'data'    => $log->load(['batch:id,batch_code,product_id', 'batch.product:id,name', 'staff:id,full_name']),
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