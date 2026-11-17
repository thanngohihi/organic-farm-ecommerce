
import React, { useEffect, useState } from 'react';

import {
  X,
  QrCode,
  Calendar,
  UserCheck,
  ShieldCheck,
  CheckCircle2,
  Image as ImageIcon,
} from 'lucide-react';

import { fetchBatchQrDetail } from '../services/api';

export default function QrTimelineModal({ batchCode, onClose }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  // Lấy thông tin truy xuất nguồn gốc
  useEffect(() => {
    if (!batchCode) {
      setData(null);
      setLoading(false);
      return;
    }

    let isMounted = true;

    const loadBatchDetail = async () => {
      try {
        setLoading(true);
        setError('');

        const res = await fetchBatchQrDetail(batchCode);

        if (isMounted) {
          setData(res);
        }
      } catch (err) {
        console.error('Lỗi truy xuất nguồn gốc:', err);

        if (isMounted) {
          setError('Không thể tải dữ liệu truy xuất nguồn gốc.');
          setData(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadBatchDetail();

    return () => {
      isMounted = false;
    };
  }, [batchCode]);

  // Không hiển thị modal nếu không có mã lô
  if (!batchCode) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">

      <div className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">

        {/* Header Modal */}
        <div className="flex items-center justify-between border-b bg-green-700 px-6 py-5 text-white">

          <div>
            <div className="mb-1 flex items-center gap-2">
              <QrCode size={22} />

              <h2 className="text-xl font-bold">
                Truy Xuất Nguồn Gốc Lô Hàng
              </h2>
            </div>

            <h3 className="text-lg font-semibold">
              {data ? data.product_name : 'Đang tải...'}
            </h3>

            <p className="text-sm text-green-100">
              Mã Lô: {batchCode}
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-2 transition hover:bg-green-600"
            aria-label="Đóng modal"
          >
            <X size={24} />
          </button>

        </div>

        {/* Content Body */}
        <div className="overflow-y-auto p-6">

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-500">

              <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />

              <p>
                Đang truy xuất dữ liệu nhật ký canh tác từ CSDL...
              </p>

            </div>
          ) : error ? (
            <div className="rounded-xl bg-red-50 p-5 text-center text-red-600">
              {error}
            </div>
          ) : data ? (
            <>

              {/* Thông tin lô hàng */}
              <div className="mb-8 grid grid-cols-1 gap-4 rounded-xl bg-green-50 p-5 md:grid-cols-2">

                <div className="flex items-start gap-3">
                  <Calendar className="mt-1 text-green-700" />

                  <div>
                    <p className="text-sm text-gray-500">
                      Ngày thu hoạch
                    </p>

                    <p className="font-semibold text-gray-800">
                      {data.harvest_date}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="mt-1 text-red-500" />

                  <div>
                    <p className="text-sm text-gray-500">
                      Hạn sử dụng
                    </p>

                    <p className="font-semibold text-gray-800">
                      {data.exp_date}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <UserCheck className="mt-1 text-green-700" />

                  <div>
                    <p className="text-sm text-gray-500">
                      Kỹ sư phụ trách
                    </p>

                    <p className="font-semibold text-gray-800">
                      {data.engineer}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-1 text-green-700" />

                  <div>
                    <p className="text-sm text-gray-500">
                      Chứng nhận chất lượng
                    </p>

                    <p className="font-semibold text-gray-800">
                      {data.quality_cert}
                    </p>
                  </div>
                </div>

              </div>

              {/* Kiểm định chất lượng */}
              {data.soil_water_test_url && (
                <a
                  href={data.soil_water_test_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mb-8 flex items-center gap-2 rounded-lg border border-green-200 p-4 text-green-700 transition hover:bg-green-50"
                >
                  <ShieldCheck size={20} />

                  <span className="font-semibold">
                    Xem kết quả kiểm định đất và nguồn nước
                  </span>
                </a>
              )}

              {/* Timeline nhật ký canh tác */}
              <div className="mb-5 flex items-center gap-2">

                <CheckCircle2 className="text-green-700" />

                <h3 className="text-lg font-bold text-gray-800">
                  Nhật Ký Canh Tác
                </h3>

              </div>

              <div className="relative ml-3 border-l-2 border-green-200 pl-6">

                {data.farming_logs?.map((log, idx) => (
                  <div
                    key={`${log.date}-${idx}`}
                    className="relative mb-8 last:mb-0"
                  >

                    {/* Chấm mốc thời gian */}
                    <div className="absolute -left-[34px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-green-600 ring-4 ring-green-100" />

                    <p className="mb-1 text-sm font-semibold text-green-700">
                      {log.date}
                    </p>

                    <h4 className="mb-2 text-base font-bold text-gray-800">
                      {log.action}
                    </h4>

                    <p className="text-sm leading-relaxed text-gray-600">
                      {log.note}
                    </p>

                    {/* Hình ảnh nhật ký */}
                    {log.media && (
                      <div className="mt-3">

                        <a
                          href={log.media}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm font-medium text-green-700 hover:underline"
                        >
                          <ImageIcon size={18} />
                          Xem hình ảnh nhật ký
                        </a>

                        <img
                          src={log.media}
                          alt={`Hình ảnh nhật ký ${log.date}`}
                          className="mt-3 max-h-56 w-full rounded-xl border object-cover md:w-2/3"
                          loading="lazy"
                        />

                      </div>
                    )}

                  </div>
                ))}

              </div>

              {(!data.farming_logs || data.farming_logs.length === 0) && (
                <p className="py-6 text-center text-gray-500">
                  Chưa có nhật ký canh tác cho lô hàng này.
                </p>
              )}

            </>
          ) : null}

        </div>

        {/* Footer Modal */}
        <div className="flex justify-end border-t bg-gray-50 px-6 py-4">

          <button
            onClick={onClose}
            className="rounded-lg bg-green-700 px-6 py-2 font-semibold text-white transition hover:bg-green-800"
          >
            Đóng
          </button>

        </div>

      </div>

    </div>
  );
}
