import React, { useEffect, useState } from 'react';
import { ClipboardList, ImagePlus, Send, Calendar } from 'lucide-react';
import { fetchBatches, createFarmingLog } from '../../services/api';

export default function FarmingLogsPage() {
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState('');
  const [actionTitle, setActionTitle] = useState('Tưới nước & Bón phân hữu cơ');
  const [note, setNote] = useState('');
  const [mediaPreview, setMediaPreview] = useState('');

  const [logs, setLogs] = useState([
    {
      id: 1,
      batch_code: 'LOT-20261115-01',
      action: 'Gieo hạt giống hữu cơ F1',
      note: 'Sử dụng giá thể mùn dừa vi sinh, độ ẩm đạt 75%.',
      created_at: '01/10/2026',
      media: 'https://placehold.co/600x300?text=Nhat+Ky+Gieo+Hat',
    },
    {
      id: 2,
      batch_code: 'LOT-20261120-02',
      action: 'Kiểm tra sâu bệnh bằng bẫy sinh học',
      note: 'Không phát hiện sâu hại, cây sinh trưởng tốt.',
      created_at: '22/11/2026',
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
      // Tạo preview cục bộ (Khi nối Cloudinary sẽ upload file lấy URL thật)
      setMediaPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!note.trim()) {
      alert('Vui lòng nhập nội dung chi tiết công việc chăm sóc!');
      return;
    }

    const newLog = await createFarmingLog({
      batch_code: selectedBatch,
      action: actionTitle,
      note,
      media: mediaPreview,
    });

    setLogs([newLog, ...logs]);
    setNote('');
    setMediaPreview('');
    alert('Đã cập nhật nhật ký canh tác lên hệ thống truy xuất QR!');
  };

  return (
    <div className="space-y-6">
      {/* FORM ĐĂNG NHẬT KÝ */}
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
                <option value="Gieo hạt & Làm đất vi sinh">Gieo hạt & Làm đất vi sinh</option>
                <option value="Tưới nước & Bón phân hữu cơ">Tưới nước & Bón phân hữu cơ</option>
                <option value="Kiểm tra sâu bệnh sinh học">Kiểm tra sâu bệnh sinh học</option>
                <option value="Kiểm định mẫu đất/nước VietGAP">Kiểm định mẫu đất/nước VietGAP</option>
                <option value="Thu hoạch & Sơ chế đóng gói">Thu hoạch & Sơ chế đóng gói</option>
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

      {/* TIMELINE NHẬT KÝ ĐÃ ĐĂNG */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-bold text-slate-800">
          Lịch sử Nhật ký đã ghi nhận
        </h3>
        <div className="space-y-4">
          {logs.map((log) => (
            <div
              key={log.id}
              className="rounded-xl border border-slate-100 bg-slate-50 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-md bg-emerald-100 px-2.5 py-0.5 font-mono text-xs font-bold text-emerald-800">
                  {log.batch_code}
                </span>
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <Calendar size={14} /> {log.created_at}
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
      </div>
    </div>
  );
}