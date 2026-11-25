import React, { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { fetchAdminDashboardStats } from '../../services/api';

export default function AdminStatsPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchAdminDashboardStats().then(setData);
  }, []);

  if (!data) {
    return (
      <div className="rounded-2xl bg-white p-6 text-sm text-slate-500">
        Đang tải dữ liệu thống kê tổng quan...
      </div>
    );
  }

  const { kpis, revenue_chart, near_expiry_batches } = data;

  return (
    <div className="space-y-6">
      {/* 4 THẺ KPI TỔNG QUAN */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase">Doanh thu tháng</span>
            <TrendingUp className="text-emerald-600" size={20} />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-800">
            {kpis.total_revenue.toLocaleString('vi-VN')}đ
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase">Tổng đơn hàng</span>
            <ShoppingBag className="text-blue-600" size={20} />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-800">
            {kpis.total_orders} đơn
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase">Tỷ lệ hao hụt</span>
            <Trash2 className="text-rose-600" size={20} />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-rose-600">
            {kpis.waste_rate_percent}%
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase">Khách mua lại</span>
            <Users className="text-amber-600" size={20} />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-800">
            {kpis.repeat_customer_rate}%
          </p>
        </div>
      </div>

      {/* BIỂU ĐỒ DOANH THU & HAO HỤT */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-bold text-slate-800">
          Biểu đồ Doanh thu & Giá trị Hao hụt trong tuần
        </h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenue_chart}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip
                formatter={(value) => `${Number(value).toLocaleString('vi-VN')}đ`}
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
            Cảnh báo Lô hàng sắp hết hạn (Tự động bật Flash Sale)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-amber-200 text-xs uppercase text-slate-600">
                <th className="p-2.5">Mã Lô</th>
                <th className="p-2.5">Nông sản</th>
                <th className="p-2.5">Tồn kho</th>
                <th className="p-2.5">Hạn sử dụng</th>
                <th className="p-2.5">Còn lại</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-100">
              {near_expiry_batches.map((b) => (
                <tr key={b.batch_code}>
                  <td className="p-2.5 font-mono font-bold text-amber-800">
                    {b.batch_code}
                  </td>
                  <td className="p-2.5 font-medium">{b.product_name}</td>
                  <td className="p-2.5">{b.remaining_quantity}</td>
                  <td className="p-2.5">{b.expiry_date}</td>
                  <td className="p-2.5 font-bold text-rose-600">
                    {b.days_left} ngày
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}