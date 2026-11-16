<?php
namespace App\Http\Controllers\Api\V1;
use App\Http\Controllers\Controller;
use App\Services\CloudinaryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MediaUploadController
{
    protected CloudinaryService $cloudinaryService;

    public function __construct(CloudinaryService $cloudinaryService)
    {
        $this->cloudinaryService = $cloudinaryService;
    }

    //API Upload 1 hoặc nhiều ảnh/video lên Cloudinary
    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'files'   => ['required', 'array', 'min:1', 'max:5'],
            'files.*' => ['required', 'file', 'mimes:jpg,jpeg,png,webp,pdf,mp4,mov', 'max:51200'], // Tối đa 50MB cho video
            'module'  => ['required', 'string', 'in:products,certifications,farming_logs,qr_codes,complaints,waste_evidence'],
        ]);

        $module = $request->input('module');
        $files  = $request->file('files');

        $result = $this->cloudinaryService->uploadMultipleFiles($files, $module);

        return response()->json([
            'status'  => 'success',
            'message' => 'Tải lên Cloudinary thành công ' . count($result['urls']) . ' tệp tin.',
            'data'    => [
                'module'       => $module,
                'urls'         => $result['urls'],
                'files_detail' => $result['files_detail'],
            ],
        ], 200);
    }
}