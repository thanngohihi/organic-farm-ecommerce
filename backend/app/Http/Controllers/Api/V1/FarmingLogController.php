<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\FarmingLog;
use App\Models\Batch;
use Illuminate\Support\Facades\Validator;

class FarmingLogController extends Controller
{
    /**
     * Xem toàn bộ nhật ký canh tác của 1 lô (Dùng khi khách quét mã QR).
     */
    public function indexByBatch($batchId)
    {
        $batch = Batch::with(['product', 'farmingLogs.staff:id,name'])->findOrFail($batchId);

        return response()->json([
            'status' => 'success',
            'data' => $batch
        ]);
    }

    /**
     * Farm Staff thêm tiến độ nhật ký canh tác cho lô hàng.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'batch_id' => 'required|exists:batches,id',
            'activity_date' => 'required|date',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'media_url' => 'nullable|url',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors()
            ], 422);
        }

        $log = FarmingLog::create([
            'batch_id' => $request->batch_id,
            'staff_id' => $request->user()->id,
            'activity_date' => $request->activity_date,
            'title' => $request->title,
            'description' => $request->description,
            'media_url' => $request->media_url,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Đã cập nhật nhật ký canh tác thành công',
            'data' => $log
        ], 201);
    }
}
