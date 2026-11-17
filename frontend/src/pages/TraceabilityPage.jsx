
import React, { useState, useEffect } from 'react';
import {
  QrCode,
  Calendar,
  UserCheck,
  ShieldCheck,
  CheckCircle2,
  Search,
  FileText,
  Image as ImageIcon
} from 'lucide-react';
import axios from 'axios';

// ==============================
// NHÃN CÁC GIAI ĐOẠN CANH TÁC
// ==============================
const STAGE_LABELS = {
  gieo_hat: {
    label: 'Gieo Hạt Giống',
    color: 'bg-blue-600'
  },
  bon_phan: {
    label: 'Bón Phân Vi Sinh',
    color: 'bg-amber-600'
  },
  tuoi_tieu: {
    label: 'Tưới Nước Định Kỳ',
    color: 'bg-cyan-600'
  },
  phong_tru_sau_benh: {
    label: 'Phòng Trừ Sâu Bệnh',
    color: 'bg-purple-600'
  },
  kiem_dinh: {
    label: 'Kiểm Định Chất Lượng',
    color: 'bg-indigo-600'
  },
  thu_hoach: {
    label: 'Thu Hoạch & Đóng Gói',
    color: 'bg-emerald-600'
  }
};

// ==============================
// DỮ LIỆU MOCK
// ==============================
const MOCK_TRACE_DATA = {
  batch: {
    batch_code: 'BATCH-CC-20261110',
    product_name: 'Cà Chua Cherry Hữu Cơ VietGAP',
    harvest_date: '10/11/2026',
    expiry_date: '17/11/2026',
    farm_staff_name: 'Kỹ sư Nguyễn Văn Nông',
    certification: 'VietGAP - Số 998/2026/BNN',
    certification_doc_url: ''
  },

  farming_logs: [
    {
      id: 1,
      stage: 'gieo_hat',
      title: 'Gieo hạt giống hữu cơ F1',
      description:
        'Sử dụng giá thể mùn dừa vi sinh đã qua xử lý nấm bệnh.',
      logged_at: '01/10/2026',
      media_urls: []
    },
    {
      id: 2,
      stage: 'bon_phan',
      title: 'Bón phân trùn quế và tưới nước vi sinh',
      description:
        'Sử dụng nguồn nước giếng khoan kiểm định định kỳ đạt tiêu chuẩn QCVN.',
      logged_at: '15/10/2026',
      media_urls: []
    },
    {
      id: 3,
      stage: 'thu_hoach',
      title: 'Thu hoạch sáng sớm & Đóng gói FEFO',
      description:
        'Thu hoạch lúc 5h30 sáng, phân loại và đóng gói bảo quản nhiệt độ 10°C.',
      logged_at: '10/11/2026',
      media_urls: []
    }
  ]
};

// ==============================
// COMPONENT TRUY XUẤT NGUỒN GỐC
// ==============================
export default function TraceabilityPage({ initialBatchCode }) {

  const [batchInput, setBatchInput] = useState(
    initialBatchCode || 'BATCH-CC-20261110'
  );

  const [loading, setLoading] = useState(false);

  const [traceData, setTraceData] = useState(MOCK_TRACE_DATA);

  // ==============================
  // TRA CỨU MÃ LÔ
  // ==============================
  const handleSearch = async (e) => {
    if (e) e.preventDefault();

    if (!batchInput.trim()) {
      alert('Vui lòng nhập mã lô sản phẩm!');
      return;
    }

    setLoading(true);

    try {
      const res = await axios.get(
        `http://localhost:8000/api/v1/batches/qr/${encodeURIComponent(batchInput.trim())}`
      );

      setTraceData(res.data.data);

    } catch (error) {
      console.log(
        'Đang hiển thị dữ liệu Mock:',
        error.message
      );

      setTraceData({
        ...MOCK_TRACE_DATA,
        batch: {
          ...MOCK_TRACE_DATA.batch,
          batch_code: batchInput.trim()
        }
      });

    } finally {
      setLoading(false);
    }
  };

  // ==============================
  // NHẬN MÃ LÔ TỪ TRANG KHÁC
  // ==============================
  useEffect(() => {
    if (initialBatchCode) {
      setBatchInput(initialBatchCode);
    }
  }, [initialBatchCode]);

  // ==============================
  // GIAO DIỆN
  // ==============================
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">

      <div className="max-w-5xl mx-auto">

        {/* TIÊU ĐỀ */}
        <div className="text-center mb-10">

          <div className="flex justify-center mb-4">
            <div className="bg-green-100 p-4 rounded-full">
              <QrCode className="w-10 h-10 text-green-700" />
            </div>
          </div>

          <h1 className="text-3xl font-bold text-green-800 mb-3">
            Truy Xuất Nguồn Gốc Sản Phẩm
          </h1>

          <p className="text-gray-600">
            Nhập mã lô hoặc quét mã QR in trên bao bì sản phẩm
            để xem nhật ký canh tác.
          </p>

        </div>

        {/* Ô TRA CỨU */}
        <form
          onSubmit={handleSearch}
          className="bg-white rounded-2xl shadow-md p-6 mb-8"
        >

          <label className="block font-semibold text-gray-700 mb-3">
            Mã lô sản phẩm
          </label>

          <div className="flex flex-col sm:flex-row gap-3">

            <input
              type="text"
              value={batchInput}
              onChange={(e) => setBatchInput(e.target.value)}
              placeholder="Ví dụ: BATCH-CC-20261110"
              className="flex-1 border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-green-500"
            />

            <button
              type="submit"
              disabled={loading}
              className="bg-green-700 hover:bg-green-800 text-white px-6 py-3 rounded-xl font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Search className="w-5 h-5" />
              {loading ? 'Đang tra cứu...' : 'Tra cứu'}
            </button>

          </div>
        </form>

        {/* KẾT QUẢ */}
        {traceData && (
          <div className="space-y-8">

            {/* THÔNG TIN LÔ */}
            <div className="bg-white rounded-2xl shadow-md p-6">

              <div className="flex items-center gap-2 mb-5">
                <ShieldCheck className="w-6 h-6 text-green-700" />

                <h2 className="text-xl font-bold text-gray-800">
                  Thông Tin Lô Thu Hoạch
                </h2>
              </div>

              <h3 className="text-2xl font-bold text-green-800 mb-3">
                {traceData.batch?.product_name}
              </h3>

              <p className="text-gray-600 mb-5">
                Mã lô:
                <span className="font-bold text-gray-800 ml-2">
                  {traceData.batch?.batch_code}
                </span>
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div className="flex items-center gap-3">
                  <Calendar className="text-green-700" />
                  <div>
                    <p className="text-sm text-gray-500">
                      Ngày thu hoạch
                    </p>
                    <p className="font-semibold">
                      {traceData.batch?.harvest_date || 'Chưa cập nhật'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="text-green-700" />
                  <div>
                    <p className="text-sm text-gray-500">
                      Hạn sử dụng
                    </p>
                    <p className="font-semibold">
                      {traceData.batch?.expiry_date || 'Chưa cập nhật'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <UserCheck className="text-green-700" />
                  <div>
                    <p className="text-sm text-gray-500">
                      Nhân viên phụ trách
                    </p>
                    <p className="font-semibold">
                      {traceData.batch?.farm_staff_name || 'Chưa cập nhật'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <CheckCircle2 className="text-green-700" />
                  <div>
                    <p className="text-sm text-gray-500">
                      Chứng nhận
                    </p>
                    <p className="font-semibold">
                      {traceData.batch?.certification || 'Chưa cập nhật'}
                    </p>
                  </div>
                </div>

              </div>

              {traceData.batch?.certification_doc_url && (
                <a
                  href={traceData.batch.certification_doc_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-5 text-green-700 hover:underline"
                >
                  <FileText className="w-5 h-5" />
                  Xem giấy chứng nhận
                </a>
              )}

            </div>

            {/* TIMELINE CANH TÁC */}
            <div className="bg-white rounded-2xl shadow-md p-6">

              <h2 className="text-xl font-bold text-gray-800 mb-8">
                Nhật Ký Quá Trình Canh Tác
              </h2>

              {traceData.farming_logs?.length > 0 ? (
                <div className="space-y-8">

                  {traceData.farming_logs.map((log) => {

                    const stageInfo =
                      STAGE_LABELS[log.stage] || {
                        label: log.stage,
                        color: 'bg-emerald-600'
                      };

                    return (
                      <div
                        key={log.id}
                        className="relative border-l-4 border-green-200 pl-6 pb-2"
                      >

                        <div
                          className={`inline-block px-3 py-1 rounded-full text-white text-sm font-semibold ${stageInfo.color}`}
                        >
                          {stageInfo.label}
                        </div>

                        <p className="text-sm text-gray-500 mt-2">
                          {log.logged_at}
                        </p>

                        <h3 className="text-lg font-bold text-gray-800 mt-2">
                          {log.title}
                        </h3>

                        <p className="text-gray-600 mt-2">
                          {log.description}
                        </p>

                        {/* HÌNH ẢNH MINH CHỨNG */}
                        {log.media_urls?.length > 0 && (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">

                            {log.media_urls.map((url, index) => (
                              <a
                                key={index}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block"
                              >
                                <img
                                  src={url}
                                  alt={`Hình ảnh giai đoạn ${stageInfo.label}`}
                                  className="w-full h-40 object-cover rounded-xl border"
                                />
                              </a>
                            ))}

                          </div>
                        )}

                      </div>
                    );
                  })}

                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  Chưa có nhật ký canh tác.
                </p>
              )}

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
