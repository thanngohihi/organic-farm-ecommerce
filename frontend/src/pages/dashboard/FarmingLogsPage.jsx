import React, { useEffect, useState } from 'react';
import {
  ClipboardList,
  ImagePlus,
  Send,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { fetchBatches, createFarmingLog } from '../../services/api';

export default function FarmingLogsPage() {
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [actionTitle, setActionTitle] = useState('Tưới nước & Bón phân hữu cơ');
  const [note, setNote] = useState('');
  const [mediaPreview, setMediaPreview] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  const [logs, setLogs] = useState([
    {
      id: 6,
      batch_code: 'LOT-20261124-03',
      action: 'Thu hoạch & Đóng gói sơ chế',
      note: 'Thu hoạch dâu tây lúc 5h30 sáng, đóng hộp bảo quản lạnh 8°C.',
      isoDate: '2026-11-26',
      created_at: '26/11/2026',
      media: '',
    },
    {
      id: 5,
      batch_code: 'LOT-20261120-02',
      action: 'Kiểm tra sâu bệnh sinh học',
      note: 'Không phát hiện sâu hại, lá cải xanh đều màu.',
      isoDate: '2026-11-24',
      created_at: '24/11/2026',
      media: '',
    },
    {
      id: 4,
      batch_code: 'LOT-20261120-02',
      action: 'Tưới nước & Bón phân trùn quế',
      note: 'Bổ sung dinh dưỡng hữu cơ đợt 2 cho luống cải Kale.',
      isoDate: '2026-11-20',
      created_at: '20/11/2026',
      media: '',
    },
    {
      id: 3,
      batch_code: 'LOT-20261115-01',
      action: 'Kiểm định mẫu đất/nước VietGAP',
      note: 'Kết quả kiểm tra dư lượng nitrat đạt chuẩn an toàn.',
      isoDate: '2026-11-15',
      created_at: '15/11/2026',
      media: '',
    },
    {
      id: 2,
      batch_code: 'LOT-20261115-01',
      action: 'Tưới nhỏ giọt tự động',
      note: 'Duy trì độ ẩm đất 75% bằng nước giếng khoan đã lọc.',
      isoDate: '2026-11-02',
      created_at: '02/11/2026',
      media: '',
    },
    {
      id: 1,
      batch_code: 'LOT-20261115-01',
      action: 'Gieo hạt giống hữu cơ F1',
      note: 'Sử dụng giá thể mùn dừa vi sinh, tỷ lệ nảy mầm 96%.',
      isoDate: '2026-10-01',
      created_at: '01/10/2026',
      media: '',
    },
  ]);

  useEffect(() => {
    fetchBatches().then((data) => {
      setBatches(data);
      if (data.length > 0) setSelectedBatch(data[0].batch_code);
    });
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!note.trim()) {
      alert('Vui lòng nhập nội dung chi tiết công việc chăm sóc!');
      return;
    }

    const todayIso = new Date().toISOString().slice(0, 10);
    const newLog = await createFarmingLog({
      batch_code: selectedBatch,
      action: actionTitle,
      note,
      isoDate: todayIso,
      media: mediaPreview,
    });

    setLogs((prev) => [newLog, ...prev]);
    setCurrentPage(1);
    setNote('');
    setMediaPreview('');
    alert('Đã cập nhật nhật ký canh tác lên hệ thống truy xuất QR!');
  };

  // Sắp xếp ngày mới nhất lên đầu
  const sortedLogs = [...logs].sort((a, b) =>
    (b.isoDate || '').localeCompare(a.isoDate || '')
  );

  // Phân trang tối đa 5 mục / trang
  const totalPages = Math.max(1, Math.ceil(sortedLogs.length / ITEMS_PER_PAGE));
  const paginatedLogs = sortedLogs.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
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
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              >
                {batches.map((b) => (
                  <option key={b.id} value={b.batch_code}>
                    {b.batch_code} - {b.product_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600">
                Giai đoạn / Hoạt động
              </label>
              <select
                value={actionTitle}
                onChange={(e) => setActionTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
              >
                <option value="Gieo hạt & Làm đất vi sinh">
                  Gieo hạt & Làm đất vi sinh
                </option>
                <option value="Tưới nước & Bón phân hữu cơ">
                  Tưới nước & Bón phân hữu cơ
                </option>
                <option value="Kiểm tra sâu bệnh sinh học">
                  Kiểm tra sâu bệnh sinh học
                </option>
                <option value="Kiểm định mẫu đất/nước VietGAP">
                  Kiểm định mẫu đất/nước VietGAP
                </option>
                <option value="Thu hoạch & Sơ chế đóng gói">
                  Thu hoạch & Sơ chế đóng gói
                </option>
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
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-emerald-400 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100">
              <ImagePlus size={18} />
              <span>Đính kèm ảnh / video thực tế</span>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </label>

            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              <Send size={16} /> Đăng nhật ký
            </button>
          </div>

          {mediaPreview && (
            <div className="mt-2">
              <img
                src={mediaPreview}
                alt="Preview"
                className="h-32 rounded-xl border border-slate-200 object-cover"
              />
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
          </span>
        </div>

        <div className="space-y-4">
          {paginatedLogs.map((log) => (
            <div
              key={log.id}
              className="rounded-xl border border-slate-100 bg-slate-50 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-md bg-emerald-100 px-2.5 py-0.5 font-mono text-xs font-bold text-emerald-800">
                  {log.batch_code}
                </span>
                <span className="flex items-center gap-1 text-xs font-semibold text-slate-600">
                  <Calendar size={14} className="text-emerald-600" /> {log.created_at}
                </span>
              </div>
              <h4 className="mt-2 font-bold text-slate-800">{log.action}</h4>
              <p className="mt-1 text-sm text-slate-600">{log.note}</p>
              {log.media && (
                <img
                  src={log.media}
                  alt={log.action}
                  className="mt-3 max-h-48 rounded-lg object-cover"
                />
              )}
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
            <span className="text-xs text-slate-500">
              Trang <strong>{currentPage}</strong> / {totalPages}
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                <ChevronLeft size={14} /> Trước
              </button>

              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map(
                (pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`h-8 w-8 rounded-lg text-xs font-bold transition ${
                      currentPage === pageNum
                        ? 'bg-emerald-600 text-white'
                        : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              )}

              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                Sau <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}