<?php
namespace App\Services;
use CloudinaryLabs\CloudinaryLaravel\Facades\Cloudinary;
use Illuminate\Http\UploadedFile;
use Exception;

class CloudinaryService
{
    private const FOLDER_MAP = [
        'products'       => 'organic_farm/products',
        'certifications' => 'organic_farm/certifications', // Giấy VietGAP, USDA, mẫu đất/nước
        'farming_logs'   => 'organic_farm/farming_logs',   // Ảnh/video nhật ký canh tác
        'qr_codes'       => 'organic_farm/qr_codes',       // Ảnh mã QR lô hàng
        'complaints'     => 'organic_farm/complaints',     // Ảnh/video bằng chứng rau dập nát
        'waste_evidence' => 'organic_farm/waste_records',  // Ảnh ghi nhận xuất hủy nội bộ
    ];

    //Upload 1 file ảnh hoặc video lên Cloudinary
    public function uploadSingleFile(UploadedFile $file, string $module = 'products'): array
    {
        $folder = self::FOLDER_MAP[$module] ?? 'organic_farm/general';
        $mime   = $file->getMimeType();

        // Tự động nhận diện là video hay image để gọi Cloudinary API chuẩn xác
        $resourceType = str_starts_with($mime, 'video/') ? 'video' : 'image';

        $uploadedFile = Cloudinary::upload($file->getRealPath(), [
            'folder'        => $folder,
            'resource_type' => $resourceType,
            'quality'       => 'auto', // Tự động tối ưu dung lượng phục vụ Mobile-first
            'fetch_format'  => 'auto',
        ]);

        return [
            'url'           => $uploadedFile->getSecurePath(),
            'public_id'     => $uploadedFile->getPublicId(),
            'resource_type' => $resourceType,
            'format'        => $file->getClientOriginalExtension(),
        ];
    }

    //Upload nhiều file cùng lúc (trả về mảng URL để lưu thẳng vào cột JSON trong MySQL)
    public function uploadMultipleFiles(array $files, string $module = 'farming_logs'): array
    {
        $urls        = [];
        $filesDetail = [];

        foreach ($files as $file) {
            if ($file instanceof UploadedFile) {
                $result        = $this->uploadSingleFile($file, $module);
                $urls[]        = $result['url'];
                $filesDetail[] = $result;
            }
        }

        return [
            'urls'         => $urls,        // Dùng để insert thẳng vào cột JSON media_urls / evidence_media_urls
            'files_detail' => $filesDetail,
        ];
    }

    //Xóa file trên Cloudinary theo public_id khi xóa bài viết hoặc cập nhật ảnh mới
    public function deleteFile(string $publicId, string $resourceType = 'image'): bool
    {
        try {
            Cloudinary::destroy($publicId, ['resource_type' => $resourceType]);
            return true;
        } catch (Exception $e) {
            return false;
        }
    }
}