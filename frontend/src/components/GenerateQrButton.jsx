
import React, { useState } from 'react';

import {
  QrCode,
  Printer,
  CheckCircle,
} from 'lucide-react';

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';

export default function GenerateQrButton({
  batchId,
  existingQrUrl,
}) {
  const [loading, setLoading] = useState(false);
  const [qrUrl, setQrUrl] = useState(existingQrUrl || '');
  const [error, setError] = useState('');

  // ===============================
  // 1. GỌI API SINH MÃ QR
  // ===============================

  const handleGenerateQr = async () => {
    if (!batchId) {
      setError('Không tìm thấy ID lô hàng!');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await axios.get(
        `${API_URL}/batches/qr/${encodeURIComponent(batchId)}`
      );

      const batchData = res.data?.data?.batch ?? res.data?.data ?? {};
      setQrUrl(
        batchData.qr_code_url ||
          `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
            `${window.location.origin}/traceability/${batchData.batch_code || batchId}`
          )}`
      );
    } catch (error) {
      console.error('Lỗi sinh mã QR:', error);

      setError(
        error.response?.data?.message ||
        'Lỗi khi sinh mã QR! Vui lòng thử lại.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ===============================
  // 2. IN MÃ QR
  // ===============================

  const handlePrintQr = () => {
    if (!qrUrl) return;

    const printWindow = window.open('', '_blank');

    if (!printWindow) {
      setError('Trình duyệt đã chặn cửa sổ in. Hãy cho phép popup.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>In mã QR truy xuất nguồn gốc</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 30px;
            }

            img {
              width: 250px;
              height: 250px;
            }

            h2 {
              margin-bottom: 10px;
            }

            @media print {
              button {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <h2>MÃ QR TRUY XUẤT NGUỒN GỐC</h2>
          <img src="${qrUrl}" alt="Mã QR" />
          <p>Quét mã để xem thông tin lô hàng</p>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  // ===============================
  // 3. GIAO DIỆN COMPONENT
  // ===============================

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">

      {qrUrl ? (
        <div className="flex flex-col items-center">

          {/* Thông báo thành công */}
          <div className="mb-4 flex items-center gap-2 text-green-700">
            <CheckCircle size={22} />

            <span className="font-semibold">
              Mã QR đã được tạo thành công!
            </span>
          </div>

          {/* Hình ảnh QR */}
          <div className="mb-4 rounded-xl border bg-white p-4">
            <img
              src={qrUrl}
              alt="Mã QR truy xuất nguồn gốc"
              className="h-48 w-48 object-contain"
            />
          </div>

          <p className="mb-4 text-center text-sm text-gray-500">
            Quét mã QR để xem thông tin và nhật ký canh tác của lô hàng.
          </p>

          {/* Nút in QR */}
          <button
            onClick={handlePrintQr}
            className="flex items-center gap-2 rounded-lg bg-green-700 px-5 py-3 font-semibold text-white transition hover:bg-green-800"
          >
            <Printer size={18} />
            In mã QR
          </button>

        </div>
      ) : (
        <div className="flex flex-col items-center py-4">

          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <QrCode size={35} className="text-green-700" />
          </div>

          <h3 className="mb-2 text-lg font-bold text-gray-800">
            Chưa có mã QR
          </h3>

          <p className="mb-5 text-center text-sm text-gray-500">
            Tạo mã QR để khách hàng truy xuất nguồn gốc sản phẩm.
          </p>

          <button
            onClick={handleGenerateQr}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg bg-green-700 px-6 py-3 font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <QrCode size={19} />

            {loading ? 'Đang tạo mã QR...' : 'Tạo mã QR'}
          </button>

        </div>
      )}

      {/* Hiển thị lỗi */}
      {error && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-center text-sm text-red-600">
          {error}
        </p>
      )}

    </div>
  );
}
