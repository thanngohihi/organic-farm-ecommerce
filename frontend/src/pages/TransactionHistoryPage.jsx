import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Receipt,
  Search,
  Package,
  MapPin,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  Loader2,
  RefreshCw,
  ExternalLink,
  Calendar,
} from 'lucide-react';
import ComplaintPage from './ComplaintPage';
import { getAuthHeaders } from '../services/api';
import Pagination from '../components/Pagination';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';

const ORDER_STATUS_META = {
  cho_xac_nhan: { label: 'Chờ xác nhận', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  da_xac_nhan: { label: 'Đã xác nhận', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  dang_giao_hang: { label: 'Đang giao hàng', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  da_giao_hang: { label: 'Đã giao tới nơi', cls: 'bg-cyan-50 text-cyan-800 border-cyan-200' },
  hoan_thanh: { label: 'Hoàn thành', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  da_huy: { label: 'Đã hủy', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  da_giao_bu: { label: 'Đã giao bù', cls: 'bg-teal-50 text-teal-700 border-teal-200' },
};

const PAYMENT_STATUS_META = {
  cho_thanh_toan: { label: 'Chờ thanh toán', cls: 'bg-amber-100 text-amber-800' },
  da_thanh_toan: { label: 'Đã thanh toán', cls: 'bg-emerald-100 text-emerald-800' },
  that_bai: { label: 'Thanh toán thất bại', cls: 'bg-rose-100 text-rose-700' },
  da_hoan_tien: { label: 'Đã hoàn tiền', cls: 'bg-purple-100 text-purple-700' },
};

const COMPLAINT_STATUS_META = {
  cho_tiep_nhan: { label: 'Chờ tiếp nhận', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  dang_xu_ly: { label: 'Đang xử lý', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  da_hoan_tat: { label: 'Đã hoàn tất', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  tu_choi: { label: 'Từ chối', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
};

const RESOLUTION_LABELS = {
  cho_xu_ly: 'Đang chờ CSKH xử lý',
  hoan_tien: 'Hoàn tiền',
  giao_bu_hang: 'Giao bù đơn mới',
  tu_choi: 'Từ chối khiếu nại',
};

const formatMoney = (value) => Number(value || 0).toLocaleString('vi-VN') + 'đ';

const formatDateShort = (value) => {
  if (!value) return '—';
  const [y, m, d] = String(value).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return String(value);
  return new Date(y, m - 1, d, 12, 0, 0).toLocaleDateString('vi-VN');
};

const formatDateTime = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  return isNaN(d.getTime()) ? String(value) : d.toLocaleString('vi-VN');
};

const TX_SUBS_PER_PAGE = 5;

export default function TransactionHistoryPage({
  initialTab = 'orders',
  initialComplaintOrderCode = '',
}) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedOrderCode, setSelectedOrderCode] = useState(initialComplaintOrderCode);

  const [orders, setOrders] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [summary, setSummary] = useState({
    total_orders: 0,
    paid_orders: 0,
    total_spent: 0,
    complaint_count: 0,
    loyalty_points: 0,
  });

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [momoPayingCode, setMomoPayingCode] = useState(null);
  const [momoModalInfo, setMomoModalInfo] = useState(null);
  const [confirmingOrderCode, setConfirmingOrderCode] = useState(null);
  const [txSubPage, setTxSubPage] = useState(1);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (initialComplaintOrderCode) {
      setSelectedOrderCode(initialComplaintOrderCode);
      setActiveTab('complaint');
    }
  }, [initialComplaintOrderCode]);

  const fetchAllData = async () => {
    setLoading(true);
    setErrorMsg('');

    try {
      const headers = {
        Accept: 'application/json',
        ...getAuthHeaders(),
      };

      const [txRes, compRes] = await Promise.all([
        axios.get(`${API_BASE}/customer/transactions`, { headers }),
        axios.get(`${API_BASE}/customer/complaints`, { headers }),
      ]);

      const txData = txRes.data?.data || {};
      setOrders(Array.isArray(txData.orders) ? txData.orders : []);
      setSubscriptions(Array.isArray(txData.subscriptions) ? txData.subscriptions : []);
      if (txData.summary) setSummary(txData.summary);

      const compData = compRes.data?.data;
      setComplaints(Array.isArray(compData) ? compData : []);
    } catch (err) {
      console.error('Lỗi tải lịch sử giao dịch:', err);
      setErrorMsg(
        err.response?.data?.message ||
          'Không thể tải lịch sử giao dịch. Vui lòng kiểm tra server Laravel và MySQL.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleOpenComplaintForOrder = (orderCode) => {
    setSelectedOrderCode(orderCode);
    setActiveTab('complaint');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleComplaintCreated = () => {
    fetchAllData();
  };

  const handlePayWithMoMo = async (order) => {
    setMomoPayingCode(order.order_code);
    try {
      const res = await axios.post(
        `${API_BASE}/customer/payments/momo/create-payment`,
        {
          order_code: order.order_code,
          amount: Number(order.total_amount),
        },
        {
          headers: {
            Accept: 'application/json',
            ...getAuthHeaders(),
          },
        }
      );

      const data = res.data?.data;
      if (data?.pay_url) {
        setMomoModalInfo({
          order_code: order.order_code,
          amount: order.total_amount,
          pay_url: data.pay_url,
          qr_code_url: data.qr_code_url,
        });
      }
    } catch (err) {
      alert(
        err.response?.data?.message ||
          'Không thể tạo link thanh toán MoMo lúc này.'
      );
    } finally {
      setMomoPayingCode(null);
    }
  };

  const handleConfirmReceived = async (order) => {
    setConfirmingOrderCode(order.order_code);
    try {
      await axios.post(
        `${API_BASE}/customer/orders/${encodeURIComponent(order.order_code)}/confirm-received`,
        {},
        {
          headers: {
            Accept: 'application/json',
            ...getAuthHeaders(),
          },
        }
      );
      await fetchAllData();
    } catch (err) {
      alert(
        err.response?.data?.message ||
          'Không thể xác nhận đã nhận hàng lúc này.'
      );
    } finally {
      setConfirmingOrderCode(null);
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchStatus =
      statusFilter === 'all' || order.order_status === statusFilter;
    const keyword = searchTerm.trim().toLowerCase();
    const matchKeyword =
      !keyword ||
      String(order.order_code || '').toLowerCase().includes(keyword) ||
      String(order.delivery_address || '').toLowerCase().includes(keyword);
    return matchStatus && matchKeyword;
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      {/* HEADER + THỐNG KÊ NHANH */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-slate-800">
            <Receipt className="text-emerald-600" size={26} />
            Lịch sử giao dịch & Khiếu nại
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Theo dõi toàn bộ đơn hàng, trạng thái thanh toán MoMo/COD và gửi khiếu nại đổi trả.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchAllData}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Làm mới
        </button>
      </div>

      {/* 3 THẺ TÓM TẮT */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-400">
            Tổng đơn hàng đã đặt
          </p>
          <p className="mt-2 text-2xl font-extrabold text-slate-800">
            {summary.total_orders} đơn
          </p>
          <p className="mt-1 text-xs text-emerald-600">
            {summary.paid_orders} đơn đã thanh toán
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-400">
            Tổng giá trị giao dịch
          </p>
          <p className="mt-2 text-2xl font-extrabold text-emerald-700">
            {formatMoney(summary.total_spent)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Đã thanh toán / hoàn thành
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase text-slate-400">
            Yêu cầu khiếu nại
          </p>
          <p className="mt-2 text-2xl font-extrabold text-rose-600">
            {complaints.length} yêu cầu
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Hỗ trợ hoàn tiền hoặc giao bù
          </p>
        </div>
      </div>

      {/* THANH CHUYỂN TAB */}
      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
            activeTab === 'orders'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Package size={18} />
          Đơn hàng & Giao dịch ({orders.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('complaint')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
            activeTab === 'complaint'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <AlertTriangle size={18} />
          Gửi khiếu nại & Theo dõi ({complaints.length})
        </button>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <AlertTriangle size={18} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[260px] items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white text-emerald-700">
          <Loader2 className="animate-spin" size={24} />
          <span className="text-sm font-semibold">Đang tải dữ liệu từ MySQL...</span>
        </div>
      ) : activeTab === 'orders' ? (
        <div className="space-y-5">
          {/* TÌM KIẾM + LỌC TRẠNG THÁI */}
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search size={17} className="absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm theo mã đơn hàng (ORD-...) hoặc địa chỉ giao..."
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'all', label: 'Tất cả' },
                { id: 'cho_xac_nhan', label: 'Chờ xác nhận' },
                { id: 'dang_giao_hang', label: 'Đang giao' },
                { id: 'hoan_thanh', label: 'Hoàn thành' },
                { id: 'da_huy', label: 'Đã hủy' },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStatusFilter(st.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    statusFilter === st.id
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* DANH SÁCH ĐƠN HÀNG */}
          {filteredOrders.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
              <Package size={40} className="mx-auto mb-3 text-slate-300" />
              <h3 className="text-base font-bold text-slate-700">
                Chưa có đơn hàng nào phù hợp
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Các đơn hàng bạn đặt từ giỏ hàng hoặc gói định kỳ sẽ xuất hiện tại đây.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order) => {
                const orderMeta = ORDER_STATUS_META[order.order_status] || {
                  label: order.order_status,
                  cls: 'bg-slate-100 text-slate-700 border-slate-200',
                };
                const payMeta = PAYMENT_STATUS_META[order.payment_status] || {
                  label: order.payment_status,
                  cls: 'bg-slate-100 text-slate-700',
                };
                const latestComplaint =
                  Array.isArray(order.complaints) && order.complaints.length > 0
                    ? order.complaints[0]
                    : null;

                return (
                  <div
                    key={order.id}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-200"
                  >
                    {/* Header đơn */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-extrabold text-slate-800">
                          {order.order_code}
                        </span>
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${orderMeta.cls}`}
                        >
                          {orderMeta.label}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${payMeta.cls}`}
                        >
                          {payMeta.label}
                        </span>
                      </div>

                      <span className="flex items-center gap-1 text-xs text-slate-400">
                        <Clock size={13} />
                        {formatDateTime(order.created_at)}
                      </span>
                    </div>

                    {/* Danh sách sản phẩm trong đơn */}
                    {Array.isArray(order.items) && order.items.length > 0 && (
                      <div className="mt-3 divide-y divide-slate-100 rounded-xl bg-slate-50/70 px-3">
                        {order.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
                          >
                            <div>
                              <p className="font-semibold text-slate-800">
                                {item.product?.name || `Sản phẩm #${item.product_id}`}
                              </p>
                              <p className="text-xs text-slate-500">
                                Số lượng: <strong>{item.quantity}</strong> {item.product?.unit || 'kg'} • Lô FEFO:{' '}
                                <span className="font-mono text-emerald-700">
                                  {item.batch?.batch_code || `#${item.batch_id}`}
                                </span>
                              </p>
                            </div>
                            <span className="font-bold text-slate-700">
                              {formatMoney(item.total_price)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Địa chỉ & Chi phí */}
                    <div className="mt-3 grid gap-3 text-xs text-slate-600 sm:grid-cols-2">
                      <div className="space-y-1">
                        <p className="flex items-start gap-1.5">
                          <MapPin size={14} className="mt-0.5 shrink-0 text-emerald-600" />
                          <span>
                            {order.delivery_address} ({order.distance_km} km
                            {order.shipping_type
                              ? ` • ${order.shipping_type === 'hoa_toc' ? 'Giao hàng hỏa tốc' : 'Giao hàng bình thường'}`
                              : ''}
                            )
                          </span>
                        </p>
                        <p className="flex items-center gap-1.5">
                          <CreditCard size={14} className="shrink-0 text-emerald-600" />
                          <span>
                            Phương thức:{' '}
                            <strong className="uppercase">{order.payment_method}</strong>
                            {order.momo_trans_id && (
                              <span className="ml-1.5 font-mono text-slate-500">
                                (Mã MoMo: {order.momo_trans_id})
                              </span>
                            )}
                          </span>
                        </p>
                      </div>

                      <div className="space-y-1 sm:text-right">
                        <p>
                          Tiền hàng: <strong>{formatMoney(order.subtotal)}</strong> • Ship:{' '}
                          <strong>{formatMoney(order.shipping_fee)}</strong>
                          {Number(order.loyalty_discount) > 0 && (
                            <span className="text-amber-700">
                              {' '}
                              • Giảm Loyalty: -{formatMoney(order.loyalty_discount)}
                            </span>
                          )}
                        </p>
                        <p className="text-base font-extrabold text-emerald-700">
                          Tổng cộng: {formatMoney(order.total_amount)}
                        </p>
                      </div>
                    </div>

                    {/* Hành động: Thanh toán MoMo / Đã nhận hàng / Gửi khiếu nại */}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                      <div>
                        {latestComplaint ? (
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                              COMPLAINT_STATUS_META[latestComplaint.status]?.cls ||
                              'bg-slate-50 text-slate-600 border-slate-200'
                            }`}
                          >
                            <AlertTriangle size={13} />
                            Khiếu nại #{latestComplaint.id}:{' '}
                            {COMPLAINT_STATUS_META[latestComplaint.status]?.label ||
                              latestComplaint.status}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">
                            {['hoan_thanh', 'da_giao_bu'].includes(order.order_status)
                              ? 'Đã nhận hàng. Nếu sản phẩm có vấn đề, bạn có thể gửi khiếu nại cho đơn này.'
                              : order.order_status === 'da_giao_hang'
                                ? 'Shop đã xác nhận giao hàng hoàn tất! Hãy nhấn "Đã nhận hàng" để xác nhận (khiếu nại mở sau khi nhận hàng).'
                                : order.order_status === 'dang_giao_hang'
                                  ? 'Đơn hàng đang giao. Sau khi Sales xác nhận đã giao hoàn tất, nút "Đã nhận hàng" sẽ được mở.'
                                  : order.order_status === 'da_huy'
                                    ? 'Đơn hàng đã hủy không thể gửi khiếu nại.'
                                    : 'Sau khi Sales xác nhận giao hàng hoàn tất và bạn nhấn "Đã nhận hàng", bạn mới có thể gửi khiếu nại.'}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {order.payment_method === 'momo' &&
                          order.payment_status === 'cho_thanh_toan' &&
                          order.order_status !== 'da_huy' && (
                            <button
                              type="button"
                              onClick={() => handlePayWithMoMo(order)}
                              disabled={momoPayingCode === order.order_code}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-pink-600 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-pink-700 disabled:opacity-60"
                            >
                              {momoPayingCode === order.order_code ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <CreditCard size={14} />
                              )}
                              Thanh toán MoMo
                            </button>
                          )}

                        {order.order_status === 'da_giao_hang' && (
                          <button
                            type="button"
                            onClick={() => handleConfirmReceived(order)}
                            disabled={confirmingOrderCode === order.order_code}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                          >
                            {confirmingOrderCode === order.order_code ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <CheckCircle2 size={14} />
                            )}
                            Đã nhận hàng
                          </button>
                        )}

                        {['hoan_thanh', 'da_giao_bu'].includes(order.order_status) && (
                          <button
                            type="button"
                            onClick={() => handleOpenComplaintForOrder(order.order_code)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
                          >
                            <AlertTriangle size={14} />
                            Gửi khiếu nại
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* GÓI ĐỊNH KỲ ĐÃ ĐĂNG KÝ (NẾU CÓ) */}
          {subscriptions.length > 0 && (() => {
            const totalSubPages = Math.max(1, Math.ceil(subscriptions.length / TX_SUBS_PER_PAGE));
            const safeSubPage = Math.min(txSubPage, totalSubPages);
            const paginatedSubs = subscriptions.slice(
              (safeSubPage - 1) * TX_SUBS_PER_PAGE,
              safeSubPage * TX_SUBS_PER_PAGE
            );

            return (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 text-base font-bold text-slate-800">
                    <Calendar size={18} className="text-emerald-600" />
                    Gói nông sản định kỳ của bạn ({subscriptions.length})
                  </h3>
                  {totalSubPages > 1 && (
                    <span className="text-xs font-medium text-slate-500">
                      Trang {safeSubPage} / {totalSubPages}
                    </span>
                  )}
                </div>
                <div className="space-y-3">
                  {paginatedSubs.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 p-3.5 text-sm"
                    >
                      <div>
                        <p className="font-bold text-slate-800">
                          {sub.package_name}
                          {sub.subscription_code && (
                            <span className="ml-2 font-mono text-xs font-semibold text-emerald-700">
                              #{sub.subscription_code}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-slate-500">
                          {sub.weight_per_delivery}kg/lần • Giao thứ:{' '}
                          {Array.isArray(sub.delivery_days)
                            ? sub.delivery_days.join(', ')
                            : sub.delivery_days}{' '}
                          • {sub.delivery_address}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-extrabold text-emerald-700">
                          {formatMoney(sub.total_price)}
                        </p>
                        <span className="text-xs font-semibold text-slate-500">
                          {formatDateShort(sub.start_date)} → {formatDateShort(sub.end_date)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <Pagination
                  currentPage={safeSubPage}
                  totalPages={totalSubPages}
                  onPageChange={setTxSubPage}
                />
              </div>
            );
          })()}
        </div>
      ) : (
        /* TAB GỬI KHIẾU NẠI & THEO DÕI XỬ LÝ */
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <ComplaintPage
              embedded
              initialOrderCode={selectedOrderCode}
              ordersList={orders}
              onComplaintSuccess={handleComplaintCreated}
            />
          </div>

          <div className="space-y-4 lg:col-span-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 flex items-center gap-2 text-base font-bold text-slate-800">
                <Truck size={18} className="text-rose-600" />
                Khiếu nại đã gửi ({complaints.length})
              </h3>

              {complaints.length === 0 ? (
                <p className="py-6 text-center text-xs text-slate-400">
                  Bạn chưa gửi khiếu nại nào.
                </p>
              ) : (
                <div className="space-y-3">
                  {complaints.map((comp) => {
                    const compMeta = COMPLAINT_STATUS_META[comp.status] || {
                      label: comp.status,
                      cls: 'bg-slate-100 text-slate-700 border-slate-200',
                    };
                    return (
                      <div
                        key={comp.id}
                        className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono font-bold text-slate-700">
                            #{comp.id} • {comp.order?.order_code || `Đơn #${comp.order_id}`}
                          </span>
                          <span
                            className={`rounded-full border px-2 py-0.5 font-semibold ${compMeta.cls}`}
                          >
                            {compMeta.label}
                          </span>
                        </div>

                        <p className="mt-2 font-medium text-slate-700">
                          {comp.reason}
                        </p>

                        <p className="mt-1 text-slate-500">
                          Hướng xử lý:{' '}
                          <strong>
                            {RESOLUTION_LABELS[comp.resolution_type] || comp.resolution_type}
                          </strong>
                          {Number(comp.refund_amount) > 0 && (
                            <span className="ml-1 text-emerald-700">
                              ({formatMoney(comp.refund_amount)})
                            </span>
                          )}
                        </p>

                        {comp.sales_note && (
                          <p className="mt-1 rounded-lg bg-white p-2 text-slate-600">
                            Phản hồi CSKH: {comp.sales_note}
                          </p>
                        )}

                        {Array.isArray(comp.evidence_media_urls) &&
                          comp.evidence_media_urls.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {comp.evidence_media_urls.map((url, idx) => (
                                <a
                                  key={idx}
                                  href={url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 rounded bg-white px-2 py-1 text-[11px] font-semibold text-emerald-700 underline"
                                >
                                  Bằng chứng {idx + 1}
                                  <ExternalLink size={11} />
                                </a>
                              ))}
                            </div>
                          )}

                        <p className="mt-2 text-[11px] text-slate-400">
                          {formatDateTime(comp.created_at)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL LINK THANH TOÁN MOMO */}
      {momoModalInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-2xl">
            <h3 className="text-lg font-bold text-slate-800">
              Thanh toán MoMo — {momoModalInfo.order_code}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Số tiền:{' '}
              <strong className="text-pink-600">
                {formatMoney(momoModalInfo.amount)}
              </strong>
            </p>

            {momoModalInfo.qr_code_url && (
              <img
                src={momoModalInfo.qr_code_url}
                alt="QR MoMo"
                className="mx-auto my-4 h-44 w-44 rounded-xl border border-slate-200 p-2"
              />
            )}

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setMomoModalInfo(null)}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Đóng
              </button>
              <a
                href={momoModalInfo.pay_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-pink-600 py-2.5 text-sm font-bold text-white hover:bg-pink-700"
              >
                Mở cổng MoMo
                <ExternalLink size={15} />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
