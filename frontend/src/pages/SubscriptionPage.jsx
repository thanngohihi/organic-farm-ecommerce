
import React, { useState } from 'react';
import axios from 'axios';
import {
  RefreshCw,
  Calendar,
  MapPin,
  Truck,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  Loader2,
  AlertCircle,
} from 'lucide-react';

const API_URL = 'http://localhost:8000/api/v1/subscriptions';

const PACKAGES = [
  {
    id: 'pack_family',
    name: 'Gói Rau Xanh Gia Đình',
    desc: 'Bao gồm 5kg rau ăn lá hữu cơ và 3kg củ quả VietGAP mỗi đợt giao.',
    basePricePerDelivery: 180000,
    weight: 8,
    badge: 'Khuyên Dùng',
  },
  {
    id: 'pack_basic',
    name: 'Gói Nông Sản Tiêu Chuẩn',
    desc: 'Lựa chọn 3kg rau củ thiết yếu tươi sạch hàng tuần cho gia đình nhỏ.',
    basePricePerDelivery: 110000,
    weight: 3,
    badge: 'Tiết Kiệm',
  },
  {
    id: 'pack_organic_fruit',
    name: 'Gói Trái Cây & Bổ Dưỡng',
    desc: 'Gồm 4kg trái cây hữu cơ theo mùa.',
    basePricePerDelivery: 250000,
    weight: 4,
    badge: 'Cao Cấp',
  },
];

const DELIVERY_OPTIONS = [
  { id: 'Tuesday', label: 'Thứ Ba hàng tuần' },
  { id: 'Friday', label: 'Thứ Sáu hàng tuần' },
  { id: 'Saturday', label: 'Thứ Bảy cuối tuần' },
];

const DISCOUNTS = {
  1: 0,
  3: 0.05,
  6: 0.10,
};

export default function SubscriptionPage() {
  const [selectedPack, setSelectedPack] = useState(PACKAGES[0]);
  const [deliveryDays, setDeliveryDays] = useState([
    'Tuesday',
    'Friday',
  ]);
  const [address, setAddress] = useState('');
  const [durationMonths, setDurationMonths] = useState(1);

  const [loading, setLoading] = useState(false);
  const [subSuccess, setSubSuccess] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // ================================================
  // CHỌN NGÀY GIAO
  // ================================================

  const toggleDay = (day) => {
    setErrorMessage('');

    setDeliveryDays((previous) => {
      if (previous.includes(day)) {
        if (previous.length === 1) {
          setErrorMessage('Bạn cần chọn ít nhất một ngày giao hàng.');
          return previous;
        }

        return previous.filter((item) => item !== day);
      }

      return [...previous, day];
    });
  };

  // ================================================
  // TÍNH CHI PHÍ
  // ================================================

  const deliveriesPerMonth = deliveryDays.length * 4;

  const totalDeliveries = deliveriesPerMonth * durationMonths;

  const originalPrice =
    selectedPack.basePricePerDelivery * totalDeliveries;

  const discountRate = DISCOUNTS[durationMonths] || 0;

  const discountAmount = Math.round(
    originalPrice * discountRate
  );

  const totalPrice = originalPrice - discountAmount;

  const formatMoney = (value) =>
    Number(value || 0).toLocaleString('vi-VN');

  // ================================================
  // GỬI ĐĂNG KÝ LÊN LARAVEL
  // ================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setErrorMessage('');

    if (!deliveryDays.length) {
      setErrorMessage('Vui lòng chọn ít nhất một ngày giao hàng.');
      return;
    }

    if (!address.trim()) {
      setErrorMessage('Vui lòng nhập địa chỉ giao hàng.');
      return;
    }

    if (address.trim().length < 10) {
      setErrorMessage('Địa chỉ giao hàng cần chi tiết hơn.');
      return;
    }

    setLoading(true);

    const payload = {
      package_id: selectedPack.id,
      package_name: selectedPack.name,
      weight_per_delivery: selectedPack.weight,
      delivery_days: deliveryDays,
      delivery_address: address.trim(),
      duration_months: durationMonths,
      deliveries_per_month: deliveriesPerMonth,
      total_deliveries: totalDeliveries,
      original_price: originalPrice,
      discount_rate: discountRate,
      discount_amount: discountAmount,
      total_price: totalPrice,
    };

    try {
      const response = await axios.post(
        API_URL,
        payload,
        {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      const result = response.data?.data || response.data;

      setSubSuccess({
        ...payload,
        ...result,
        package_name:
          result?.package_name || selectedPack.name,
      });

    } catch (error) {
      console.error('Subscription API Error:', error);

      if (error.response) {
        const status = error.response.status;
        const serverData = error.response.data;

        if (status === 422) {
          const validationErrors = serverData?.errors;

          if (validationErrors) {
            const firstError = Object.values(validationErrors)[0];

            setErrorMessage(
              Array.isArray(firstError)
                ? firstError[0]
                : 'Thông tin đăng ký không hợp lệ.'
            );
          } else {
            setErrorMessage(
              serverData?.message ||
              'Vui lòng kiểm tra lại thông tin đăng ký.'
            );
          }
        } else if (status === 401) {
          setErrorMessage('Vui lòng đăng nhập để đăng ký gói định kỳ.');
        } else if (status === 403) {
          setErrorMessage('Bạn không có quyền đăng ký gói này.');
        } else {
          setErrorMessage(
            serverData?.message ||
            `Đăng ký thất bại. Mã lỗi: ${status}`
          );
        }
      } else if (error.code === 'ECONNABORTED') {
        setErrorMessage('Kết nối quá thời gian chờ. Vui lòng thử lại.');
      } else {
        setErrorMessage(
          'Không thể kết nối Backend Laravel. Hãy kiểm tra server.'
        );
      }

    } finally {
      setLoading(false);
    }
  };

  // ================================================
  // RESET
  // ================================================

  const resetSubscription = () => {
    setSubSuccess(null);
    setErrorMessage('');
    setAddress('');
    setDeliveryDays(['Tuesday', 'Friday']);
    setSelectedPack(PACKAGES[0]);
    setDurationMonths(1);
  };

  // ================================================
  // THÔNG BÁO ĐĂNG KÝ THÀNH CÔNG
  // ================================================

  if (subSuccess) {
    return (
      <div className="mx-auto max-w-4xl p-4 sm:p-6">

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-8 text-center shadow-sm">

          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-white">
            <CheckCircle2 size={36} />
          </div>

          <h2 className="text-2xl font-bold text-emerald-900">
            Đăng Ký Gói Nông Sản Thành Công!
          </h2>

          <p className="mt-2 text-sm text-emerald-700">
            Hệ thống đã tiếp nhận đăng ký định kỳ của bạn.
          </p>

          {subSuccess.id && (
            <p className="mt-3 text-sm font-bold text-emerald-800">
              Mã đăng ký: #{subSuccess.id}
            </p>
          )}

          <div className="mx-auto mt-6 max-w-md rounded-xl bg-white p-5 text-left shadow-sm">

            <h3 className="font-bold text-slate-800">
              {subSuccess.package_name}
            </h3>

            <ul className="mt-4 space-y-3 text-xs text-slate-600">

              <li className="flex justify-between gap-3">
                <span>Lịch giao hàng:</span>
                <strong className="text-right">
                  {deliveryDays.map(
                    (day) =>
                      DELIVERY_OPTIONS.find((item) => item.id === day)?.label
                  ).join(', ')}
                </strong>
              </li>

              <li className="flex justify-between gap-3">
                <span>Địa chỉ nhận:</span>
                <strong className="max-w-[65%] text-right">
                  {address}
                </strong>
              </li>

              <li className="flex justify-between">
                <span>Thời hạn:</span>
                <strong>{durationMonths} tháng</strong>
              </li>

              <li className="flex justify-between">
                <span>Tổng lượt giao:</span>
                <strong>{totalDeliveries} lượt</strong>
              </li>

              <li className="flex justify-between border-t border-slate-100 pt-3">
                <span>Tạm tính:</span>
                <strong>{formatMoney(originalPrice)}đ</strong>
              </li>

              <li className="flex justify-between">
                <span>Giảm giá:</span>
                <strong className="text-emerald-600">
                  -{formatMoney(discountAmount)}đ
                </strong>
              </li>

              <li className="flex justify-between border-t border-slate-100 pt-3 text-sm font-bold text-emerald-700">
                <span>Tổng chi phí:</span>
                <span>{formatMoney(totalPrice)}đ</span>
              </li>

            </ul>

          </div>

          <button
            type="button"
            onClick={resetSubscription}
            className="mt-6 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Đăng ký gói khác
          </button>

        </div>

      </div>
    );
  }

  // ================================================
  // GIAO DIỆN ĐĂNG KÝ
  // ================================================

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 sm:p-6">

      {/* HEADER */}

      <div className="text-center">

        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
          <Sparkles size={14} />
          Giải Pháp Nông Sản Định Kỳ
        </span>

        <h1 className="mt-3 text-2xl font-extrabold text-slate-800 sm:text-3xl">
          Đăng Ký Gói Rau Tươi Giao Theo Tuần
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Lựa chọn gói nông sản phù hợp và nhận hàng định kỳ tại nhà.
        </p>

      </div>

      {/* ERROR */}

      {errorMessage && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <AlertCircle size={18} className="shrink-0" />
          {errorMessage}
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-3">

        {/* MAIN FORM */}

        <div className="space-y-5 lg:col-span-2">

          <h2 className="text-lg font-bold text-slate-800">
            1. Chọn Gói Nông Sản Phù Hợp
          </h2>

          <div className="grid gap-4 sm:grid-cols-3">

            {PACKAGES.map((pkg) => (

              <button
                type="button"
                key={pkg.id}
                onClick={() => setSelectedPack(pkg)}
                className={`relative rounded-2xl border p-5 text-left transition-all ${
                  selectedPack.id === pkg.id
                    ? 'border-emerald-600 bg-emerald-50/50 shadow-md ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >

                <span className="absolute -top-3 right-3 rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-bold text-white">
                  {pkg.badge}
                </span>

                <h3 className="font-bold text-slate-800">
                  {pkg.name}
                </h3>

                <p className="mt-2 text-xs leading-relaxed text-slate-500">
                  {pkg.desc}
                </p>

                <div className="mt-4 border-t border-slate-100 pt-3">
                  <span className="text-lg font-extrabold text-emerald-700">
                    {formatMoney(pkg.basePricePerDelivery)}đ
                  </span>
                  <span className="text-xs text-slate-400">
                    /lần giao
                  </span>
                </div>

                {selectedPack.id === pkg.id && (
                  <div className="mt-3 flex items-center gap-1 text-xs font-bold text-emerald-700">
                    <CheckCircle2 size={14} />
                    Đang chọn
                  </div>
                )}

              </button>

            ))}

          </div>

          {/* FORM */}

          <form
            onSubmit={handleSubmit}
            className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >

            <h2 className="text-lg font-bold text-slate-800">
              2. Cấu Hình Lịch Giao & Địa Chỉ
            </h2>

            {/* DELIVERY DAYS */}

            <div>

              <label className="mb-3 block text-xs font-bold uppercase tracking-wider text-slate-500">
                Ngày giao hàng trong tuần
              </label>

              <div className="flex flex-wrap gap-3">

                {DELIVERY_OPTIONS.map((item) => (

                  <button
                    type="button"
                    key={item.id}
                    onClick={() => toggleDay(item.id)}
                    className={`flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-bold transition ${
                      deliveryDays.includes(item.id)
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Calendar size={15} />
                    {item.label}
                  </button>

                ))}

              </div>

            </div>

            {/* DURATION & ADDRESS */}

            <div className="grid gap-4 sm:grid-cols-2">

              <div>

                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Thời hạn đăng ký
                </label>

                <select
                  value={durationMonths}
                  onChange={(e) =>
                    setDurationMonths(Number(e.target.value))
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm outline-none focus:border-emerald-500"
                >
                  <option value={1}>1 tháng - Không giảm giá</option>
                  <option value={3}>3 tháng - Giảm 5%</option>
                  <option value={6}>6 tháng - Giảm 10%</option>
                </select>

              </div>

              <div>

                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                  Địa chỉ giao hàng
                </label>

                <div className="relative">

                  <MapPin
                    size={17}
                    className="absolute left-3 top-3.5 text-slate-400"
                  />

                  <input
                    type="text"
                    required
                    minLength={10}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Nhập địa chỉ nhận hàng"
                    className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-3 text-sm outline-none focus:border-emerald-500"
                  />

                </div>

              </div>

            </div>

            {/* POLICY */}

            <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-4 text-xs leading-relaxed text-amber-800">
              <ShieldCheck
                size={18}
                className="mt-0.5 shrink-0 text-amber-600"
              />
              <span>
                Nông sản được lựa chọn và đóng gói theo quy trình
                quản lý chất lượng. Lịch giao hàng sẽ được xác nhận
                sau khi hệ thống tiếp nhận đăng ký.
              </span>
            </div>

            {/* SUBMIT */}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >

              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Đang xử lý đăng ký...
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  Xác Nhận Đăng Ký - {formatMoney(totalPrice)}đ
                </>
              )}

            </button>

          </form>

        </div>

        {/* SUMMARY */}

        <div className="h-fit space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

          <h3 className="flex items-center gap-2 border-b border-slate-100 pb-3 font-bold text-slate-800">
            <RefreshCw size={19} className="text-emerald-600" />
            Tóm Tắt Gói Định Kỳ
          </h3>

          <div className="space-y-4 text-xs">

            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Gói đã chọn:</span>
              <strong className="text-right text-slate-800">
                {selectedPack.name}
              </strong>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">Đơn giá/lần:</span>
              <strong className="text-emerald-700">
                {formatMoney(selectedPack.basePricePerDelivery)}đ
              </strong>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">Ngày giao/tuần:</span>
              <strong>{deliveryDays.length} ngày</strong>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">Thời hạn:</span>
              <strong>{durationMonths} tháng</strong>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">Tổng lượt giao:</span>
              <strong>{totalDeliveries} lượt</strong>
            </div>

            <div className="flex justify-between border-t border-slate-100 pt-3">
              <span className="text-slate-500">Tạm tính:</span>
              <strong>{formatMoney(originalPrice)}đ</strong>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-500">
                Giảm giá ({discountRate * 100}%):
              </span>
              <strong className="text-emerald-600">
                -{formatMoney(discountAmount)}đ
              </strong>
            </div>

            <div className="flex justify-between border-t border-slate-100 pt-4 text-sm">
              <span className="font-bold text-slate-800">
                Tổng chi phí:
              </span>
              <strong className="text-lg text-emerald-700">
                {formatMoney(totalPrice)}đ
              </strong>
            </div>

          </div>

          <div className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700">
            <Truck size={17} className="mb-2" />
            Giao hàng định kỳ theo lịch đã đăng ký.
          </div>

        </div>

      </div>

    </div>
  );
}
