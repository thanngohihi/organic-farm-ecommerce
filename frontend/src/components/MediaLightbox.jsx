import React from 'react';
import { X } from 'lucide-react';

export function isVideoMediaUrl(url, mimeType = '') {
  if (mimeType && String(mimeType).toLowerCase().startsWith('video/')) {
    return true;
  }
  const clean = String(url || '').toLowerCase();
  return /(\.mp4|\.mov|\.webm|\.ogg)(\?|$)/i.test(clean) || clean.includes('/video/upload/');
}

export default function MediaLightbox({ media, onClose }) {
  if (!media?.url) return null;

  const isVideo = Boolean(media.isVideo) || isVideoMediaUrl(media.url, media.mimeType);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h4 className="truncate text-sm font-bold text-slate-800">
            {media.title || (isVideo ? 'Xem video thực tế' : 'Xem hình ảnh chi tiết')}
          </h4>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex max-h-[78vh] items-center justify-center bg-slate-950 p-4">
          {isVideo ? (
            <video
              src={media.url}
              controls
              autoPlay
              className="max-h-[70vh] max-w-full rounded-lg"
            />
          ) : (
            <img
              src={media.url}
              alt={media.title || 'Preview'}
              className="max-h-[70vh] max-w-full rounded-lg object-contain"
            />
          )}
        </div>
      </div>
    </div>
  );
}
