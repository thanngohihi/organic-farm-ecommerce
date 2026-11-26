import React, { useEffect, useState } from 'react';
import { AlertCircle, RefreshCw, DollarSign, CheckCircle2 } from 'lucide-react';
import { fetchComplaintsForSales, approveComplaint } from '../../services/api';

export default function SalesComplaintsPage() {
  const [complaints, setComplaints] = useState([]);

  useEffect(() => {
    fetchComplaintsForSales().then((list) => {
      const enriched = list.map((c, idx) => ({
        ...c,
        amount: c.amount ?? (idx === 0 ? 45000 : 38000),
      }));
      setComplaints(enriched);
    });
  }, []);

  const handleAction = async (id, actionType) => {
    const res = await approveComplaint(id, actionType);
    alert(res.message);

    setComplaints((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              status:
                actionType === 'refund' ? 'approved_refund' : 'approved_compensate',
              resolution_note:
                actionType === 'refund'
                  ? `Đã duyệt hoàn tiền ${Number(c.amount || 0).toLocaleString('vi-VN')}đ`
                  : 'Đã tạo đơn giao bù 0đ',
            }
          : c
      )
    );
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-2">
        <AlertCircle className="text-rose-600" size={22} />
        <h2 className="text-xl font-bold text-slate-800">
          Xử lý Khiếu nại & Đổi trả
        </h2>
      </div>

      <div className="space-y-4">
        {complaints.map((item) => (
          <div key={item.id} className="rounded-xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="font-mono text-xs font-bold text-slate-500">
                  Đơn hàng: {item.order_id}
                </span>
                <h3 className="text-base font-bold text-slate-800">
                  {item.reason} — {item.customer_name}
                </h3>
              </div>
              <span className="text-xs text-slate-400">{item.created_at}</span>
            </div>

            <p className="mt-2 text-sm text-slate-600">{item.description}</p>

            {item.evidence_url && (
              <div className="mt-3">
                <p className="mb-1 text-xs font-semibold text-slate-500">
                  Bằng chứng khách hàng đính kèm:
                </p>
                <img
                  src={item.evidence_url}
                  alt="Bằng chứng"
                  className="max-h-44 rounded-lg border border-slate-200 object-cover"
                />
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
              {item.status === 'pending' ? (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handleAction(item.id, 'compensate')}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    <RefreshCw size={15} /> Duyệt giao bù (Đơn 0đ)
                  </button>
                  <button
                    onClick={() => handleAction(item.id, 'refund')}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-amber-700"
                  >
                    <DollarSign size={15} /> Duyệt hoàn tiền
                  </button>
                </div>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
                  <CheckCircle2 size={16} /> {item.resolution_note}
                </span>
              )}

              <div className="ml-auto flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-1.5 text-right">
                <span className="text-xs font-medium text-slate-600">
                  Số tiền:
                </span>
                <span className="text-sm font-extrabold text-rose-600">
                  {Number(item.amount || 0).toLocaleString('vi-VN')}đ
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}