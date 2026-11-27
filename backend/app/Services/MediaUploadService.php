<?php

namespace App\Services;

use CloudinaryLabs\CloudinaryLaravel\Facades\Cloudinary;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use Throwable;

class MediaUploadService
{
    public function uploadMedia(UploadedFile $file, string $folder = 'organic_farm'): string
    {
        try {
            if (config('cloudinary.cloud_url')) {
                $uploaded = Cloudinary::upload($file->getRealPath(), [
                    'folder'         => $folder,
                    'resource_type'  => 'auto',
                    'quality'        => 'auto',
                    'fetch_format'   => 'auto',
                ]);

                if ($uploaded && method_exists($uploaded, 'getSecurePath')) {
                    return $uploaded->getSecurePath();
                }
            }
        } catch (Throwable $e) {
            report($e);
        }

        // Lưu trực tiếp vào public/uploads nếu chưa có storage symlink trên local
        if (is_dir(public_path('storage'))) {
            $path = $file->store("uploads/{$folder}", 'public');
            return asset("storage/{$path}");
        }

        $safeFolder = trim(preg_replace('/[^a-zA-Z0-9_\/-]/', '', $folder), '/');
        $targetDir = public_path("uploads/{$safeFolder}");
        if (!is_dir($targetDir)) {
            mkdir($targetDir, 0755, true);
        }

        $extension = $file->getClientOriginalExtension() ?: 'bin';
        $filename = Str::uuid()->toString() . '.' . strtolower($extension);
        $file->move($targetDir, $filename);

        return url("uploads/{$safeFolder}/{$filename}");
    }

    /**
     * @param UploadedFile[] $files
     * @return string[]
     */
    public function uploadMultiple(array $files, string $folder = 'organic_farm'): array
    {
        $urls = [];
        foreach ($files as $file) {
            if ($file instanceof UploadedFile) {
                $urls[] = $this->uploadMedia($file, $folder);
            }
        }
        return $urls;
    }
}