import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  ShoppingBag,
  Flame,
  CheckCircle,
  Truck,
  RefreshCw,
  CalendarClock,
  AlertTriangle,
  Loader2,
  XCircle,
} from 'lucide-react';
import { getAuthHeaders } from '../../services/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';

const EXPRESS_PARTNERS = [
  'Grab',
  'Giao nội bộ nông trại',
];

const STANDARD_PARTNERS = [
  'Giao nội bộ nông trại',
  'Giao Hàng Nhanh (GHN)',
  'Viettel Post',
  'GHTK',
];

const STATUS_META = {
  cho_xac_nhan: {
    label: 'Chờ xác nhận',
    cls: 'bg-amber-100 text-amber-800',
  },
  da_xac_nhan: {
    label: 'Đã xác nhận (Chuẩn bị kho FEFO)',
    cls: 'bg-sky-100 text-sky-800',
  },
  dang_giao_hang: {
    label: 'Đang giao hàng',
    cls: 'bg-blue-100 text-blue-800',
  },
  da_giao_hang: {
    label: 'Đã giao hoàn tất (Chờ khách xác nhận)',
    cls: 'bg-cyan-100 text-cyan-800',
  },
  hoan_thanh: {
    label: 'Đã hoàn thành (Khách đã nhận)',
    cls: 'bg-emerald-100 text-emerald-800',
  },
  da_giao_bu: {
    label: 'Đơn giao bù 0đ',
    cls: 'bg-purple-100 text-purple-800',
  },
  da_huy: {
    label: 'Đã hủy',
    cls: 'bg-rose-100 text-rose-800',
  },
};

export default function SalesOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [scheduleAlerts, setScheduleAlerts] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [generatingSub, setGeneratingSub] = useState(false);
  const [partnerMap, setPartnerMap] = useState({});

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/sales/orders`, {
        headers: getAuthHeaders(),
      });
      const list = Array.isArray(res.data?.data) ? res.data.data : [];
      const alerts = Array.isArray(res.data?.schedule_alerts)
        ? res.data.schedule_alerts
        : [];
      setOrders(list);
      setScheduleAlerts(alerts);
    } catch (err) {
      console.error('Lỗi tải danh sách đơn hàng Sales:', err);
      alert(
        err.response?.data?.message ||
          'Không thể tải danh sách đơn hàng từ máy chủ.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleUpdateStatus = async (orderId, nextStatus, isExpressOrder = true) => {
    setUpdatingId(orderId);
    try {
      const defaultPartners = isExpressOrder ? EXPRESS_PARTNERS : STANDARD_PARTNERS;
      const selectedPartner = partnerMap[orderId] || defaultPartners[0];
      const res = await axios.put(
        `${API_URL}/sales/orders/${orderId}/status`,
        {
          order_status: nextStatus,
          ...(nextStatus === 'dang_giao_hang'
            ? { delivery_partner: selectedPartner }
            : {}),
        },
        { headers: getAuthHeaders() }
      );

      await loadOrders();
      alert(res.data?.message || 'Đã cập nhật trạng thái đơn hàng.');
    } catch (err) {
      alert(
        err.response?.data?.message || 'Không thể cập nhật trạng thái đơn hàng.'
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const handleGenerateSubscriptionOrders = async () => {
    setGeneratingSub(true);
    try {
      const res = await axios.post(
        `${API_URL}/sales/subscriptions/generate-orders`,
        {},
        { headers: getAuthHeaders() }
      );
      alert(res.data?.message || 'Đã quét lịch giao gói định kỳ.');
      await loadOrders();
    } catch (err) {
      alert(
        err.response?.data?.message ||
          'Không thể chạy tạo đơn gói định kỳ.'
      );
    } finally {
      setGeneratingSub(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (filter === 'express') return o.is_express;
    if (filter === 'pending') return o.order_status === 'cho_xac_nhan';
    if (filter === 'shipping') return o.order_status === 'dang_giao_hang';
    return true;
  });

  return (
    <div className="space-y-5">
      {scheduleAlerts.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="mb-2 flex items-center gap-2 font-bold text-amber-800">
            <AlertTriangle size={18} />
            Cảnh báo lịch giao Gói định kỳ thiếu hàng ({scheduleAlerts.length})
          </div>
          <ul className="space-y-1 text-xs">
            {scheduleAlerts.map((alertItem) => (
              <li key={alertItem.schedule_id}>
                • Ngày <strong>{alertItem.delivery_date}</strong>: Gói{' '}
                <strong>{alertItem.package_name}</strong> ({alertItem.weight_kg}{' '}
                kg) của khách <strong>{alertItem.customer_name}</strong> (
                {alertItem.customer_phone}) không đủ tồn kho FEFO — vui lòng
                liên hệ đổi sản phẩm tương đương.
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShoppingBag className="text-emerald-600" size={22} />
            <h2 className="text-xl font-bold text-slate-800">
              Điều phối & Duyệt Đơn hàng ({filteredOrders.length})
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleGenerateSubscriptionOrders}
              disabled={generatingSub}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
            >
              {generatingSub ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <CalendarClock size={14} />
              )}
              Quét sinh đơn Subscription
            </button>

            <button
              type="button"
              onClick={loadOrders}
              disabled={loading}
              className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Làm mới
            </button>
          </div>
        </div>

        {/* Bộ lọc nhanh */}
        <div className="mb-5 flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'pending', label: 'Chờ xác nhận' },
            { id: 'shipping', label: 'Đang giao' },
            { id: 'express', label: 'Đơn hỏa tốc' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                filter === tab.id
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm text-slate-500">
            Đang tải danh sách đơn hàng...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 py-10 text-center text-sm text-slate-500">
            Chưa có đơn hàng nào phù hợp bộ lọc.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const statusInfo = STATUS_META[order.order_status] || {
                label: order.order_status,
                cls: 'bg-slate-100 text-slate-700',
              };
              const isBusy = updatingId === order.id;

              return (
                <div
                  key={order.id}
                  className="rounded-xl border border-slate-200 p-4 transition hover:border-emerald-300"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-slate-800">
                        {order.order_code}
                      </span>
                      {order.is_express ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700">
                          <Flame size={13} /> Hỏa tốc ({order.distance_km} km)
                        </span>
                      ) : !order.subscription_id && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-700">
                          <Truck size={13} /> Giao bình thường ({order.distance_km} km)
                        </span>
                      )}
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                        {order.order_type}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusInfo.cls}`}
                      >
                        {statusInfo.label}
                      </span>
                    </div>

                    <span className="text-xs text-slate-500">
                      {order.created_at
                        ? new Date(order.created_at).toLocaleString('vi-VN')
                        : '—'}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="text-sm">
                      <p className="font-semibold text-slate-800">
                        Khách: {order.customer_name}{' '}
                        {order.phone ? `- ${order.phone}` : ''}
                      </p>
                      <p className="text-slate-600">Địa chỉ: {order.address}</p>
                      <p className="mt-1 text-xs font-medium text-emerald-700">
                        Thanh toán: {String(order.payment_method).toUpperCase()} (
                        {order.payment_status === 'da_thanh_toan'
                          ? 'Đã thanh toán'
                          : order.payment_status === 'da_hoan_tien'
                          ? 'Đã hoàn tiền'
                          : order.payment_status === 'that_bai'
                          ? 'Thất bại'
                          : 'Chờ thanh toán'}
                        )
                      </p>
                      {order.delivery_partner && (
                        <p className="mt-1 text-xs text-blue-700">
                          Đối tác vận chuyển: <strong>{order.delivery_partner}</strong>
                        </p>
                      )}
                    </div>

                    <div className="text-sm">
                      <p className="font-semibold text-slate-700">
                        Sản phẩm đặt (đã gắn lô FEFO):
                      </p>
                      <ul className="mt-1 space-y-1 text-xs text-slate-600">
                        {(order.items || []).map((item, idx) => (
                          <li key={idx}>
                            • {item.name} x <strong>{item.qty}</strong>{' '}
                            {item.unit}
                            {item.batch_code && (
                              <span className="ml-1 font-mono text-emerald-700">
                                [{item.batch_code}]
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 font-bold text-slate-900">
                        Tổng thu:{' '}
                        {Number(order.total_amount || 0).toLocaleString('vi-VN')}đ
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                    <div className="text-xs text-slate-500">
                      Khoảng cách giao: <strong>{order.distance_km} km</strong> • Phí
                      ship:{' '}
                      <strong>
                        {Number(order.shipping_fee || 0).toLocaleString('vi-VN')}đ
                      </strong>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {order.order_status === 'cho_xac_nhan' && (
                        <>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() =>
                              handleUpdateStatus(order.id, 'da_xac_nhan')
                            }
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            <CheckCircle size={15} /> Xác nhận đơn
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() =>
                              handleUpdateStatus(order.id, 'da_huy')
                            }
                            className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                          >
                            <XCircle size={15} /> Hủy đơn
                          </button>
                        </>
                      )}

                      {order.order_status === 'da_xac_nhan' && (
                        <>
                          {(() => {
                            const partners = order.is_express ? EXPRESS_PARTNERS : STANDARD_PARTNERS;
                            return (
                              <>
                                <select
                                  value={partnerMap[order.id] || partners[0]}
                                  onChange={(e) =>
                                    setPartnerMap((prev) => ({
                                      ...prev,
                                      [order.id]: e.target.value,
                                    }))
                                  }
                                  className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700"
                                >
                                  {partners.map((partner) => (
                                    <option key={partner} value={partner}>
                                      {partner}
                                    </option>
                                  ))}
                                </select>

                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() =>
                                    handleUpdateStatus(order.id, 'dang_giao_hang', order.is_express)
                                  }
                                  className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                                >
                                  <Truck size={15} />{' '}
                                  {order.is_express
                                    ? 'Điều phối giao hỏa tốc'
                                    : 'Điều phối giao hàng'}
                                </button>
                              </>
                            );
                          })()}
                        </>
                      )}

                      {order.order_status === 'dang_giao_hang' && (
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() =>
                            handleUpdateStatus(order.id, 'da_giao_hang', order.is_express)
                          }
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          <CheckCircle size={15} /> Xác nhận đã giao hoàn tất
                        </button>
                      )}

                      {order.order_status === 'da_giao_hang' && (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-800 border border-cyan-200">
                          Đã giao hoàn tất — đang chờ khách nhấn &quot;Đã nhận hàng&quot;
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
