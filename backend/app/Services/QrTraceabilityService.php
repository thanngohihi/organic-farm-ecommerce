<?php

namespace App\Services;

use App\Models\Batch;
use Illuminate\Support\Facades\Storage;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class QrTraceabilityService
{
    public function generateBatchQr(Batch $batch, string $format = 'svg'): array
    {
        $format = in_array($format, ['svg', 'png'], true) ? $format : 'svg';
        $frontendUrl = rtrim((string) config('app.frontend_url', 'http://localhost:5173'), '/');
        $traceUrl = "{$frontendUrl}/trace/{$batch->batch_code}";

        $qrBuilder = QrCode::format($format)->size(300)->margin(1);
        if ($format === 'png') {
            $qrBuilder = $qrBuilder->errorCorrection('H');
        }

        $content = $qrBuilder->generate($traceUrl);
        $relativePath = "qrcodes/{$batch->batch_code}.{$format}";

        Storage::disk('public')->put($relativePath, $content);
        $qrUrl = asset("storage/{$relativePath}");

        $batch->update(['qr_code_url' => $qrUrl]);

        return [
            'batch_code' => $batch->batch_code,
            'trace_url'  => $traceUrl,
            'format'     => $format,
            'qr_url'     => $qrUrl,
            'file_path'  => storage_path("app/public/{$relativePath}"),
        ];
    }
}