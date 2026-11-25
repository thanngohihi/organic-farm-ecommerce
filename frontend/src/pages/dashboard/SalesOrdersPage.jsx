import React, { useEffect, useState } from 'react';
import { ShoppingBag, Flame, CheckCircle, Truck } from 'lucide-react';
import { fetchOrdersForSales } from '../../services/api';

export default function SalesOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchOrdersForSales().then(setOrders);
  }, []);

  const handleUpdateStatus = (orderId, nextStatus) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
    );
  };

  const filteredOrders = orders.filter((o) => {
    if (filter === 'express') return o.is_express;
    if (filter === 'pending') return o.status === 'pending';
    return true;
  });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShoppingBag className="text-emerald-600" size={22} />
          <h2 className="text-xl font-bold text-slate-800">
            Điều phối & Duyệt Đơn hàng
          </h2>
        </div>

        {/* Bộ lọc nhanh */}
        <div className="flex gap-2">
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'pending', label: 'Chờ duyệt' },
            { id: 'express', label: 'Đơn hỏa tốc' },
          ].map((tab) => (
            <button
              key={tab.id}
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
      </div>

      <div className="space-y-4">
        {filteredOrders.map((order) => (
          <div
            key={order.id}
            className="rounded-xl border border-slate-200 p-4 transition hover:border-emerald-300"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-slate-800">
                  {order.id}
                </span>
                {order.is_express && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700">
                    <Flame size={13} /> Hỏa tốc ({order.distance_km} km)
                  </span>
                )}
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                  {order.order_type}
                </span>
              </div>

              <span className="text-xs text-slate-500">{order.created_at}</span>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="text-sm">
                <p className="font-semibold text-slate-800">
                  Khách: {order.customer_name} - {order.phone}
                </p>
                <p className="text-slate-600">Địa chỉ: {order.address}</p>
                <p className="mt-1 text-xs font-medium text-emerald-700">
                  {order.payment_method}
                </p>
              </div>

              <div className="text-sm">
                <p className="font-semibold text-slate-700">Sản phẩm đặt:</p>
                <ul className="mt-1 space-y-1 text-xs text-slate-600">
                  {order.items.map((item, idx) => (
                    <li key={idx}>
                      • {item.name} x <strong>{item.qty}</strong>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 font-bold text-slate-900">
                  Tổng thu: {order.total_amount.toLocaleString('vi-VN')}đ
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
              <span className="text-xs font-semibold uppercase text-slate-500">
                Trạng thái:{' '}
                <strong className="text-emerald-700">
                  {order.status === 'pending'
                    ? 'Chờ xuất kho FEFO'
                    : order.status === 'shipping'
                    ? 'Đang giao hàng'
                    : 'Đã hoàn thành'}
                </strong>
              </span>

              <div className="flex gap-2">
                {order.status === 'pending' && (
                  <button
                    onClick={() => handleUpdateStatus(order.id, 'shipping')}
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    <Truck size={15} /> Duyệt & Xuất kho FEFO
                  </button>
                )}
                {order.status === 'shipping' && (
                  <button
                    onClick={() => handleUpdateStatus(order.id, 'completed')}
                    className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                  >
                    <CheckCircle size={15} /> Xác nhận đã giao
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}