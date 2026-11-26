<?php

namespace App\Services;

use CloudinaryLabs\CloudinaryLaravel\Facades\Cloudinary;
use Illuminate\Http\UploadedFile;
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

        $path = $file->store("uploads/{$folder}", 'public');
        return asset("storage/{$path}");
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