import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import {
  ClipboardList,
  ImagePlus,
  Send,
  Calendar,
  Loader2,
  X,
  Trash2,
  Play,
  ZoomIn,
} from 'lucide-react';
import { getAuthHeaders } from '../../services/api';
import Pagination from '../../components/Pagination';
import MediaLightbox, { isVideoMediaUrl } from '../../components/MediaLightbox';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';
const MAX_MEDIA_FILES = 5;
const ITEMS_PER_PAGE = 5;

const STAGE_OPTIONS = [
  { value: 'gieo_hat', label: 'Gieo hạt & Làm đất vi sinh' },
  { value: 'bon_phan', label: 'Bón phân hữu cơ' },
  { value: 'tuoi_tieu', label: 'Tưới nước & Bón phân hữu cơ' },
  { value: 'phong_tru_sau_benh', label: 'Kiểm tra sâu bệnh sinh học' },
  { value: 'kiem_dinh', label: 'Kiểm định mẫu đất/nước VietGAP' },
  { value: 'thu_hoach', label: 'Thu hoạch & Sơ chế đóng gói' },
];

export default function FarmingLogsPage() {
  const [batches, setBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [selectedStage, setSelectedStage] = useState('tuoi_tieu');
  const [actionTitle, setActionTitle] = useState('Tưới nước & Bón phân hữu cơ');
  const [note, setNote] = useState('');
  const [mediaItems, setMediaItems] = useState([]); // [{ id, file, url, isVideo, name }]
  const [previewMedia, setPreviewMedia] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingLogId, setDeletingLogId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const fileInputRef = useRef(null);
  const mediaUrlsRef = useRef([]);

  useEffect(() => {
    mediaUrlsRef.current = mediaItems.map((m) => m.url);
  }, [mediaItems]);

  useEffect(() => {
    return () => {
      mediaUrlsRef.current.forEach((url) => {
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const [batchRes, logRes] = await Promise.all([
        axios.get(`${API_URL}/farm/batches`, { headers }),
        axios.get(`${API_URL}/farm/farming-logs`, { headers }),
      ]);

      const batchList = Array.isArray(batchRes.data?.data) ? batchRes.data.data : [];
      const logList = Array.isArray(logRes.data?.data) ? logRes.data.data : [];

      setBatches(batchList);
      setLogs(logList);
      if (batchList.length > 0) {
        setSelectedBatchId((prev) => prev || String(batchList[0].id));
      }
    } catch (err) {
      console.error('Lỗi tải nhật ký canh tác:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleMediaFilesChange = (e) => {
    const selected = Array.from(e.target.files || []);
    e.target.value = '';
    if (selected.length === 0) return;

    const validFiles = selected.filter(
      (f) => f.type.startsWith('image/') || f.type.startsWith('video/')
    );
    if (validFiles.length !== selected.length) {
      alert('Chỉ hỗ trợ tệp hình ảnh (JPG, PNG, WEBP) hoặc video (MP4, MOV, WEBM)!');
    }
    if (validFiles.length === 0) return;

    setMediaItems((prev) => {
      const remaining = MAX_MEDIA_FILES - prev.length;
      if (remaining <= 0) {
        alert(`Mỗi nhật ký chỉ được đính kèm tối đa ${MAX_MEDIA_FILES} ảnh/video.`);
        return prev;
      }

      const toAdd = validFiles.slice(0, remaining).map((file, idx) => ({
        id: `${Date.now()}-${idx}-${file.name}`,
        file,
        url: URL.createObjectURL(file),
        isVideo: file.type.startsWith('video/'),
        name: file.name,
      }));

      if (validFiles.length > remaining) {
        alert(`Đã giữ ${remaining} tệp đầu tiên (tối đa ${MAX_MEDIA_FILES} tệp/lần).`);
      }
      return [...prev, ...toAdd];
    });
  };

  const handleRemoveMediaItem = (id) => {
    setMediaItems((prev) => {
      const target = prev.find((m) => m.id === id);
      if (target?.url && target.url.startsWith('blob:')) {
        URL.revokeObjectURL(target.url);
      }
      return prev.filter((m) => m.id !== id);
    });
  };

  const clearAllMediaItems = () => {
    mediaItems.forEach((m) => {
      if (m.url && m.url.startsWith('blob:')) {
        URL.revokeObjectURL(m.url);
      }
    });
    setMediaItems([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleStageSelect = (stageValue) => {
    setSelectedStage(stageValue);
    const matched = STAGE_OPTIONS.find((item) => item.value === stageValue);
    if (matched) setActionTitle(matched.label);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBatchId) {
      alert('Chưa có lô hàng nào! Vui lòng tạo lô hàng ở tab Khởi tạo Lô hàng trước.');
      return;
    }
    if (!note.trim()) {
      alert('Vui lòng nhập nội dung chi tiết công việc chăm sóc!');
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('batch_id', selectedBatchId);
      formData.append('stage', selectedStage);
      formData.append('title', actionTitle);
      formData.append('description', note.trim());

      mediaItems.forEach((item) => {
        formData.append('media_files[]', item.file);
      });

      await axios.post(`${API_URL}/farm/farming-logs`, formData, {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'multipart/form-data',
        },
      });

      setCurrentPage(1);
      setNote('');
      clearAllMediaItems();
      await loadData();
      alert('Đã cập nhật nhật ký canh tác lên hệ thống truy xuất QR!');
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        Object.values(err.response?.data?.errors || {})
          .flat()
          .join('\n') ||
        'Không thể lưu nhật ký canh tác.';
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLog = async (logId) => {
    if (!window.confirm('Bạn muốn xóa bản ghi nhật ký canh tác này?')) return;
    setDeletingLogId(logId);
    try {
      await axios.delete(`${API_URL}/farm/farming-logs/${logId}`, {
        headers: getAuthHeaders(),
      });
      await loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể xóa nhật ký canh tác.');
    } finally {
      setDeletingLogId(null);
    }
  };

  const sortedLogs = [...logs].sort((a, b) =>
    String(b.logged_at || b.created_at || '').localeCompare(
      String(a.logged_at || a.created_at || '')
    )
  );

  const totalPages = Math.max(1, Math.ceil(sortedLogs.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedLogs = sortedLogs.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <ClipboardList className="text-emerald-600" size={22} />
          <h2 className="text-xl font-bold text-slate-800">
            Cập nhật Nhật ký Canh tác
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Chọn Lô hàng áp dụng
              </label>
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                required
              >
                {batches.length === 0 ? (
                  <option value="">-- Chưa có lô hàng nào --</option>
                ) : (
                  batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.batch_code} - {b.product?.name || 'Nông sản'}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Giai đoạn / Hoạt động
              </label>
              <select
                value={selectedStage}
                onChange={(e) => handleStageSelect(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              >
                {STAGE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Ghi chú chi tiết kỹ thuật
            </label>
            <textarea
              rows="3"
              placeholder="Mô tả loại phân bón, lượng nước tưới, tình trạng sinh trưởng..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-xl border border-slate-300 p-3 text-sm focus:border-emerald-500 focus:outline-none"
              required
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={mediaItems.length >= MAX_MEDIA_FILES}
                className="inline-flex items-center gap-2 rounded-xl border border-dashed border-emerald-400 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
              >
                <ImagePlus size={18} />
                <span>
                  Đính kèm nhiều ảnh / video ({mediaItems.length}/{MAX_MEDIA_FILES})
                </span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/png,image/jpeg,image/webp,image/jpg,video/mp4,video/quicktime,video/webm"
                onChange={handleMediaFilesChange}
                className="hidden"
              />
            </div>

            <button
              type="submit"
              disabled={saving || batches.length === 0}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}{' '}
              Đăng nhật ký
            </button>
          </div>

          {mediaItems.length > 0 && (
            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>Nhấn vào ảnh hoặc video để xem chi tiết</span>
                <button
                  type="button"
                  onClick={clearAllMediaItems}
                  className="font-semibold text-rose-600 hover:underline"
                >
                  Xóa tất cả
                </button>
              </div>
              <div className="flex flex-wrap gap-3">
                {mediaItems.map((item) => (
                  <div
                    key={item.id}
                    className="group relative h-24 w-24 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewMedia({
                          url: item.url,
                          isVideo: item.isVideo,
                          title: item.name,
                        })
                      }
                      className="relative h-full w-full"
                      title="Nhấn để xem lớn"
                    >
                      {item.isVideo ? (
                        <>
                          <video
                            src={item.url}
                            muted
                            className="h-full w-full object-cover"
                          />
                          <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-white">
                            <Play size={22} fill="currentColor" />
                          </span>
                        </>
                      ) : (
                        <>
                          <img
                            src={item.url}
                            alt={item.name}
                            className="h-full w-full object-cover transition group-hover:scale-105"
                          />
                          <span className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover:opacity-100">
                            <ZoomIn size={18} className="text-white" />
                          </span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveMediaItem(item.id)}
                      className="absolute right-1 top-1 rounded-full bg-black/65 p-1 text-white hover:bg-rose-600"
                      title="Gỡ bỏ tệp này"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>
      </div>

      {/* LỊCH SỬ NHẬT KÝ + PHÂN TRANG */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-bold text-slate-800">
            Lịch sử Nhật ký đã ghi nhận ({sortedLogs.length} mục)
          </h3>
          <span className="text-xs text-slate-500">
            Thứ tự: Mới nhất → Cũ nhất
            {totalPages > 1 ? ` • Trang ${safePage} / ${totalPages}` : ''}
          </span>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Đang tải nhật ký canh tác...</p>
        ) : sortedLogs.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-500">
            Chưa có nhật ký canh tác nào được ghi nhận.
          </p>
        ) : (
          <div className="space-y-4">
            {paginatedLogs.map((log) => {
              const mediaUrls = Array.isArray(log.media_urls)
                ? log.media_urls.filter(Boolean)
                : [];

              return (
                <div
                  key={log.id}
                  className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-emerald-100 px-2.5 py-0.5 font-mono text-xs font-bold text-emerald-800">
                        {log.batch?.batch_code || `BATCH #${log.batch_id}`}
                      </span>
                      {log.batch?.product?.name && (
                        <span className="text-xs font-semibold text-slate-600">
                          {log.batch.product.name}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 text-xs font-semibold text-slate-600">
                        <Calendar size={14} className="text-emerald-600" />{' '}
                        {String(log.logged_at || log.created_at || '').slice(0, 10)}
                      </span>
                      <button
                        type="button"
                        disabled={deletingLogId === log.id}
                        onClick={() => handleDeleteLog(log.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                      >
                        <Trash2 size={12} /> Xóa
                      </button>
                    </div>
                  </div>

                  <h4 className="mt-2 font-bold text-slate-800">{log.title}</h4>
                  <p className="mt-1 text-sm text-slate-600">{log.description}</p>

                  {mediaUrls.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2.5">
                      {mediaUrls.map((url, idx) => {
                        const isVideo = isVideoMediaUrl(url);
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() =>
                              setPreviewMedia({
                                url,
                                isVideo,
                                title: `${log.title} (${idx + 1}/${mediaUrls.length})`,
                              })
                            }
                            className="group relative h-28 w-36 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                            title={isVideo ? 'Nhấn để phát video' : 'Nhấn để xem ảnh lớn'}
                          >
                            {isVideo ? (
                              <>
                                <video
                                  src={url}
                                  muted
                                  className="h-full w-full object-cover"
                                />
                                <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-white">
                                  <Play size={24} fill="currentColor" />
                                </span>
                              </>
                            ) : (
                              <>
                                <img
                                  src={url}
                                  alt={`${log.title} ${idx + 1}`}
                                  className="h-full w-full object-cover transition group-hover:scale-105"
                                />
                                <span className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 transition group-hover:opacity-100">
                                  <ZoomIn size={18} className="text-white" />
                                </span>
                              </>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <Pagination
          currentPage={safePage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>

      <MediaLightbox media={previewMedia} onClose={() => setPreviewMedia(null)} />
    </div>
  );
}
