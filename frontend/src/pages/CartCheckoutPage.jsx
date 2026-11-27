
import React, { useEffect, useRef, useState } from 'react';
import {
  ShoppingBag,
  MapPin,
  Truck,
  CheckCircle,
  ArrowRight,
  Plus,
  Minus,
  Trash2,
  Loader2,
  Ticket,
  Gift,
  CreditCard,
  ExternalLink,
  Clock,
  RefreshCw,
  XCircle,
  Flame
} from 'lucide-react';

import axios from 'axios';
import { getAuthHeaders, showToast } from '../services/api';
import DeliveryAddressMap from '../components/DeliveryAddressMap';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';

// Lấy token đăng nhập
const getAuthConfig = () => {
  const headers = getAuthHeaders();
  return Object.keys(headers).length > 0
    ? { headers: { Accept: 'application/json', ...headers } }
    : { headers: { Accept: 'application/json' } };
};

// ---------------------------------------------
// COMPONENT CHÍNH
// ---------------------------------------------

export default function CartCheckoutPage({
  cartItems,
  setCartItems,
  currentUser = null,
}) {
  const [address, setAddress] = useState(
    () => currentUser?.address || ''
  );
  const [coordinates, setCoordinates] = useState(() => {
    const lat = Number(currentUser?.latitude);
    const lng = Number(currentUser?.longitude);
    return Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)
      ? { lat, lng }
      : null;
  });
  const lastProfileAddressRef = useRef(currentUser?.address || '');

  const [calcLoading, setCalcLoading] = useState(false);
  const [shippingInfo, setShippingInfo] = useState(null);
  const [shippingType, setShippingType] = useState('binh_thuong');
  const [updatingItemId, setUpdatingItemId] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState(null);

  // Voucher Loyalty & Phương thức thanh toán
  const [myVouchers, setMyVouchers] = useState([]);
  const [selectedVoucherCode, setSelectedVoucherCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [pendingMoMo, setPendingMoMo] = useState(() => {
    try {
      const saved = localStorage.getItem('organic_pending_momo_cart');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [checkingMoMo, setCheckingMoMo] = useState(false);
  const [cancelingMoMo, setCancelingMoMo] = useState(false);

  const items = Array.isArray(cartItems) ? cartItems : [];

  const fetchUnusedVouchers = async () => {
    try {
      const res = await axios.get(
        `${API_URL}/customer/loyalty`,
        getAuthConfig()
      );
      const list = res.data?.data?.my_vouchers || [];
      setMyVouchers(
        Array.isArray(list)
          ? list.filter((v) => v.status === 'chua_dung')
          : []
      );
    } catch {
      // Guest hoặc chưa có token thì bỏ qua
    }
  };

  useEffect(() => {
    fetchUnusedVouchers();
  }, []);

  const verifyPendingMoMoStatus = async (orderCode, silent = true) => {
    if (!orderCode) return;
    if (!silent) setCheckingMoMo(true);
    try {
      const res = await axios.get(
        `${API_URL}/customer/orders/status/${encodeURIComponent(orderCode)}`,
        getAuthConfig()
      );
      const ord = res.data?.data;
      if (ord?.payment_status === 'da_thanh_toan') {
        localStorage.removeItem('organic_pending_momo_cart');
        setPendingMoMo(null);
        setOrderResult({ status: 'success', data: ord });
        setCartItems([]);
        setShippingInfo(null);
        setSelectedVoucherCode('');
        fetchUnusedVouchers();
      } else if (ord?.order_status === 'da_huy') {
        localStorage.removeItem('organic_pending_momo_cart');
        setPendingMoMo(null);
        if (!silent) {
          alert('Giao dịch MoMo đã bị hủy.');
        }
      } else if (!silent) {
        alert('Chưa ghi nhận thanh toán MoMo thành công. Vui lòng hoàn tất thanh toán trên cổng MoMo.');
      }
    } catch (err) {
      if (err.response?.status === 404) {
        localStorage.removeItem('organic_pending_momo_cart');
        setPendingMoMo(null);
      } else if (!silent) {
        alert(err.response?.data?.message || 'Không thể kiểm tra trạng thái thanh toán MoMo.');
      }
    } finally {
      if (!silent) setCheckingMoMo(false);
    }
  };

  useEffect(() => {
    const code = pendingMoMo?.order_code;
    if (!code) return;
    verifyPendingMoMoStatus(code, true);
    const intervalId = setInterval(() => {
      verifyPendingMoMoStatus(code, true);
    }, 3000);
    return () => clearInterval(intervalId);
  }, [pendingMoMo?.order_code]);

  const handleCancelPendingMoMo = async () => {
    if (!pendingMoMo?.order_code) return;
    setCancelingMoMo(true);
    try {
      await axios.post(
        `${API_URL}/customer/orders/${encodeURIComponent(pendingMoMo.order_code)}/cancel-pending-momo`,
        {},
        getAuthConfig()
      );
      localStorage.removeItem('organic_pending_momo_cart');
      setPendingMoMo(null);
      fetchUnusedVouchers();
    } catch (err) {
      if (err.response?.status === 422) {
        await verifyPendingMoMoStatus(pendingMoMo.order_code, false);
      } else {
        alert(err.response?.data?.message || 'Không thể hủy giao dịch MoMo lúc này.');
      }
    } finally {
      setCancelingMoMo(false);
    }
  };

  useEffect(() => {
    const profileAddr = String(currentUser?.address || '').trim();
    const prevProfileAddr = String(lastProfileAddressRef.current || '').trim();

    if (
      profileAddr &&
      (!String(address || '').trim() || String(address || '').trim() === prevProfileAddr)
    ) {
      setAddress(profileAddr);
      setShippingInfo(null);

      const lat = Number(currentUser?.latitude);
      const lng = Number(currentUser?.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) {
        setCoordinates({ lat, lng });
      }
    }

    lastProfileAddressRef.current = profileAddr;
  }, [currentUser?.address, currentUser?.latitude, currentUser?.longitude]);

  // ---------------------------------------------
  // XÓA SẢN PHẨM
  // ---------------------------------------------

  const removeFromCart = (id) => {
    setCartItems(prev =>
      prev.filter(item => item.id !== id)
    );

    setShippingInfo(null);
  };

  // ---------------------------------------------
  // TĂNG / GIẢM SỐ LƯỢNG
  // ---------------------------------------------

  const updateQuantity = async (id, delta) => {
    const targetItem = items.find((item) => item.id === id);
    if (!targetItem) return;

    const newQuantity = Number(targetItem.quantity) + delta;
    if (newQuantity <= 0) return;

    if (delta > 0) {
      setUpdatingItemId(id);
      try {
        const res = await axios.get(
          `${API_URL}/products/${encodeURIComponent(id)}/stock`,
          { params: { requested_quantity: newQuantity } }
        );
        const stockInfo = res.data?.data;
        const liveStock = Number(stockInfo?.available_stock ?? targetItem.stock ?? 0);

        if (!stockInfo?.sufficient || newQuantity > liveStock) {
          showToast(
            `Tồn kho "${targetItem.name}" hiện chỉ còn ${liveStock} ${targetItem.unit || 'kg'}.`,
            'error'
          );
          setCartItems((prev) =>
            prev.map((item) =>
              item.id === id ? { ...item, stock: liveStock } : item
            )
          );
          return;
        }

        setCartItems((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  quantity: newQuantity,
                  stock: liveStock,
                  batch_code: stockInfo?.fefo_batch_code || item.batch_code,
                }
              : item
          )
        );
        setShippingInfo(null);
        showToast(`Đã cập nhật "${targetItem.name}" (${newQuantity} ${targetItem.unit || 'kg'}).`, 'success');
      } catch (err) {
        showToast(
          err.response?.data?.message || 'Không thể kiểm tra tồn kho sản phẩm lúc này.',
          'error'
        );
      } finally {
        setUpdatingItemId(null);
      }
      return;
    }

    setCartItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantity: newQuantity } : item
      )
    );
    setShippingInfo(null);
    showToast(`Đã cập nhật "${targetItem.name}" (${newQuantity} ${targetItem.unit || 'kg'}).`, 'success');
  };

  // ---------------------------------------------
  // TÍNH TIỀN
  // ---------------------------------------------

  const subtotal = items.reduce(
    (sum, item) =>
      sum +
      Number(item.price || 0) *
      Number(item.quantity || 0),
    0
  );

  const shippingFee = Number(
    shippingInfo?.shipping_fee || 0
  );

  const selectedVoucher =
    myVouchers.find((v) => v.voucher_code === selectedVoucherCode) || null;

  const voucherDiscount = (() => {
    if (!selectedVoucher) return 0;
    if (selectedVoucher.voucher_type === 'free_ship') {
      return shippingInfo
        ? Math.min(shippingFee, Number(selectedVoucher.discount_amount || 20000))
        : 0;
    }
    if (selectedVoucher.voucher_type === 'percent_discount') {
      return Math.min(50000, Math.round(subtotal * 0.1));
    }
    return 0;
  })();

  const total = Math.max(0, subtotal + shippingFee - voucherDiscount);

  // ---------------------------------------------
  // NHẬP ĐỊA CHỈ & TỌA ĐỘ
  // ---------------------------------------------

  const handleAddressChange = (value) => {
    setAddress(value);
    setShippingInfo(null);
  };

  const handleCoordinatesChange = (coords) => {
    setCoordinates(coords);
    setShippingInfo(null);
  };

  // ---------------------------------------------
  // TÍNH PHÍ SHIP
  // ---------------------------------------------

  const calculateShipping = async (
    deliveryAddress,
    targetShippingType = shippingType,
    targetCoordinates = coordinates
  ) => {
    setCalcLoading(true);
    setShippingInfo(null);

    try {
      const res = await axios.post(
        `${API_URL}/shipping/calculate-km`,
        {
          customer_address: deliveryAddress,
          latitude: targetCoordinates?.lat ?? null,
          longitude: targetCoordinates?.lng ?? null,
          shipping_type: targetShippingType,
        },
        getAuthConfig()
      );

      const data = res.data?.data ?? res.data;

      if (data.shipping_fee === undefined) {
        throw new Error(
          data.message ||
          'Backend chưa trả về phí vận chuyển.'
        );
      }

      setShippingInfo(data);
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

  const handleSelectShippingType = async (nextType) => {
    if (nextType === shippingType) return;
    setShippingType(nextType);
    const deliveryAddress = String(address || '').trim();
    if (shippingInfo && deliveryAddress) {
      await calculateShipping(deliveryAddress, nextType, coordinates);
    }
  };

  const handleCalculateShip = async (e) => {
    e.preventDefault();

    const deliveryAddress = String(address || '').trim();

    if (!deliveryAddress) {
      alert('Vui lòng nhập hoặc chọn địa chỉ giao hàng trên bản đồ!');
      return;
    }

    await calculateShipping(deliveryAddress, shippingType, coordinates);
  };

  // ---------------------------------------------
  // ĐẶT HÀNG
  // ---------------------------------------------

  const handleCheckout = async () => {
    if (items.length === 0) {
      alert('Giỏ hàng đang trống!');
      return;
    }

    const deliveryAddress = String(address || '').trim();

    if (!deliveryAddress) {
      alert('Vui lòng nhập địa chỉ giao hàng!');
      return;
    }

    if (!shippingInfo) {
      alert('Vui lòng tính phí vận chuyển trước!');
      return;
    }

    setSubmitting(true);

    try {
      const res = await axios.post(
        `${API_URL}/customer/orders/checkout-single`,
        {
          delivery_address: deliveryAddress,
          distance_km: Number(shippingInfo.distance_km ?? 0),
          shipping_type: shippingType,
          payment_method: paymentMethod,
          voucher_code: selectedVoucherCode || null,
          items: items.map((item) => ({
            product_id: Number(item.id),
            quantity: Number(item.quantity),
          })),
        },
        getAuthConfig()
      );

      const data = res.data;

      if (
        data.status === 'success' ||
        data.success === true
      ) {
        if (
          paymentMethod === 'momo' &&
          data.data?.payment_method === 'momo' &&
          data.data?.payment_status !== 'da_thanh_toan'
        ) {
          const pendingPayload = {
            order_code: data.data.order_code,
            payment_url: data.data.payment_url,
            qr_code_url: data.data.qr_code_url,
            total_amount: data.data.total_amount,
            applied_voucher: data.data.applied_voucher || null,
          };
          localStorage.setItem(
            'organic_pending_momo_cart',
            JSON.stringify(pendingPayload)
          );
          setPendingMoMo(pendingPayload);
        } else {
          localStorage.removeItem('organic_pending_momo_cart');
          setPendingMoMo(null);
          setOrderResult(data);
          setCartItems([]);
          setShippingInfo(null);
          setSelectedVoucherCode('');
          fetchUnusedVouchers();
        }
      } else {
        alert(
          data.message ||
          'Đặt hàng không thành công!'
        );
      }
    } catch (err) {
      console.error('Lỗi đặt hàng:', err);

      alert(
        'Lỗi khi đặt hàng: ' +
        (
          err.response?.data?.message ||
          err.message
        )
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------------------------------
  // CHỜ THANH TOÁN VÍ MOMO (CHƯA ĐẶT HÀNG THÀNH CÔNG)
  // ---------------------------------------------

  if (pendingMoMo && !orderResult) {
    return (
      <div className="max-w-2xl mx-auto my-12 px-4">
        <div className="p-8 bg-white rounded-3xl shadow-xl border border-pink-100 text-center">
          <div className="w-16 h-16 bg-pink-100 text-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock size={34} />
          </div>

          <h2 className="text-2xl font-bold text-gray-900">
            Chờ thanh toán qua Ví MoMo
          </h2>

          <p className="text-sm text-gray-600 mt-2">
            Mã giao dịch:
            <strong className="text-pink-700 font-mono ml-2">
              {pendingMoMo.order_code}
            </strong>
          </p>

          <p className="text-xs text-gray-500 mt-2 max-w-md mx-auto">
            Đơn hàng chỉ chuyển sang trạng thái đặt hàng thành công và làm trống giỏ hàng sau khi bạn hoàn tất thanh toán trên cổng Ví MoMo.
          </p>

          {pendingMoMo.applied_voucher && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800">
              <p className="font-bold">
                Đã tạm giữ voucher: {pendingMoMo.applied_voucher.voucher_name} (
                {pendingMoMo.applied_voucher.voucher_code})
              </p>
            </div>
          )}

          {pendingMoMo.payment_url && (
            <div className="mt-5 rounded-2xl border border-pink-200 bg-pink-50/70 p-5 text-center">
              <p className="text-xs font-bold text-pink-700">
                Quét mã QR hoặc mở cổng thanh toán MoMo để xác nhận
              </p>
              {pendingMoMo.qr_code_url && (
                <img
                  src={pendingMoMo.qr_code_url}
                  alt="QR MoMo"
                  className="mx-auto my-3 h-36 w-36 rounded-xl border border-pink-200 bg-white p-1.5"
                />
              )}
              <a
                href={pendingMoMo.payment_url}
                className="inline-flex items-center gap-1.5 rounded-xl bg-pink-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-pink-700"
              >
                Tiếp tục thanh toán MoMo
                <ExternalLink size={15} />
              </a>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 mt-6 justify-center">
            <button
              type="button"
              onClick={() => verifyPendingMoMoStatus(pendingMoMo.order_code, false)}
              disabled={checkingMoMo || cancelingMoMo}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-60"
            >
              {checkingMoMo ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Kiểm tra thanh toán
            </button>

            <button
              type="button"
              onClick={handleCancelPendingMoMo}
              disabled={cancelingMoMo || checkingMoMo}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 border border-rose-200 bg-rose-50 text-rose-700 font-semibold rounded-xl hover:bg-rose-100 disabled:opacity-60"
            >
              {cancelingMoMo ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
              Hủy giao dịch &amp; giữ giỏ hàng
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------
  // ĐẶT HÀNG THÀNH CÔNG
  // ---------------------------------------------

  if (orderResult) {
    return (
      <div className="max-w-2xl mx-auto my-12 px-4">
        <div className="p-8 bg-white rounded-3xl shadow-xl border border-emerald-100 text-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={36} />
          </div>

          <h2 className="text-2xl font-bold text-gray-900">
            {orderResult.data?.payment_method === 'momo'
              ? 'Thanh toán MoMo & Đặt hàng thành công!'
              : 'Đặt hàng thành công!'}
          </h2>

          <p className="text-sm text-gray-600 mt-3">
            Mã đơn hàng:
            <strong className="text-emerald-700 font-mono ml-2">
              {orderResult.data?.order_code ??
                orderResult.order_id ??
                orderResult.data?.order_id ??
                orderResult.data?.id ??
                orderResult.id ??
                'Đã ghi nhận'}
            </strong>
          </p>

          {orderResult.data?.applied_voucher && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800">
              <p className="font-bold">
                Đã áp dụng voucher: {orderResult.data.applied_voucher.voucher_name} (
                {orderResult.data.applied_voucher.voucher_code})
              </p>
              {orderResult.data.applied_voucher.gift_note && (
                <p className="mt-1 font-semibold text-emerald-700">
                  🎁 {orderResult.data.applied_voucher.gift_note}
                </p>
              )}
            </div>
          )}

          <p className="text-sm text-gray-500 mt-2">
            Đơn hàng của bạn đã được ghi nhận.
            Bạn có thể theo dõi trạng thái đơn trong lịch sử.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mt-6 justify-center">
            <button
              type="button"
              onClick={() => setOrderResult(null)}
              className="px-6 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700"
            >
              Tiếp tục mua sắm
            </button>

            <button
              type="button"
              onClick={() => {
                setOrderResult(null);
                window.dispatchEvent(
                  new CustomEvent('organic:navigate', {
                    detail: { page: 'transactions' },
                  })
                );
              }}
              className="px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200"
            >
              Theo dõi đơn hàng
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------
  // GIAO DIỆN CHÍNH
  // ---------------------------------------------

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* ======================================= */}
      {/* GIỎ HÀNG & THANH TOÁN */}
      {/* ======================================= */}

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
                  <ShoppingBag
                    size={42}
                    className="mx-auto mb-3 opacity-40"
                  />

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
                        {/* SỐ LƯỢNG */}
                        <div className="flex items-center border rounded-lg overflow-hidden">
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(item.id, -1)
                            }
                            disabled={item.quantity <= 1 || updatingItemId === item.id}
                            className="px-3 py-2 bg-gray-50 hover:bg-gray-100 disabled:opacity-40"
                            title="Giảm số lượng"
                          >
                            <Minus size={13} />
                          </button>

                          <span className="px-3 text-sm font-bold min-w-[36px] text-center">
                            {updatingItemId === item.id ? (
                              <Loader2 size={14} className="inline animate-spin text-emerald-600" />
                            ) : (
                              item.quantity
                            )}
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(item.id, 1)
                            }
                            disabled={
                              updatingItemId === item.id ||
                              (item.stock != null &&
                                item.quantity >= Number(item.stock))
                            }
                            className="px-3 py-2 bg-gray-50 hover:bg-gray-100 disabled:opacity-40"
                            title="Tăng số lượng"
                          >
                            <Plus size={13} />
                          </button>
                        </div>

                        {/* XÓA */}
                        <button
                          type="button"
                          onClick={() =>
                            removeFromCart(item.id)
                          }
                          className="text-red-500 hover:text-red-700 p-2"
                          title="Xóa sản phẩm"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* =================================== */}
            {/* ĐỊA CHỈ GIAO HÀNG */}
            {/* =================================== */}

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                <MapPin
                  size={18}
                  className="text-emerald-600"
                />
                Địa Chỉ Giao Hàng
              </h3>

              <p className="text-xs text-gray-500 mb-4">
                Nhập địa chỉ hoặc chọn trực tiếp trên bản đồ.
              </p>

              <DeliveryAddressMap
                address={address}
                onAddressChange={handleAddressChange}
                coordinates={coordinates}
                onCoordinatesChange={handleCoordinatesChange}
                placeholder="Nhập địa chỉ giao hàng..."
              />

              {/* ================================= */}
              {/* HÌNH THỨC GIAO HÀNG */}
              {/* ================================= */}

              <div className="mt-5">
                <p className="text-xs font-bold text-gray-700 mb-2">
                  Chọn hình thức giao hàng
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={calcLoading}
                    onClick={() => handleSelectShippingType('binh_thuong')}
                    className={`rounded-xl border p-3.5 text-left transition ${
                      shippingType === 'binh_thuong'
                        ? 'border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-900">
                        <Truck size={16} className="text-emerald-600" />
                        Giao hàng bình thường
                      </span>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        Tiết kiệm
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Giao tiêu chuẩn theo tuyến (nội vùng trong ngày/sáng mai, liên tỉnh 1–4 ngày).
                    </p>
                  </button>

                  <button
                    type="button"
                    disabled={calcLoading}
                    onClick={() => handleSelectShippingType('hoa_toc')}
                    className={`rounded-xl border p-3.5 text-left transition ${
                      shippingType === 'hoa_toc'
                        ? 'border-rose-600 bg-rose-50 ring-1 ring-rose-600'
                        : 'border-gray-200 bg-white hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-900">
                        <Flame size={16} className="text-rose-600" />
                        Giao hàng hỏa tốc
                      </span>
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                        Nhanh nhất
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Ưu tiên xử lý ngay (nội vùng giao trong giờ, liên tỉnh lạnh/hàng không 1–2 ngày).
                    </p>
                  </button>
                </div>
              </div>

              {/* ================================= */}
              {/* TÍNH SHIP */}
              {/* ================================= */}

              <form
                onSubmit={handleCalculateShip}
                className="mt-5"
              >
                <button
                  type="submit"
                  disabled={calcLoading}
                  className="w-full px-5 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {calcLoading ? (
                    <>
                      <Loader2
                        size={18}
                        className="animate-spin"
                      />
                      Đang tính phí vận chuyển...
                    </>
                  ) : (
                    <>
                      <Truck size={18} />
                      Tính phí vận chuyển
                    </>
                  )}
                </button>
              </form>

              {/* ================================= */}
              {/* KẾT QUẢ TÍNH SHIP */}
              {/* ================================= */}

              {shippingInfo && (
                <div className="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2">
                  <div className="flex justify-between items-center text-sm gap-3">
                    <span className="text-gray-700">
                      <Truck
                        size={16}
                        className="inline text-emerald-600 mr-1"
                      />
                      Khoảng cách
                    </span>

                    <strong>
                      {shippingInfo.distance_km ?? 'N/A'} km
                    </strong>
                  </div>

                  {shippingInfo.shipping_method && (
                    <div className="flex justify-between items-center text-sm gap-3">
                      <span className="text-gray-700">Hình thức giao</span>
                      <strong className="text-right text-slate-800">
                        {shippingInfo.shipping_method}
                      </strong>
                    </div>
                  )}

                  {(shippingInfo.estimated_delivery || shippingInfo.duration_text) && (
                    <div className="flex justify-between items-center text-sm gap-3">
                      <span className="text-gray-700">Dự kiến giao tới</span>
                      <strong className="text-right text-emerald-800">
                        {shippingInfo.estimated_delivery || shippingInfo.duration_text}
                      </strong>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-sm gap-3 border-t border-emerald-200/70 pt-2">
                    <span className="text-gray-700">
                      Phí vận chuyển
                    </span>

                    <strong className="text-emerald-700">
                      {shippingFee.toLocaleString('vi-VN')}đ
                    </strong>
                  </div>

                  {shippingInfo.message && (
                    <p className="text-xs text-gray-500">
                      {shippingInfo.message}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* =================================== */}
          {/* THANH TOÁN */}
          {/* =================================== */}

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-fit space-y-4">
            <h3 className="font-bold text-gray-900 border-b pb-3">
              Thanh Toán Đơn Hàng
            </h3>

            {/* VOUCHER & QUÀ TẶNG LOYALTY */}
            <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 space-y-2">
              <label className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                <Ticket size={15} className="text-amber-600" />
                Áp dụng Voucher / Quà tặng đã đổi
              </label>

              {myVouchers.length === 0 ? (
                <p className="text-[11px] text-amber-800/80">
                  Bạn chưa có voucher khả dụng. Hãy vào mục Điểm Loyalty để đổi ưu đãi hoặc quà tặng 1kg!
                </p>
              ) : (
                <select
                  value={selectedVoucherCode}
                  onChange={(e) => setSelectedVoucherCode(e.target.value)}
                  className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500"
                >
                  <option value="">-- Không áp dụng voucher --</option>
                  {myVouchers.map((v) => (
                    <option key={v.id} value={v.voucher_code}>
                      [{v.voucher_code}] {v.voucher_name}
                    </option>
                  ))}
                </select>
              )}

              {selectedVoucher?.voucher_type === 'free_gift' && (
                <div className="flex items-center gap-1.5 rounded-lg bg-emerald-100 px-2.5 py-2 text-xs font-semibold text-emerald-800">
                  <Gift size={14} className="shrink-0" />
                  <span>
                    Tặng kèm 1 {selectedVoucher.gift_product?.unit || 'kg'}{' '}
                    {selectedVoucher.gift_product?.name || 'Cà Chua Cherry VietGAP'} (0đ - xuất kho FEFO)
                  </span>
                </div>
              )}
            </div>

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

              {voucherDiscount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Giảm giá Voucher:</span>
                  <span className="font-bold">
                    -{voucherDiscount.toLocaleString('vi-VN')}đ
                  </span>
                </div>
              )}
            </div>

            {/* TỔNG */}
            <div className="border-t pt-3 flex justify-between items-baseline gap-3">
              <span className="font-bold text-gray-900">
                Tổng tiền:
              </span>

              <span className="text-2xl font-extrabold text-emerald-700">
                {total.toLocaleString('vi-VN')}đ
              </span>
            </div>

            {/* DỰ KIẾN THỜI GIAN GIAO TỚI (GIỐNG ĐỊNH KỲ) */}
            <div
              className={`rounded-xl p-3 text-xs ${
                shippingInfo
                  ? shippingType === 'hoa_toc'
                    ? 'bg-rose-50 text-rose-800'
                    : 'bg-emerald-50 text-emerald-700'
                  : 'bg-slate-50 text-slate-600'
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                {shippingType === 'hoa_toc' ? (
                  <Flame size={17} className="text-rose-600" />
                ) : (
                  <Truck size={17} className="text-emerald-600" />
                )}
                <span className="font-bold">
                  {shippingType === 'hoa_toc'
                    ? 'Giao hàng hỏa tốc'
                    : 'Giao hàng bình thường'}
                </span>
              </div>
              {shippingInfo ? (
                <div className="space-y-1">
                  <p>
                    Dự kiến giao tới:{' '}
                    <strong>
                      {shippingInfo.estimated_delivery || shippingInfo.duration_text}
                    </strong>
                  </p>
                  {shippingInfo.shipping_method && (
                    <p className="text-[11px] opacity-90">
                      Hình thức: {shippingInfo.shipping_method} ({shippingInfo.distance_km ?? 0} km)
                    </p>
                  )}
                </div>
              ) : (
                <p>
                  Dự kiến thời gian giao tới sẽ hiển thị sau khi bạn bấm{' '}
                  <strong>Tính phí vận chuyển</strong>.
                </p>
              )}
            </div>

            {/* PHƯƠNG THỨC THANH TOÁN */}
            <div className="space-y-2 border-t border-gray-100 pt-3">
              <p className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                <CreditCard size={15} className="text-emerald-600" />
                Phương thức thanh toán
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cod')}
                  className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
                    paymentMethod === 'cod'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Tiền mặt (COD)
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('momo')}
                  className={`rounded-xl border px-3 py-2 text-xs font-bold transition ${
                    paymentMethod === 'momo'
                      ? 'border-pink-600 bg-pink-50 text-pink-700'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Ví MoMo
                </button>
              </div>
            </div>

            {/* ĐẶT HÀNG */}
            <button
              type="button"
              onClick={handleCheckout}
              disabled={
                submitting ||
                items.length === 0 ||
                !shippingInfo
              }
              className={`w-full py-3 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 text-sm disabled:opacity-50 ${
                paymentMethod === 'momo'
                  ? 'bg-pink-600 hover:bg-pink-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {submitting ? (
                <>
                  <Loader2
                    size={18}
                    className="animate-spin"
                  />
                  Đang đặt hàng...
                </>
              ) : (
                <>
                  Xác nhận đặt hàng
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            {!shippingInfo && (
              <p className="text-xs text-amber-600 text-center">
                Vui lòng nhập địa chỉ và tính phí ship trước khi đặt hàng.
              </p>
            )}

            <div className="text-xs text-gray-400 text-center">
              Đơn hàng được lưu vào hệ thống sau khi xác nhận.
            </div>
          </div>
        </div>
    </div>
  );
}
