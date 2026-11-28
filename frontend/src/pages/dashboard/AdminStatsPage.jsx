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
  Package,
  Search,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { getAuthHeaders } from '../../services/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';

export default function AdminStatsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [updatingBatchId, setUpdatingBatchId] = useState(null);
  const [deletingProductId, setDeletingProductId] = useState(null);
  const [inventorySearch, setInventorySearch] = useState('');
  const [inventoryFilter, setInventoryFilter] = useState('all');
  const [expandedProductId, setExpandedProductId] = useState(null);

  const loadStats = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const headers = getAuthHeaders();
      const [statsRes, alertsRes, inventoryRes] = await Promise.all([
        axios.get(`${API_URL}/admin/dashboard-stats`, { headers }),
        axios.get(`${API_URL}/alerts/near-expiry`, { headers }),
        axios.get(`${API_URL}/admin/inventory`, { headers }),
      ]);

      const statsPayload = statsRes.data?.data ?? {};
      const alertsList = Array.isArray(alertsRes.data?.data)
        ? alertsRes.data.data
        : [];
      const invPayload = inventoryRes.data?.data ?? {};

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
        inventory_summary: invPayload.summary || {
          total_products: 0,
          in_stock: 0,
          low_stock: 0,
          out_of_stock: 0,
        },
        product_inventory: Array.isArray(invPayload.products)
          ? invPayload.products
          : [],
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

  const handleDeleteProduct = async (item) => {
    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa sản phẩm "${item.name}" (${item.sku})?\n(Lưu ý: nếu sản phẩm chưa có đơn hàng sẽ xóa vĩnh viễn cùng các lô liên quan; nếu đã có đơn hàng sẽ ẩn ngừng kinh doanh.)`
    );
    if (!confirmed) return;

    setDeletingProductId(item.id);
    try {
      const res = await axios.delete(`${API_URL}/admin/products/${item.id}`, {
        headers: getAuthHeaders(),
      });
      if (expandedProductId === item.id) {
        setExpandedProductId(null);
      }
      alert(res.data?.message || `Đã xóa sản phẩm "${item.name}".`);
      await loadStats();
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể xóa sản phẩm lúc này.');
    } finally {
      setDeletingProductId(null);
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

  const {
    kpis,
    revenue_chart,
    near_expiry_batches,
    inventory_summary = { total_products: 0, in_stock: 0, low_stock: 0, out_of_stock: 0 },
    product_inventory = [],
  } = data;

  const filteredInventory = product_inventory.filter((item) => {
    const matchFilter =
      inventoryFilter === 'all' || item.stock_status === inventoryFilter;
    const kw = inventorySearch.trim().toLowerCase();
    const matchSearch =
      !kw ||
      String(item.name || '').toLowerCase().includes(kw) ||
      String(item.sku || '').toLowerCase().includes(kw) ||
      String(item.category_name || '').toLowerCase().includes(kw);
    return matchFilter && matchSearch;
  });

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

      {/* KIỂM TRA SỐ LƯỢNG SẢN PHẨM TRONG KHO */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Package className="text-emerald-600" size={22} />
            <div>
              <h3 className="text-lg font-bold text-slate-800">
                Kiểm tra Số lượng Sản phẩm trong Kho ({filteredInventory.length})
              </h3>
              <p className="text-xs text-slate-500">
                Tổng hợp tồn kho thực tế từ các lô hàng còn hạn &amp; chi tiết từng lô FEFO.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-slate-700">
              Tổng SP: {inventory_summary.total_products}
            </span>
            <span className="rounded-lg bg-emerald-100 px-2.5 py-1 text-emerald-800">
              Đủ hàng: {inventory_summary.in_stock}
            </span>
            <span className="rounded-lg bg-amber-100 px-2.5 py-1 text-amber-800">
              Sắp hết (≤15): {inventory_summary.low_stock}
            </span>
            <span className="rounded-lg bg-rose-100 px-2.5 py-1 text-rose-700">
              Hết hàng: {inventory_summary.out_of_stock}
            </span>
          </div>
        </div>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={inventorySearch}
              onChange={(e) => setInventorySearch(e.target.value)}
              placeholder="Tìm theo tên sản phẩm, SKU, danh mục..."
              className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'con_hang', label: 'Đủ hàng' },
              { id: 'sap_het', label: 'Sắp hết' },
              { id: 'het_hang', label: 'Hết hàng' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setInventoryFilter(tab.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  inventoryFilter === tab.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {filteredInventory.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-500">
            Không tìm thấy sản phẩm nào khớp điều kiện lọc.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                  <th className="p-2.5">Sản phẩm</th>
                  <th className="p-2.5">Danh mục</th>
                  <th className="p-2.5">Tồn kho khả dụng</th>
                  <th className="p-2.5">Số lô còn hạn</th>
                  <th className="p-2.5">Lô xuất FEFO tiếp</th>
                  <th className="p-2.5">Đã hao hụt</th>
                  <th className="p-2.5">Trạng thái</th>
                  <th className="p-2.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInventory.map((item) => {
                  const isExpanded = expandedProductId === item.id;
                  const statusBadge =
                    item.stock_status === 'het_hang'
                      ? { label: 'Hết hàng', cls: 'bg-rose-100 text-rose-700' }
                      : item.stock_status === 'sap_het'
                      ? { label: 'Sắp hết hàng', cls: 'bg-amber-100 text-amber-800' }
                      : { label: 'Còn hàng', cls: 'bg-emerald-100 text-emerald-700' };

                  return (
                    <React.Fragment key={item.id}>
                      <tr className="hover:bg-slate-50/70">
                        <td className="p-2.5">
                          <p className="font-bold text-slate-800">{item.name}</p>
                          <p className="font-mono text-xs text-slate-400">
                            {item.sku} • {Number(item.base_price || 0).toLocaleString('vi-VN')}đ/{item.unit}
                          </p>
                        </td>
                        <td className="p-2.5 text-xs font-medium text-slate-600">
                          {item.category_name}
                        </td>
                        <td className="p-2.5 font-extrabold text-slate-900">
                          {item.available_stock} {item.unit}
                        </td>
                        <td className="p-2.5 text-xs text-slate-700">
                          {item.active_batches_count} lô
                          {item.near_expiry_batches > 0 && (
                            <span className="ml-1 text-amber-700 font-semibold">
                              ({item.near_expiry_batches} cận date)
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-xs">
                          {item.nearest_batch_code ? (
                            <>
                              <span className="font-mono font-semibold text-emerald-700">
                                {item.nearest_batch_code}
                              </span>
                              <span className="block text-[11px] text-slate-500">
                                HSD: {item.nearest_expiry_date}
                              </span>
                            </>
                          ) : (
                            <span className="text-slate-400">Không có lô</span>
                          )}
                        </td>
                        <td className="p-2.5 text-xs text-rose-600 font-semibold">
                          {item.total_wasted_qty} {item.unit}
                        </td>
                        <td className="p-2.5">
                          <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${statusBadge.cls}`}>
                            {statusBadge.label}
                          </span>
                        </td>
                        <td className="p-2.5 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedProductId(isExpanded ? null : item.id)
                              }
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                            >
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              {item.batches.length} lô
                            </button>
                            <button
                              type="button"
                              disabled={deletingProductId === item.id}
                              onClick={() => handleDeleteProduct(item)}
                              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                              title={`Xóa sản phẩm ${item.name}`}
                            >
                              <Trash2 size={13} />
                              {deletingProductId === item.id ? 'Đang xóa...' : 'Xóa'}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr>
                          <td colSpan={8} className="bg-slate-50 px-4 py-3">
                            {item.batches.length === 0 ? (
                              <p className="text-xs text-slate-500">
                                Sản phẩm này chưa từng khởi tạo lô hàng nào.
                              </p>
                            ) : (
                              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                                {item.batches.map((b) => (
                                  <div
                                    key={b.id}
                                    className="rounded-xl border border-slate-200 bg-white p-2.5 text-xs"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="font-mono font-bold text-emerald-700">
                                        {b.batch_code}
                                      </span>
                                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                                        {b.status}
                                      </span>
                                    </div>
                                    <p className="mt-1 text-slate-700">
                                      Còn: <strong>{b.current_quantity}</strong> / {b.initial_quantity} {item.unit}
                                    </p>
                                    <p className="text-[11px] text-slate-500">
                                      Thu hoạch: {b.harvest_date || '—'} • HSD: {b.expiry_date || '—'}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
