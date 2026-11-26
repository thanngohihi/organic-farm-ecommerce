
import React, { useEffect, useState } from 'react';
import {
  ShoppingBag,
  MapPin,
  Truck,
  CheckCircle,
  ArrowRight,
  Plus,
  Minus,
  Trash2,
  Clock,
  Package,
  RefreshCw,
  Loader2,
  ClipboardList,
  XCircle,
  LocateFixed,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

import axios from 'axios';

import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap
} from 'react-leaflet';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const API_URL = 'http://localhost:8000/api/v1';

// Vị trí mặc định: TP. Hồ Chí Minh
const DEFAULT_CENTER = [10.762622, 106.660172];

// Sửa lỗi Marker Leaflet
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Lấy token đăng nhập
const getAuthConfig = () => {
  try {
    const user = JSON.parse(
      localStorage.getItem('currentUser') || '{}'
    );

    const token =
      localStorage.getItem('token') ||
      localStorage.getItem('auth_token') ||
      user.token;

    return token
      ? {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      : {};
  } catch {
    return {};
  }
};

// ---------------------------------------------
// COMPONENT CLICK BẢN ĐỒ
// ---------------------------------------------

function MapClickHandler({ onSelectLocation }) {
  useMapEvents({
    click(event) {
      onSelectLocation(event.latlng);
    },
  });

  return null;
}

// ---------------------------------------------
// COMPONENT DI CHUYỂN BẢN ĐỒ
// ---------------------------------------------

function MapController({ coordinates }) {
  const map = useMap();

  useEffect(() => {
    if (!coordinates) return;

    map.flyTo(
      [coordinates.lat, coordinates.lng],
      16,
      {
        duration: 0.5,
      }
    );
  }, [coordinates?.lat, coordinates?.lng, map]);

  // Khi bản đồ được mở lại, Leaflet cần cập nhật kích thước
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);

    return () => clearTimeout(timer);
  }, [map]);

  return null;
}

// ---------------------------------------------
// COMPONENT CHÍNH
// ---------------------------------------------

export default function CartCheckoutPage({
  cartItems,
  setCartItems
}) {
  const [address, setAddress] = useState('');
  const [coordinates, setCoordinates] = useState(null);

  const [calcLoading, setCalcLoading] = useState(false);
  const [shippingInfo, setShippingInfo] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [orderResult, setOrderResult] = useState(null);

  const [activeTab, setActiveTab] = useState('checkout');

  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');

  const [selectedOrder, setSelectedOrder] = useState(null);

  const [mapLoading, setMapLoading] = useState(false);
  const [addressError, setAddressError] = useState('');

  // Bản đồ ẩn mặc định
  const [mapVisible, setMapVisible] = useState(false);

  const items = Array.isArray(cartItems) ? cartItems : [];

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

  const updateQuantity = (id, delta) => {
    setCartItems(prev =>
      prev.map(item => {
        if (item.id !== id) return item;

        const newQuantity =
          Number(item.quantity) + delta;

        const stock = Number(item.stock);

        if (newQuantity <= 0) return item;

        if (
          delta > 0 &&
          Number.isFinite(stock) &&
          stock >= 0 &&
          newQuantity > stock
        ) {
          alert('Số lượng vượt quá hàng tồn kho!');
          return item;
        }

        return {
          ...item,
          quantity: newQuantity,
        };
      })
    );

    setShippingInfo(null);
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

  const total = subtotal + shippingFee;

  // ---------------------------------------------
  // CHỌN VỊ TRÍ TRÊN MAP
  // ---------------------------------------------

  const handleMapSelect = async (latlng) => {
    const lat = Number(latlng.lat);
    const lng = Number(latlng.lng);

    setCoordinates({ lat, lng });

    setShippingInfo(null);
    setAddressError('');
    setMapLoading(true);

    // Cập nhật tọa độ ngay lập tức
    setAddress(
      `${lat.toFixed(6)}, ${lng.toFixed(6)}`
    );

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
      );

      if (!response.ok) {
        throw new Error(
          'Không thể lấy địa chỉ từ bản đồ.'
        );
      }

      const result = await response.json();

      if (result.display_name) {
        setAddress(result.display_name);
      }
    } catch (error) {
      console.error('Lỗi lấy địa chỉ:', error);

      setAddressError(
        'Không lấy được địa chỉ chi tiết. Tọa độ vẫn được lưu.'
      );
    } finally {
      setMapLoading(false);
    }
  };

  // ---------------------------------------------
  // NHẬP ĐỊA CHỈ
  // ---------------------------------------------

  const handleAddressChange = (value) => {
    setAddress(value);

    setShippingInfo(null);
    setCoordinates(null);
    setAddressError('');
  };

  // ---------------------------------------------
  // TÌM ĐỊA CHỈ TRÊN MAP
  // ---------------------------------------------

  const handleSearchAddressOnMap = async () => {
    const searchAddress = String(address || '').trim();

    if (!searchAddress) {
      alert('Vui lòng nhập địa chỉ!');
      return;
    }

    setMapLoading(true);
    setAddressError('');
    setShippingInfo(null);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(searchAddress)}&limit=1`
      );

      if (!response.ok) {
        throw new Error('Không thể tìm vị trí.');
      }

      const result = await response.json();

      if (!result || result.length === 0) {
        throw new Error('Không tìm thấy địa chỉ.');
      }

      const lat = Number(result[0].lat);
      const lng = Number(result[0].lon);

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        throw new Error('Tọa độ không hợp lệ.');
      }

      setCoordinates({
        lat,
        lng,
      });

      setAddress(
        result[0].display_name || searchAddress
      );

      // Tìm địa chỉ xong tự mở bản đồ
      setMapVisible(true);
    } catch (error) {
      console.error('Lỗi tìm địa chỉ:', error);

      setAddressError(
        error.message || 'Không tìm được vị trí.'
      );
    } finally {
      setMapLoading(false);
    }
  };

  // ---------------------------------------------
  // TÍNH PHÍ SHIP
  // ---------------------------------------------

  const handleCalculateShip = async (e) => {
    e.preventDefault();

    const deliveryAddress = String(address || '').trim();

    if (!deliveryAddress) {
      alert('Vui lòng nhập địa chỉ giao hàng!');
      return;
    }

    if (items.length === 0) {
      alert('Giỏ hàng đang trống!');
      return;
    }

    setCalcLoading(true);
    setShippingInfo(null);

    try {
      const res = await axios.post(
        `${API_URL}/shipping/calculate-km`,
        {
          address: deliveryAddress,
          latitude: coordinates?.lat ?? null,
          longitude: coordinates?.lng ?? null,
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
        `${API_URL}/orders/checkout-single`,
        {
          address: deliveryAddress,

          latitude: coordinates?.lat ?? null,
          longitude: coordinates?.lng ?? null,

          cart_items: items,

          shipping_fee: shippingFee,

          total_amount: total,
        },
        getAuthConfig()
      );

      const data = res.data;

      if (
        data.status === 'success' ||
        data.success === true
      ) {
        setOrderResult(data);

        setCartItems([]);

        setShippingInfo(null);
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
  // LỊCH SỬ ĐƠN HÀNG
  // ---------------------------------------------

  const fetchOrders = async () => {
    setOrdersLoading(true);
    setOrdersError('');

    try {
      const res = await axios.get(
        `${API_URL}/orders/my-orders`,
        getAuthConfig()
      );

      const data = res.data?.data ?? res.data;

      setOrders(
        Array.isArray(data)
          ? data
          : Array.isArray(data?.orders)
            ? data.orders
            : []
      );
    } catch (err) {
      console.error('Lỗi tải lịch sử đơn hàng:', err);

      setOrdersError(
        err.response?.data?.message ||
        'Không thể tải lịch sử đơn hàng. Kiểm tra API Backend.'
      );
    } finally {
      setOrdersLoading(false);
    }
  };

  // Tải lịch sử khi mở tab
  useEffect(() => {
    if (activeTab === 'history') {
      fetchOrders();
    }
  }, [activeTab]);

  // ---------------------------------------------
  // TRẠNG THÁI ĐƠN HÀNG
  // ---------------------------------------------

  const orderStatuses = [
    {
      value: 'pending',
      label: 'Chờ xác nhận',
      icon: Clock,
    },
    {
      value: 'confirmed',
      label: 'Đã xác nhận',
      icon: CheckCircle,
    },
    {
      value: 'processing',
      label: 'Đang chuẩn bị',
      icon: Package,
    },
    {
      value: 'shipping',
      label: 'Đang giao hàng',
      icon: Truck,
    },
    {
      value: 'delivered',
      label: 'Đã giao thành công',
      icon: CheckCircle,
    },
  ];

  // ---------------------------------------------
  // TÊN TRẠNG THÁI
  // ---------------------------------------------

  const getStatusLabel = (status) => {
    const normalized = String(status || '')
      .toLowerCase()
      .trim();

    const statusMap = {
      pending: 'Chờ xác nhận',
      waiting: 'Chờ xác nhận',
      confirmed: 'Đã xác nhận',
      processing: 'Đang chuẩn bị hàng',
      preparing: 'Đang chuẩn bị hàng',
      shipping: 'Đang giao hàng',
      delivering: 'Đang giao hàng',
      delivered: 'Đã giao thành công',
      completed: 'Hoàn thành',
      cancelled: 'Đã hủy',
      rejected: 'Đã từ chối',
    };

    return statusMap[normalized] || status || 'Chưa cập nhật';
  };

  // ---------------------------------------------
  // MÀU TRẠNG THÁI
  // ---------------------------------------------

  const getStatusColor = (status) => {
    const normalized = String(status || '')
      .toLowerCase()
      .trim();

    if (
      normalized === 'delivered' ||
      normalized === 'completed'
    ) {
      return 'bg-green-100 text-green-700';
    }

    if (
      normalized === 'shipping' ||
      normalized === 'delivering'
    ) {
      return 'bg-blue-100 text-blue-700';
    }

    if (
      normalized === 'cancelled' ||
      normalized === 'rejected'
    ) {
      return 'bg-red-100 text-red-700';
    }

    if (
      normalized === 'confirmed' ||
      normalized === 'processing' ||
      normalized === 'preparing'
    ) {
      return 'bg-amber-100 text-amber-700';
    }

    return 'bg-gray-100 text-gray-700';
  };

  // ---------------------------------------------
  // TIẾN TRÌNH ĐƠN HÀNG
  // ---------------------------------------------

  const renderOrderProgress = (status) => {
    const normalized = String(status || '')
      .toLowerCase()
      .trim();

    if (
      normalized === 'cancelled' ||
      normalized === 'rejected'
    ) {
      return (
        <div className="p-3 bg-red-50 rounded-xl text-red-700 text-sm flex gap-2 items-center">
          <XCircle size={18} />
          Đơn hàng đã bị hủy hoặc từ chối.
        </div>
      );
    }

    const progressMap = {
      pending: 0,
      waiting: 0,
      confirmed: 1,
      processing: 2,
      preparing: 2,
      shipping: 3,
      delivering: 3,
      delivered: 4,
      completed: 4,
    };

    const currentStep = progressMap[normalized] ?? 0;

    return (
      <div className="mt-4 space-y-3">
        {orderStatuses.map((step, index) => {
          const StepIcon = step.icon;
          const active = index <= currentStep;

          return (
            <div
              key={step.value}
              className="flex items-center gap-3"
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                  active
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 text-gray-400'
                }`}
              >
                <StepIcon size={17} />
              </div>

              <div>
                <p
                  className={`text-sm font-semibold ${
                    active
                      ? 'text-emerald-700'
                      : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ---------------------------------------------
  // THÔNG TIN ĐƠN HÀNG
  // ---------------------------------------------

  const getOrderId = (order) => (
    order?.order_id ??
    order?.id ??
    order?.code ??
    'N/A'
  );

  const getOrderTotal = (order) => (
    Number(
      order?.total_amount ??
      order?.total ??
      order?.final_amount ??
      0
    )
  );

  const getOrderStatus = (order) => (
    order?.status ??
    order?.order_status ??
    'pending'
  );

  const getOrderDate = (order) => {
    const date =
      order?.created_at ??
      order?.order_date ??
      order?.createdAt;

    if (!date) return 'Chưa cập nhật';

    return new Date(date).toLocaleString('vi-VN');
  };

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
            Đặt hàng thành công!
          </h2>

          <p className="text-sm text-gray-600 mt-3">
            Mã đơn hàng:
            <strong className="text-emerald-700 font-mono ml-2">
              {orderResult.order_id ??
                orderResult.data?.order_id ??
                orderResult.data?.id ??
                orderResult.id ??
                'Đã ghi nhận'}
            </strong>
          </p>

          <p className="text-sm text-gray-500 mt-2">
            Đơn hàng của bạn đã được ghi nhận.
            Bạn có thể theo dõi trạng thái đơn trong lịch sử.
          </p>

          <div className="text-xs text-amber-800 bg-amber-50 p-4 rounded-xl mt-4 border border-amber-200">
            {orderResult.message ||
              'Đơn hàng đã được ghi nhận.'}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-6 justify-center">
            <button
              type="button"
              onClick={() => {
                setOrderResult(null);
                setActiveTab('checkout');
              }}
              className="px-6 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700"
            >
              Tiếp tục mua sắm
            </button>

            <button
              type="button"
              onClick={() => {
                setOrderResult(null);
                setActiveTab('history');
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

      {/* TAB */}
      <div className="flex gap-3 mb-8 flex-wrap">
        <button
          type="button"
          onClick={() => setActiveTab('checkout')}
          className={`px-5 py-3 rounded-xl font-semibold flex items-center gap-2 ${
            activeTab === 'checkout'
              ? 'bg-emerald-600 text-white'
              : 'bg-white border text-gray-700'
          }`}
        >
          <ShoppingBag size={18} />
          Giỏ hàng & Thanh toán
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('history')}
          className={`px-5 py-3 rounded-xl font-semibold flex items-center gap-2 ${
            activeTab === 'history'
              ? 'bg-emerald-600 text-white'
              : 'bg-white border text-gray-700'
          }`}
        >
          <ClipboardList size={18} />
          Lịch sử đơn hàng
        </button>
      </div>

      {/* ======================================= */}
      {/* LỊCH SỬ ĐƠN HÀNG */}
      {/* ======================================= */}

      {activeTab === 'history' && (
        <div className="space-y-6">

          <div className="bg-white p-6 rounded-2xl border shadow-sm flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Lịch sử mua hàng
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                Kiểm tra đơn hàng và tiến trình giao hàng.
              </p>
            </div>

            <button
              type="button"
              onClick={fetchOrders}
              disabled={ordersLoading}
              className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl font-semibold flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={ordersLoading ? 'animate-spin' : ''}
              />
              Làm mới
            </button>
          </div>

          {ordersLoading && (
            <div className="bg-white p-12 rounded-2xl text-center">
              <Loader2
                size={36}
                className="animate-spin text-emerald-600 mx-auto"
              />

              <p className="mt-3 text-gray-500">
                Đang tải lịch sử đơn hàng...
              </p>
            </div>
          )}

          {ordersError && !ordersLoading && (
            <div className="p-5 bg-red-50 border border-red-200 rounded-2xl text-red-700">
              {ordersError}

              <button
                type="button"
                onClick={fetchOrders}
                className="mt-3 block px-4 py-2 bg-red-600 text-white rounded-xl"
              >
                Thử lại
              </button>
            </div>
          )}

          {!ordersLoading &&
            !ordersError &&
            orders.length === 0 && (
              <div className="bg-white p-12 rounded-2xl text-center border">
                <Package
                  size={48}
                  className="mx-auto text-gray-300"
                />

                <p className="font-semibold mt-4 text-gray-700">
                  Bạn chưa có đơn hàng nào.
                </p>

                <p className="text-sm text-gray-500 mt-2">
                  Các đơn hàng đã đặt sẽ hiển thị tại đây.
                </p>
              </div>
            )}

          {!ordersLoading &&
            !ordersError &&
            orders.map((order, index) => {
              const status = getOrderStatus(order);

              const isSelected =
                String(getOrderId(order)) ===
                String(getOrderId(selectedOrder || {}));

              const orderItems =
                order.items ??
                order.order_items ??
                order.details ??
                [];

              return (
                <div
                  key={order.id ?? index}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
                >
                  {/* HEADER ĐƠN HÀNG */}
                  <div className="p-5 border-b flex flex-wrap justify-between gap-4 items-center">
                    <div>
                      <p className="text-xs text-gray-500">
                        Mã đơn hàng
                      </p>

                      <p className="font-mono font-bold text-emerald-700 mt-1">
                        #{getOrderId(order)}
                      </p>

                      <p className="text-xs text-gray-500 mt-2">
                        {getOrderDate(order)}
                      </p>
                    </div>

                    <div className="text-right">
                      <span
                        className={`px-3 py-1.5 rounded-full text-xs font-bold ${getStatusColor(status)}`}
                      >
                        {getStatusLabel(status)}
                      </span>

                      <p className="text-lg font-bold text-emerald-700 mt-3">
                        {getOrderTotal(order).toLocaleString('vi-VN')}đ
                      </p>
                    </div>
                  </div>

                  {/* CHI TIẾT */}
                  <div className="p-5">
                    <p className="text-sm text-gray-700 flex gap-2">
                      <MapPin
                        size={17}
                        className="text-emerald-600 shrink-0"
                      />

                      <span>
                        {order.address ??
                          order.delivery_address ??
                          'Chưa cập nhật địa chỉ'}
                      </span>
                    </p>

                    {/* SẢN PHẨM */}
                    <div className="mt-4">
                      <p className="font-semibold text-gray-800 text-sm mb-3">
                        Sản phẩm
                      </p>

                      {Array.isArray(orderItems) &&
                      orderItems.length > 0 ? (
                        <div className="space-y-2">
                          {orderItems.map((item, itemIndex) => (
                            <div
                              key={item.id ?? itemIndex}
                              className="flex justify-between gap-3 text-sm"
                            >
                              <span className="text-gray-600">
                                {item.product_name ??
                                  item.name ??
                                  item.product?.name ??
                                  'Sản phẩm'}
                                {' '}x
                                {item.quantity ?? 1}
                              </span>

                              <span className="font-semibold text-gray-700">
                                {Number(
                                  item.price ??
                                  item.unit_price ??
                                  0
                                ).toLocaleString('vi-VN')}đ
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400">
                          Backend chưa trả về chi tiết sản phẩm.
                        </p>
                      )}
                    </div>

                    {/* THEO DÕI */}
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedOrder(
                          isSelected ? null : order
                        )
                      }
                      className="mt-5 px-4 py-2.5 border border-emerald-200 text-emerald-700 rounded-xl font-semibold text-sm hover:bg-emerald-50"
                    >
                      {isSelected
                        ? 'Ẩn tiến trình'
                        : 'Theo dõi đơn hàng'}

                      {isSelected
                        ? <ChevronUp size={16} className="inline ml-2" />
                        : <ChevronDown size={16} className="inline ml-2" />}
                    </button>

                    {isSelected && (
                      <div className="mt-5 p-5 bg-gray-50 rounded-2xl">
                        <h4 className="font-bold text-gray-900">
                          Tiến trình đơn hàng
                        </h4>

                        {renderOrderProgress(status)}

                        {order.note && (
                          <div className="mt-4 p-3 bg-white rounded-xl text-sm text-gray-600">
                            Ghi chú: {order.note}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* ======================================= */}
      {/* GIỎ HÀNG & THANH TOÁN */}
      {/* ======================================= */}

      {activeTab === 'checkout' && (
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
                            onClick={() =>
                              updateQuantity(item.id, 1)
                            }
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

              {/* NHẬP ĐỊA CHỈ */}
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Nhập địa chỉ giao hàng..."
                  className="flex-1 px-4 py-3 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  value={address}
                  onChange={e =>
                    handleAddressChange(e.target.value)
                  }
                />

                <button
                  type="button"
                  onClick={handleSearchAddressOnMap}
                  disabled={mapLoading}
                  className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-200 disabled:opacity-50"
                >
                  {mapLoading ? (
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                  ) : (
                    <LocateFixed size={17} />
                  )}

                  {mapLoading
                    ? 'Đang tìm...'
                    : 'Tìm địa chỉ'}
                </button>
              </div>

              {/* LỖI ĐỊA CHỈ */}
              {addressError && (
                <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
                  {addressError}
                </div>
              )}

              {/* LOADING */}
              {mapLoading && (
                <div className="text-sm text-gray-500 mt-3 flex items-center gap-2">
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                  Đang xác định địa chỉ...
                </div>
              )}

              {/* ================================= */}
              {/* MỞ / ĐÓNG BẢN ĐỒ */}
              {/* ================================= */}

              <button
                type="button"
                onClick={() =>
                  setMapVisible(prev => !prev)
                }
                className="w-full mt-4 px-4 py-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-emerald-100 transition"
              >
                <MapPin size={18} />

                {mapVisible
                  ? 'Ẩn bản đồ'
                  : 'Chọn vị trí trên bản đồ'}

                {mapVisible
                  ? <ChevronUp size={18} />
                  : <ChevronDown size={18} />}
              </button>

              {/* ================================= */}
              {/* BẢN ĐỒ - CHỈ TẠO KHI MỞ */}
              {/* ================================= */}

              {mapVisible && (
                <div className="mt-4">
                  <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
                    <MapContainer
                      center={
                        coordinates
                          ? [
                              coordinates.lat,
                              coordinates.lng,
                            ]
                          : DEFAULT_CENTER
                      }
                      zoom={coordinates ? 16 : 12}
                      scrollWheelZoom={true}
                      style={{
                        height: '350px',
                        width: '100%',
                      }}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />

                      <MapController
                        coordinates={coordinates}
                      />

                      <MapClickHandler
                        onSelectLocation={handleMapSelect}
                      />

                      {coordinates && (
                        <Marker
                          position={[
                            coordinates.lat,
                            coordinates.lng,
                          ]}
                        />
                      )}
                    </MapContainer>
                  </div>

                  <p className="text-xs text-gray-500 mt-3">
                    <MapPin
                      size={14}
                      className="inline text-emerald-600 mr-1"
                    />
                    Click trực tiếp trên bản đồ để chọn vị trí nhận hàng.
                  </p>
                </div>
              )}

              {/* ================================= */}
              {/* TỌA ĐỘ */}
              {/* ================================= */}

              {coordinates && (
                <div className="mt-3 p-4 bg-emerald-50 rounded-xl text-sm text-emerald-800">
                  <p>
                    <strong>Vĩ độ:</strong>{' '}
                    {coordinates.lat}
                  </p>

                  <p>
                    <strong>Kinh độ:</strong>{' '}
                    {coordinates.lng}
                  </p>
                </div>
              )}

              {/* ================================= */}
              {/* TÍNH SHIP */}
              {/* ================================= */}

              <form
                onSubmit={handleCalculateShip}
                className="mt-5"
              >
                <button
                  type="submit"
                  disabled={
                    calcLoading ||
                    items.length === 0
                  }
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

                  <div className="flex justify-between items-center text-sm gap-3">
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

            {/* TỔNG */}
            <div className="border-t pt-3 flex justify-between items-baseline gap-3">
              <span className="font-bold text-gray-900">
                Tổng tiền:
              </span>

              <span className="text-2xl font-extrabold text-emerald-700">
                {total.toLocaleString('vi-VN')}đ
              </span>
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
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
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
      )}
    </div>
  );
}
