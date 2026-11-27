import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  ShoppingBag,
  Trash2,
  Users,
  AlertTriangle,
  RefreshCw,
  Tag,
} from 'lucide-react';
import { getAuthHeaders } from '../../services/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';

export default function AdminStatsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [updatingBatchId, setUpdatingBatchId] = useState(null);

  const loadStats = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const headers = getAuthHeaders();
      const [statsRes, alertsRes] = await Promise.all([
        axios.get(`${API_URL}/admin/dashboard-stats`, { headers }),
        axios.get(`${API_URL}/alerts/near-expiry`, { headers }),
      ]);

      const statsPayload = statsRes.data?.data ?? {};
      const alertsList = Array.isArray(alertsRes.data?.data)
        ? alertsRes.data.data
        : [];

      setData({
        kpis: statsPayload.kpis || {
          total_revenue: statsPayload.summary?.total_revenue ?? 0,
          total_orders: statsPayload.summary?.total_orders ?? 0,
          waste_rate_percent: statsPayload.summary?.waste_rate_percent ?? 0,
          repeat_customer_rate: statsPayload.summary?.repeat_rate_percent ?? 0,
        },
        revenue_chart: Array.isArray(statsPayload.revenue_chart)
          ? statsPayload.revenue_chart
          : [],
        near_expiry_batches: alertsList,
      });
    } catch (err) {
      console.error('Lỗi tải Admin Dashboard Stats:', err);
      setErrorMsg(
        err.response?.data?.message ||
          'Không thể tải dữ liệu thống kê từ máy chủ.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleSetFlashSale = async (batch, enable, discountPercent = 30) => {
    setUpdatingBatchId(batch.batch_id);
    try {
      const res = await axios.post(
        `${API_URL}/sales/batches/${batch.batch_id}/flash-sale`,
        {
          is_flash_sale: enable,
          discount_percent: enable ? discountPercent : 0,
        },
        { headers: getAuthHeaders() }
      );
      alert(res.data?.message || 'Đã cập nhật Flash Sale.');
      await loadStats();
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể cấu hình Flash Sale.');
    } finally {
      setUpdatingBatchId(null);
    }
  };

  if (loading && !data) {
    return (
      <div className="rounded-2xl bg-white p-6 text-sm text-slate-500">
        Đang tải dữ liệu thống kê tổng quan từ MySQL...
      </div>
    );
  }

  if (errorMsg && !data) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
        {errorMsg}
      </div>
    );
  }

  const { kpis, revenue_chart, near_expiry_batches } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={loadStats}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Làm mới số liệu
        </button>
      </div>

      {/* 4 THẺ KPI TỔNG QUAN */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase">
              Doanh thu đã thu (30 ngày)
            </span>
            <TrendingUp className="text-emerald-600" size={20} />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-800">
            {Number(kpis.total_revenue || 0).toLocaleString('vi-VN')}đ
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase">
              Tổng đơn hàng
            </span>
            <ShoppingBag className="text-blue-600" size={20} />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-800">
            {Number(kpis.total_orders || 0)} đơn
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase">
              Tỷ lệ hao hụt
            </span>
            <Trash2 className="text-rose-600" size={20} />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-rose-600">
            {Number(kpis.waste_rate_percent || 0)}%
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase">
              Khách mua lại
            </span>
            <Users className="text-amber-600" size={20} />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-800">
            {Number(kpis.repeat_customer_rate || 0)}%
          </p>
        </div>
      </div>

      {/* BIỂU ĐỒ DOANH THU & HAO HỤT */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-bold text-slate-800">
          Biểu đồ Doanh thu & Giá trị Hao hụt 7 ngày gần nhất
        </h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenue_chart}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip
                formatter={(value) =>
                  `${Number(value || 0).toLocaleString('vi-VN')}đ`
                }
              />
              <Legend />
              <Bar
                dataKey="revenue"
                name="Doanh thu"
                fill="#059669"
                radius={[6, 6, 0, 0]}
              />
              <Bar
                dataKey="waste"
                name="Hao hụt xuất hủy"
                fill="#e11d48"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* CẢNH BÁO LÔ HÀNG SẮP HẾT HẠN (FLASH SALE FEFO) */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-6 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="text-amber-600" size={22} />
          <h3 className="text-lg font-bold text-slate-800">
            Cảnh báo Lô hàng sắp hết hạn (Flash Sale FEFO)
          </h3>
        </div>

        {near_expiry_batches.length === 0 ? (
          <p className="py-4 text-sm text-slate-500">
            Không có lô hàng nào sắp hết hạn hoặc quá hạn cần xả kho.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-amber-200 text-xs uppercase text-slate-600">
                  <th className="p-2.5">Mã Lô</th>
                  <th className="p-2.5">Nông sản</th>
                  <th className="p-2.5">Tồn kho</th>
                  <th className="p-2.5">Hạn sử dụng</th>
                  <th className="p-2.5">Còn lại</th>
                  <th className="p-2.5">Flash Sale</th>
                  <th className="p-2.5 text-right">Cấu hình nhanh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100">
                {near_expiry_batches.map((b) => (
                  <tr key={b.batch_code}>
                    <td className="p-2.5 font-mono font-bold text-amber-800">
                      {b.batch_code}
                    </td>
                    <td className="p-2.5 font-medium">{b.product_name}</td>
                    <td className="p-2.5">
                      {b.remaining_quantity} {b.unit}
                    </td>
                    <td className="p-2.5">{b.expiry_date}</td>
                    <td className="p-2.5 font-bold text-rose-600">
                      {b.days_left < 0
                        ? `Quá hạn ${Math.abs(b.days_left)} ngày`
                        : `${b.days_left} ngày`}
                    </td>
                    <td className="p-2.5">
                      {b.is_flash_sale ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700">
                          <Tag size={12} /> Giảm {b.discount_percent}%
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500">Chưa bật</span>
                      )}
                    </td>
                    <td className="p-2.5 text-right">
                      {b.days_left >= 0 && (
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            disabled={updatingBatchId === b.batch_id}
                            onClick={() => handleSetFlashSale(b, true, 30)}
                            className="rounded-lg bg-amber-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-amber-700"
                          >
                            Giảm 30%
                          </button>
                          <button
                            type="button"
                            disabled={updatingBatchId === b.batch_id}
                            onClick={() => handleSetFlashSale(b, true, 50)}
                            className="rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-700"
                          >
                            Xả 50%
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
