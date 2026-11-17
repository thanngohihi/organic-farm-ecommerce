
import React, { useState } from 'react';
import {
  ShoppingBag,
  MapPin,
  Truck,
  CheckCircle,
  ArrowRight,
  Plus,
  Minus,
  Trash2
} from 'lucide-react';
import axios from 'axios';

const API_URL = 'http://localhost:8000/api/v1';

export default function CartCheckoutPage({ cartItems, setCartItems }) {
  const [address, setAddress] = useState('');
  const [calcLoading, setCalcLoading] = useState(false);
  const [shippingInfo, setShippingInfo] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState(null);

  // Đảm bảo giỏ hàng luôn là mảng
  const items = Array.isArray(cartItems) ? cartItems : [];

  // Xóa sản phẩm
  const removeFromCart = (id) => {
    setCartItems(prev => prev.filter(item => item.id !== id));
  };

  // Tăng giảm số lượng
  const updateQuantity = (id, delta) => {
    setCartItems(prev =>
      prev.map(item => {
        if (item.id !== id) return item;

        const newQuantity = item.quantity + delta;
        const stock = Number(item.stock);

        if (newQuantity <= 0) return item;

        if (delta > 0 && Number.isFinite(stock) && stock >= 0 &&
            newQuantity > stock) {
          alert('Số lượng vượt quá hàng tồn kho!');
          return item;
        }

        return { ...item, quantity: newQuantity };
      })
    );
  };

  // Tính tiền
  const subtotal = items.reduce(
    (sum, item) =>
      sum + Number(item.price || 0) * Number(item.quantity || 0),
    0
  );

  const shippingFee = Number(shippingInfo?.shipping_fee || 0);
  const total = subtotal + shippingFee;

  // Tính phí vận chuyển
  const handleCalculateShip = async (e) => {
    e.preventDefault();

    if (!address.trim()) {
      alert('Vui lòng nhập địa chỉ giao hàng!');
      return;
    }

    setCalcLoading(true);
    setShippingInfo(null);

    try {
      const res = await axios.post(
        `${API_URL}/shipping/calculate-km`,
        { address: address.trim() }
      );

      if (res.data.shipping_fee === undefined) {
        throw new Error(res.data.message || 'Backend chưa trả về phí vận chuyển');
      }

      setShippingInfo(res.data);
    } catch (err) {
      console.error('Lỗi tính phí vận chuyển:', err);
      alert(
        err.response?.data?.message ||
        err.message ||
        'Không thể tính phí vận chuyển!'
      );
    } finally {
      setCalcLoading(false);
    }
  };

  // Đặt hàng
  const handleCheckout = async () => {
    if (items.length === 0) {
      alert('Giỏ hàng đang trống!');
      return;
    }

    if (!address.trim() || !shippingInfo) {
      alert('Vui lòng nhập địa chỉ và tính phí ship!');
      return;
    }

    setSubmitting(true);

    try {
      const res = await axios.post(
        `${API_URL}/orders/checkout-single`,
        {
          address: address.trim(),
          cart_items: items,
          shipping_fee: shippingFee,
          total_amount: total
        }
      );

      if (res.data.status === 'success') {
        setOrderResult(res.data);
        setCartItems([]);
        setShippingInfo(null);
      } else {
        alert(res.data.message || 'Đặt hàng không thành công!');
      }
    } catch (err) {
      console.error('Lỗi đặt hàng:', err);

      alert(
        'Lỗi khi đặt hàng: ' +
        (err.response?.data?.message || err.message)
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Đặt hàng thành công
  if (orderResult) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-white rounded-3xl shadow-xl border border-emerald-100 text-center">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle size={36} />
        </div>

        <h2 className="text-2xl font-bold text-gray-900">
          Đặt hàng thành công!
        </h2>

        <p className="text-sm text-gray-600 mt-2">
          Mã đơn hàng:
          <strong className="text-emerald-700 font-mono ml-2">
            {orderResult.order_id}
          </strong>
        </p>

        <div className="text-xs text-amber-800 bg-amber-50 p-4 rounded-xl mt-4 border border-amber-200">
          {orderResult.message || 'Đơn hàng đã được ghi nhận.'}
        </div>

        <button
          onClick={() => setOrderResult(null)}
          className="mt-6 px-6 py-2.5 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700"
        >
          Tiếp tục mua sắm
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* GIỎ HÀNG */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">

            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <ShoppingBag className="text-emerald-600" />
              Giỏ Hàng Của Bạn ({items.length})
            </h3>

            {items.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <ShoppingBag size={42} className="mx-auto mb-3 opacity-40" />

                <p className="text-sm">
                  Giỏ hàng của bạn đang trống!
                </p>

                <p className="text-xs mt-2">
                  Hãy quay lại trang chủ để chọn sản phẩm.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {items.map(item => (
                  <div
                    key={item.id}
                    className="py-4 flex items-center justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-gray-900">
                        {item.name}
                      </h4>

                      <p className="text-xs text-gray-500 font-mono mt-1">
                        Lô FEFO: {item.batch_code || 'N/A'}
                      </p>

                      <p className="text-sm font-bold text-emerald-700 mt-1">
                        {Number(item.price || 0).toLocaleString('vi-VN')}đ
                      </p>

                      <p className="text-xs text-gray-500">
                        {item.unit || ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center border rounded-lg overflow-hidden">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, -1)}
                          disabled={item.quantity <= 1}
                          className="px-3 py-2 bg-gray-50 hover:bg-gray-100 disabled:opacity-40"
                          title="Giảm số lượng"
                        >
                          <Minus size={13} />
                        </button>

                        <span className="px-3 text-sm font-bold">
                          {item.quantity}
                        </span>

                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, 1)}
                          disabled={
                            item.stock != null &&
                            item.quantity >= Number(item.stock)
                          }
                          className="px-3 py-2 bg-gray-50 hover:bg-gray-100 disabled:opacity-40"
                          title="Tăng số lượng"
                        >
                          <Plus size={13} />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-500 hover:text-red-700 p-2"
                        title="Xóa sản phẩm khỏi giỏ hàng"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ĐỊA CHỈ GIAO HÀNG */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              <MapPin size={18} className="text-emerald-600" />
              Địa Chỉ Giao Hàng & Tính Phí Ship
            </h3>

            <p className="text-xs text-gray-500 mb-4">
              Nhập địa chỉ nhận hàng để tính phí vận chuyển.
            </p>

            <form
              onSubmit={handleCalculateShip}
              className="flex flex-col sm:flex-row gap-2"
            >
              <input
                type="text"
                required
                placeholder="Nhập địa chỉ giao hàng..."
                className="flex-1 px-4 py-2.5 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                value={address}
                onChange={e => {
                  setAddress(e.target.value);
                  setShippingInfo(null);
                }}
              />

              <button
                type="submit"
                disabled={calcLoading}
                className="px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-50"
              >
                {calcLoading ? 'Đang tính...' : 'Tính phí ship'}
              </button>
            </form>

            {shippingInfo && (
              <div className="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between text-sm">
                <span className="text-gray-700 flex items-center gap-1.5">
                  <Truck size={16} className="text-emerald-600" />
                  Khoảng cách:
                  <strong>{shippingInfo.distance_km} km</strong>
                </span>

                <span className="font-bold text-emerald-700">
                  Phí giao: {shippingFee.toLocaleString('vi-VN')}đ
                </span>
              </div>
            )}
          </div>
        </div>

        {/* THANH TOÁN */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit space-y-4">
          <h3 className="font-bold text-gray-900 border-b pb-3">
            Thanh Toán Đơn Hàng
          </h3>

          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Số loại sản phẩm:</span>
              <span className="font-semibold text-gray-800">
                {items.length}
              </span>
            </div>

            <div className="flex justify-between">
              <span>Tạm tính nông sản:</span>
              <span className="font-semibold text-gray-800">
                {subtotal.toLocaleString('vi-VN')}đ
              </span>
            </div>

            <div className="flex justify-between">
              <span>Phí vận chuyển:</span>
              <span className="font-semibold text-gray-800">
                {shippingInfo
                  ? `${shippingFee.toLocaleString('vi-VN')}đ`
                  : 'Chưa tính'}
              </span>
            </div>
          </div>

          <div className="border-t pt-3 flex justify-between items-baseline">
            <span className="font-bold text-gray-900">
              Tổng tiền:
            </span>

            <span className="text-2xl font-extrabold text-emerald-700">
              {total.toLocaleString('vi-VN')}đ
            </span>
          </div>

          <button
            type="button"
            onClick={handleCheckout}
            disabled={
              submitting ||
              items.length === 0 ||
              !shippingInfo
            }
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          >
            {submitting
              ? 'Đang lưu vào MySQL...'
              : 'Xác Nhận Đặt Hàng Thật'}

            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
