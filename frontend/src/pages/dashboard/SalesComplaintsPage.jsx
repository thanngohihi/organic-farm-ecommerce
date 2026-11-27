import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  AlertCircle,
  RefreshCw,
  DollarSign,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { getAuthHeaders } from '../../services/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';

export default function SalesComplaintsPage() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  const loadComplaints = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/sales/complaints`, {
        headers: getAuthHeaders(),
      });
      setComplaints(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch (err) {
      console.error('Lỗi tải danh sách khiếu nại:', err);
      alert(
        err.response?.data?.message ||
          'Không thể tải danh sách khiếu nại từ máy chủ.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComplaints();
  }, []);

  const handleAction = async (complaint, actionType) => {
    setProcessingId(complaint.id);
    try {
      const res = await axios.put(
        `${API_URL}/sales/complaints/${complaint.id}/approve`,
        {
          action: actionType,
          ...(actionType === 'refund'
            ? { refund_amount: Number(complaint.order_total_amount || 0) }
            : {}),
        },
        { headers: getAuthHeaders() }
      );

      alert(res.data?.message || 'Đã xử lý khiếu nại thành công.');
      await loadComplaints();
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể xử lý khiếu nại.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertCircle className="text-rose-600" size={22} />
          <h2 className="text-xl font-bold text-slate-800">
            Xử lý Khiếu nại & Đổi trả ({complaints.length})
          </h2>
        </div>

        <button
          type="button"
          onClick={loadComplaints}
          disabled={loading}
          className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Làm mới
        </button>
      </div>

      {loading ? (
        <div className="py-10 text-center text-sm text-slate-500">
          Đang tải danh sách khiếu nại...
        </div>
      ) : complaints.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-500">
          Hiện chưa có khiếu nại nào từ khách hàng.
        </div>
      ) : (
        <div className="space-y-4">
          {complaints.map((item) => {
            const isPending =
              item.status === 'cho_tiep_nhan' || item.status === 'dang_xu_ly';
            const evidenceList = Array.isArray(item.evidence_media_urls)
              ? item.evidence_media_urls
              : item.evidence_url
              ? [item.evidence_url]
              : [];
            const displayAmount =
              item.refund_amount > 0
                ? item.refund_amount
                : item.order_total_amount;
            const isBusy = processingId === item.id;

            return (
              <div
                key={item.id}
                className="rounded-xl border border-slate-200 p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-mono text-xs font-bold text-slate-500">
                      Đơn hàng: {item.order_code} • Khiếu nại #{item.id}
                    </span>
                    <h3 className="mt-0.5 text-base font-bold text-slate-800">
                      {item.reason}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Khách hàng: <strong>{item.customer_name}</strong>
                      {item.customer_phone ? ` (${item.customer_phone})` : ''}
                    </p>
                  </div>

                  <span className="text-xs text-slate-400">
                    {item.created_at
                      ? new Date(item.created_at).toLocaleString('vi-VN')
                      : ''}
                  </span>
                </div>

                {evidenceList.length > 0 && (
                  <div className="mt-3">
                    <p className="mb-1 text-xs font-semibold text-slate-500">
                      Bằng chứng khách hàng đính kèm:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {evidenceList.map((url, idx) =>
                        String(url).match(/\.(mp4|mov|webm)$/i) ? (
                          <video
                            key={idx}
                            src={url}
                            controls
                            className="max-h-40 rounded-lg border border-slate-200"
                          />
                        ) : (
                          <img
                            key={idx}
                            src={url}
                            alt={`Bằng chứng ${idx + 1}`}
                            className="max-h-40 rounded-lg border border-slate-200 object-cover"
                          />
                        )
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                  {isPending ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleAction(item, 'compensate')}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        <RefreshCw size={15} /> Duyệt giao bù (Đơn 0đ - FEFO)
                      </button>

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleAction(item, 'refund')}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                      >
                        <DollarSign size={15} /> Duyệt hoàn tiền
                      </button>

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleAction(item, 'reject')}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                      >
                        <XCircle size={15} /> Từ chối
                      </button>
                    </div>
                  ) : (
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-bold ${
                        item.status === 'tu_choi'
                          ? 'text-rose-600'
                          : 'text-emerald-700'
                      }`}
                    >
                      {item.status === 'tu_choi' ? (
                        <XCircle size={16} />
                      ) : (
                        <CheckCircle2 size={16} />
                      )}
                      {item.sales_note ||
                        (item.compensation_order_code
                          ? `Đã tạo đơn giao bù ${item.compensation_order_code}`
                          : 'Đã xử lý')}
                    </span>
                  )}

                  <div className="ml-auto flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-1.5 text-right">
                    <span className="text-xs font-medium text-slate-600">
                      Giá trị đơn:
                    </span>
                    <span className="text-sm font-extrabold text-rose-600">
                      {Number(displayAmount || 0).toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
