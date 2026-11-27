import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import {
  RefreshCw, Calendar, Truck, CheckCircle2, ShieldCheck,
  Sparkles, Loader2, AlertCircle, PauseCircle, PlayCircle, XCircle,
  CreditCard, ArrowRight
} from 'lucide-react';
import { getAuthHeaders } from '../services/api';
import DeliveryAddressMap from '../components/DeliveryAddressMap';
import Pagination from '../components/Pagination';

const BASE_API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';
const API_URL = `${BASE_API}/subscriptions`;

const PACKAGES = [
  { id: 'pack_family', name: 'Gói Rau Xanh Gia Đình', desc: 'Bao gồm 5kg rau ăn lá hữu cơ và 3kg củ quả VietGAP mỗi đợt giao.', basePricePerDelivery: 180000, weight: 8, badge: 'Khuyên Dùng' },
  { id: 'pack_basic', name: 'Gói Nông Sản Tiêu Chuẩn', desc: 'Lựa chọn 3kg rau củ thiết yếu tươi sạch hàng tuần cho gia đình nhỏ.', basePricePerDelivery: 110000, weight: 3, badge: 'Tiết Kiệm' },
  { id: 'pack_organic_fruit', name: 'Gói Trái Cây & Bổ Dưỡng', desc: 'Gồm 4kg trái cây hữu cơ theo mùa.', basePricePerDelivery: 250000, weight: 4, badge: 'Cao Cấp' },
];
const DELIVERY_OPTIONS = [
  { id: 'Tuesday', label: 'Thứ Ba', weekday: 2 },
  { id: 'Friday', label: 'Thứ Sáu', weekday: 5 },
  { id: 'Saturday', label: 'Thứ Bảy', weekday: 6 },
];
const DISCOUNTS = { 1: 0, 3: 0.05, 6: 0.10 };
const SUBS_PER_PAGE = 5;

const toLocalISO = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};
const parseLocalDate = (iso) => {
  if (!iso) return null;
  const datePart = String(iso).slice(0, 10);
  const [y, m, d] = datePart.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, 12, 0, 0);
};
const addMonthsClamped = (date, months) => {
  const targetMonth = date.getMonth() + months;
  const targetYear = date.getFullYear() + Math.floor(targetMonth / 12);
  const normalizedMonth = ((targetMonth % 12) + 12) % 12;
  const lastDay = new Date(targetYear, normalizedMonth + 1, 0).getDate();
  return new Date(targetYear, normalizedMonth, Math.min(date.getDate(), lastDay), 12);
};
const formatDate = (iso) => {
  const date = parseLocalDate(iso);
  return date ? date.toLocaleDateString('vi-VN') : '—';
};
const formatMoney = (value) => Number(value || 0).toLocaleString('vi-VN');
const resolveQrImageSrc = (qr) => {
  if (!qr) return '';
  if (/^(https?:|data:image\/)/i.test(qr)) return qr;
  return `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qr)}&size=200x200`;
};

function getDeliverySchedule(startISO, endISO, selectedDays) {
  const start = parseLocalDate(startISO);
  const end = parseLocalDate(endISO);
  if (!start || !end || end < start || !selectedDays.length) return [];
  const selectedWeekdays = DELIVERY_OPTIONS
    .filter((option) => selectedDays.includes(option.id))
    .map((option) => option.weekday);
  const dates = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    if (selectedWeekdays.includes(cursor.getDay())) dates.push(toLocalISO(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

export default function SubscriptionPage({ currentUser = null }) {
  const [selectedPack, setSelectedPack] = useState(PACKAGES[0]);
  const [deliveryDays, setDeliveryDays] = useState(['Tuesday', 'Friday']);
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
  const [durationMonths, setDurationMonths] = useState(1);
  const [startDate, setStartDate] = useState(toLocalISO(new Date()));
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [loading, setLoading] = useState(false);
  const [subSuccess, setSubSuccess] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [addressError, setAddressError] = useState('');
  const [mySubscriptions, setMySubscriptions] = useState([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const [subsPage, setSubsPage] = useState(1);
  const [retryingSubId, setRetryingSubId] = useState(null);

  const loadMySubscriptions = async () => {
    const headers = getAuthHeaders();
    if (!headers.Authorization) return;
    setLoadingSubs(true);
    try {
      const res = await axios.get(API_URL, { headers });
      setMySubscriptions(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch {
      // Bỏ qua nếu chưa đăng nhập
    } finally {
      setLoadingSubs(false);
    }
  };

  useEffect(() => {
    loadMySubscriptions();
  }, []);

  useEffect(() => {
    if (subSuccess) {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, [subSuccess]);

  useEffect(() => {
    const profileAddr = String(currentUser?.address || '').trim();
    const prevProfileAddr = String(lastProfileAddressRef.current || '').trim();

    if (
      profileAddr &&
      (!String(address || '').trim() || String(address || '').trim() === prevProfileAddr)
    ) {
      setAddress(profileAddr);

      const lat = Number(currentUser?.latitude);
      const lng = Number(currentUser?.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)) {
        setCoordinates({ lat, lng });
      }
    }

    lastProfileAddressRef.current = profileAddr;
  }, [currentUser?.address, currentUser?.latitude, currentUser?.longitude]);

  const handleUpdateSubscriptionStatus = async (sub, nextStatus) => {
    if (nextStatus === 'da_huy') {
      const msg =
        sub.payment_method === 'momo' && sub.payment_status === 'da_thanh_toan'
          ? 'Gói này đã thanh toán qua Ví MoMo. Hủy gói sẽ dừng toàn bộ các lịch giao chưa tạo đơn (liên hệ CSKH nếu cần hỗ trợ hoàn phần chưa giao). Bạn chắc chắn muốn hủy?'
          : sub.payment_method === 'momo' && sub.payment_status !== 'da_thanh_toan'
            ? 'Bạn muốn hủy gói MoMo chưa thanh toán này?'
            : 'Hủy gói sẽ dừng toàn bộ các lịch giao chưa tạo đơn trong tương lai. Bạn chắc chắn muốn hủy?';
      if (!window.confirm(msg)) return;
    } else if (nextStatus === 'tam_dung') {
      if (!window.confirm('Tạm dừng gói sẽ ngừng giao hàng trong thời gian bạn nghỉ. Các lượt bị lỡ sẽ được bảo lưu và tự động dời nối tiếp ra sau ngày kết thúc khi bạn bấm Tiếp tục. Xác nhận tạm dừng?')) {
        return;
      }
    }

    try {
      const res = await axios.patch(
        `${API_URL}/${sub.id}/status`,
        { status: nextStatus },
        { headers: getAuthHeaders() }
      );
      if (nextStatus === 'dang_hoat_dong' && res.data?.message && res.data.message.includes('dời')) {
        alert(res.data.message);
      }
      await loadMySubscriptions();
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể cập nhật trạng thái gói.');
    }
  };

  const handleResumeMoMoPayment = async (sub) => {
    setRetryingSubId(sub.id);
    setErrorMessage('');
    try {
      const res = await axios.post(
        `${API_URL}/${sub.id}/momo-payment`,
        {},
        { headers: getAuthHeaders(), timeout: 30000 }
      );
      const data = res.data?.data || res.data;
      setSubSuccess({ ...sub, ...data, fromHistory: true });
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể khởi tạo lại thanh toán MoMo.');
    } finally {
      setRetryingSubId(null);
    }
  };

  const endDate = useMemo(() => {
    const start = parseLocalDate(startDate);
    if (!start) return '';
    const anniversary = addMonthsClamped(start, Number(durationMonths));
    anniversary.setDate(anniversary.getDate() - 1);
    return toLocalISO(anniversary);
  }, [startDate, durationMonths]);

  const deliverySchedule = useMemo(
    () => getDeliverySchedule(startDate, endDate, deliveryDays),
    [startDate, endDate, deliveryDays]
  );
  const totalDeliveries = deliverySchedule.length;
  const originalPrice = selectedPack.basePricePerDelivery * totalDeliveries;
  const discountRate = DISCOUNTS[durationMonths] || 0;
  const discountAmount = Math.round(originalPrice * discountRate);
  const totalPrice = originalPrice - discountAmount;

  const toggleDay = (day) => {
    setErrorMessage('');
    setDeliveryDays((previous) => {
      if (previous.includes(day)) {
        if (previous.length === 1) return previous;
        return previous.filter((item) => item !== day);
      }
      return [...previous, day];
    });
  };

  const handleAddressChange = (val) => {
    setAddress(val);
    if (addressError) setAddressError('');
  };

  const focusAddressField = () => {
    const addrInput = document.getElementById('delivery-address');
    if (addrInput) {
      addrInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      addrInput.focus({ preventScroll: true });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setAddressError('');
    if (!startDate) return setErrorMessage('Vui lòng chọn ngày bắt đầu gói.');
    if (!deliveryDays.length) return setErrorMessage('Vui lòng chọn ít nhất một ngày giao hàng.');
    if (!deliverySchedule.length) return setErrorMessage('Không có lượt giao nào trong thời hạn đã chọn. Hãy điều chỉnh ngày bắt đầu hoặc lịch giao.');
    if (!address.trim() || address.trim().length < 10) {
      setAddressError('Vui lòng nhập địa chỉ giao hàng chi tiết (ít nhất 10 ký tự).');
      focusAddressField();
      return;
    }

    setLoading(true);
    const payload = {
      package_id: selectedPack.id,
      package_name: selectedPack.name,
      weight_per_delivery: selectedPack.weight,
      delivery_days: deliveryDays,
      delivery_address: address.trim(),
      latitude: coordinates?.lat ?? null,
      longitude: coordinates?.lng ?? null,
      duration_months: Number(durationMonths),
      start_date: startDate,
      end_date: endDate,
      deliveries_per_month: null, // Số lượt được tính theo lịch thực tế, không dùng ước tính 4 tuần.
      total_deliveries: totalDeliveries,
      delivery_schedule: deliverySchedule,
      original_price: originalPrice,
      discount_rate: discountRate,
      discount_amount: discountAmount,
      total_price: totalPrice,
      payment_method: paymentMethod,
    };

    try {
      const token = localStorage.getItem('access_token') || localStorage.getItem('token');
      const response = await axios.post(API_URL, payload, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        timeout: 30000,
      });
      const result = response.data?.data || response.data;
      setSubSuccess({ ...payload, ...result, package_name: result?.package_name || selectedPack.name });
      setSubsPage(1);
      loadMySubscriptions();
    } catch (error) {
      console.error('Subscription API Error:', error);
      if (error.response) {
        const status = error.response.status;
        const serverData = error.response.data;
        if (status === 422) {
          const validationErrors = serverData?.errors;
          if (validationErrors?.delivery_address) {
            const addrMsg = validationErrors.delivery_address;
            setAddressError(Array.isArray(addrMsg) ? addrMsg[0] : addrMsg);
            focusAddressField();
          } else {
            const firstError = validationErrors ? Object.values(validationErrors)[0] : null;
            setErrorMessage(Array.isArray(firstError) ? firstError[0] : (serverData?.message || 'Vui lòng kiểm tra lại thông tin đăng ký.'));
          }
        } else if (status === 401) setErrorMessage('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để đăng ký.');
        else if (status === 403) setErrorMessage('Bạn không có quyền đăng ký gói này.');
        else setErrorMessage(serverData?.message || `Đăng ký thất bại (mã lỗi ${status}).`);
      } else if (error.code === 'ECONNABORTED') setErrorMessage('Kết nối quá thời gian chờ. Vui lòng thử lại.');
      else setErrorMessage('Không thể kết nối Backend Laravel. Hãy kiểm tra server và đăng nhập.');
    } finally {
      setLoading(false);
    }
  };

  const resetSubscription = () => {
    const savedAddr = currentUser?.address || '';
    const lat = Number(currentUser?.latitude);
    const lng = Number(currentUser?.longitude);
    const savedCoords =
      Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)
        ? { lat, lng }
        : null;

    setSubSuccess(null);
    setErrorMessage('');
    setAddressError('');
    setAddress(savedAddr);
    setCoordinates(savedCoords);
    setDeliveryDays(['Tuesday', 'Friday']);
    setSelectedPack(PACKAGES[0]);
    setDurationMonths(1);
    setStartDate(toLocalISO(new Date()));
    setPaymentMethod('cod');
  };

  if (subSuccess) {
    const successStart = subSuccess.start_date || startDate;
    const successEnd = subSuccess.end_date || endDate;
    const successPaymentMethod = subSuccess.payment_method || paymentMethod;
    const successQrSrc = resolveQrImageSrc(subSuccess.qr_code_url);

    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div
          id="subscription-success-banner"
          className="mx-auto max-w-4xl rounded-2xl border border-emerald-200 bg-emerald-50/80 p-6 sm:p-8 text-center shadow-sm"
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-white">
            <CheckCircle2 size={36} />
          </div>
          <h2 className="text-2xl font-bold text-emerald-900">
            Đăng Ký Gói Nông Sản Thành Công!
          </h2>
          <p className="mt-2 text-sm text-emerald-700">
            {successPaymentMethod === 'momo'
              ? 'Hệ thống đã ghi nhận đăng ký định kỳ. Nhấn Tiếp tục để chuyển sang trang thanh toán MoMo.'
              : 'Hệ thống đã tiếp nhận đăng ký định kỳ thanh toán tiền mặt (COD) của bạn.'}
          </p>
          {(subSuccess.subscription_code || subSuccess.id) && (
            <p className="mt-3 text-sm font-bold text-emerald-800">
              Mã đăng ký:{' '}
              <span className="font-mono">
                {subSuccess.subscription_code || `#${subSuccess.id}`}
              </span>
            </p>
          )}
          <div className="mx-auto mt-6 max-w-lg rounded-xl bg-white p-5 text-left shadow-sm">
            <h3 className="font-bold text-slate-800">{subSuccess.package_name}</h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              <li className="flex justify-between gap-3"><span>Ngày bắt đầu:</span><strong className="text-emerald-700">{formatDate(successStart)}</strong></li>
              <li className="flex justify-between gap-3"><span>Ngày kết thúc:</span><strong className="text-emerald-700">{formatDate(successEnd)}</strong></li>
              <li className="flex justify-between gap-3"><span>Lịch giao:</span><strong className="text-right">{(subSuccess.delivery_days || deliveryDays).map((day) => DELIVERY_OPTIONS.find((item) => item.id === day)?.label || day).join(', ')}</strong></li>
              <li className="flex justify-between gap-3"><span>Địa chỉ nhận:</span><strong className="max-w-[65%] text-right">{subSuccess.delivery_address || address}</strong></li>
              {subSuccess.duration_months != null && (
                <li className="flex justify-between gap-3"><span>Thời hạn:</span><strong>{subSuccess.duration_months} tháng</strong></li>
              )}
              <li className="flex justify-between gap-3">
                <span>Số lượt giao:</span>
                <strong>
                  {subSuccess.total_deliveries ??
                    (Array.isArray(subSuccess.schedules) ? subSuccess.schedules.length : totalDeliveries)}{' '}
                  lượt
                </strong>
              </li>
              <li className="flex justify-between gap-3">
                <span>Thanh toán:</span>
                <strong className={successPaymentMethod === 'momo' ? 'text-pink-700' : 'text-emerald-700'}>
                  {successPaymentMethod === 'momo' ? 'Ví MoMo' : 'Tiền mặt (COD)'}
                </strong>
              </li>
              {subSuccess.original_price != null && (
                <li className="flex justify-between border-t border-slate-100 pt-3"><span>Tạm tính:</span><strong>{formatMoney(subSuccess.original_price)}đ</strong></li>
              )}
              {subSuccess.discount_amount != null && (
                <li className="flex justify-between"><span>Giảm giá:</span><strong className="text-emerald-600">-{formatMoney(subSuccess.discount_amount)}đ</strong></li>
              )}
              <li className="flex justify-between border-t border-slate-100 pt-3 text-base font-bold text-emerald-700"><span>Tổng chi phí:</span><span>{formatMoney(subSuccess.total_price ?? totalPrice)}đ</span></li>
            </ul>
          </div>
          {successPaymentMethod === 'momo' && subSuccess.payment_url && (
            <div className="mx-auto mt-4 max-w-lg rounded-2xl border border-pink-200 bg-pink-50/70 p-4 text-center">
              <p className="text-xs font-bold text-pink-700">
                Hoàn tất thanh toán qua Ví MoMo
              </p>
              {successQrSrc && (
                <img
                  src={successQrSrc}
                  alt="QR MoMo"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                  className="mx-auto my-3 h-36 w-36 rounded-xl border border-pink-200 bg-white p-1.5"
                />
              )}
              <a
                href={subSuccess.payment_url}
                className="inline-flex items-center gap-1.5 rounded-xl bg-pink-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-pink-700"
              >
                Tiếp tục
                <ArrowRight size={16} />
              </a>
            </div>
          )}
          <div className="mt-6">
            <button
              type="button"
              onClick={resetSubscription}
              className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Đăng ký gói khác
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800"><Sparkles size={14} />Giải Pháp Nông Sản Định Kỳ</span>
        <h1 className="mt-3 text-2xl font-extrabold text-slate-800 sm:text-3xl">Đăng Ký Gói Rau Tươi Giao Theo Tuần</h1>
        <p className="mt-2 text-sm text-slate-500">Lựa chọn gói nông sản phù hợp và nhận hàng định kỳ tại nhà.</p>
      </div>
      {errorMessage && <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"><AlertCircle size={18} className="shrink-0" />{errorMessage}</div>}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-5 lg:col-span-2">
          <h2 className="text-lg font-bold text-slate-800">1. Chọn Gói Nông Sản Phù Hợp</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {PACKAGES.map((pkg) => <button type="button" key={pkg.id} onClick={() => setSelectedPack(pkg)} className={`relative rounded-2xl border p-5 text-left transition-all ${selectedPack.id === pkg.id ? 'border-emerald-600 bg-emerald-50/50 shadow-md ring-2 ring-emerald-500/20' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
              <span className="absolute -top-3 right-3 rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-bold text-white">{pkg.badge}</span>
              <h3 className="font-bold text-slate-800">{pkg.name}</h3><p className="mt-2 text-xs leading-relaxed text-slate-500">{pkg.desc}</p>
              <div className="mt-4 border-t border-slate-100 pt-3"><span className="text-lg font-extrabold text-emerald-700">{formatMoney(pkg.basePricePerDelivery)}đ</span><span className="text-xs text-slate-400">/lần giao</span></div>
              {selectedPack.id === pkg.id && <div className="mt-3 flex items-center gap-1 text-xs font-bold text-emerald-700"><CheckCircle2 size={14} />Đang chọn</div>}
            </button>)}
          </div>
          <form id="subscription-form" noValidate onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800">2. Cấu Hình Thời Hạn, Lịch Giao & Địa Chỉ</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label htmlFor="start-date" className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Ngày bắt đầu gói</label><input id="start-date" type="date" required min={toLocalISO(new Date())} value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none focus:border-emerald-500" /></div>
              <div><label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Thời hạn đăng ký</label><select value={durationMonths} onChange={(e) => setDurationMonths(Number(e.target.value))} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm outline-none focus:border-emerald-500"><option value={1}>1 tháng - Không giảm giá</option><option value={3}>3 tháng - Giảm 5%</option><option value={6}>6 tháng - Giảm 10%</option></select></div>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4"><div className="flex items-center gap-2 text-sm font-semibold text-emerald-800"><Calendar size={17}/>Thời hạn gói dự kiến</div><div className="mt-2 grid grid-cols-2 gap-3 text-sm"><div><span className="text-slate-500">Bắt đầu</span><p className="font-bold text-slate-800">{formatDate(startDate)}</p></div><div><span className="text-slate-500">Kết thúc</span><p className="font-bold text-slate-800">{formatDate(endDate)}</p></div></div><p className="mt-2 text-xs text-emerald-700">Ngày kết thúc được tính theo tháng lịch, kết thúc trước ngày kỷ niệm bắt đầu một ngày.</p></div>
            <div><label className="mb-3 block text-xs font-bold uppercase tracking-wider text-slate-500">Ngày giao hàng trong tuần (chọn ít nhất 1)</label><div className="flex flex-wrap gap-3">{DELIVERY_OPTIONS.map((item) => <button type="button" key={item.id} onClick={() => toggleDay(item.id)} className={`flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-bold transition ${deliveryDays.includes(item.id) ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}><Calendar size={15}/>{item.label} hàng tuần</button>)}</div></div>
            <div>
              <label htmlFor="delivery-address" className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">
                Địa chỉ giao hàng
              </label>
              <DeliveryAddressMap
                inputId="delivery-address"
                address={address}
                onAddressChange={handleAddressChange}
                coordinates={coordinates}
                onCoordinatesChange={setCoordinates}
                placeholder="Nhập địa chỉ nhận hàng chi tiết hoặc chọn trên bản đồ..."
                required
                minLength={10}
                mapHeight="320px"
                externalError={addressError}
              />
            </div>
            <div className="rounded-xl bg-amber-50 p-4 text-xs leading-relaxed text-amber-800"><ShieldCheck size={18} className="mb-2 text-amber-600"/>Lịch giao và thời hạn được gửi đến hệ thống khi bạn xác nhận. Số lượt giao và chi phí được tính theo các ngày giao thực tế nằm trong thời hạn gói.</div>
          </form>
        </div>
        <aside className="h-fit space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:sticky lg:top-6">
          <h3 className="flex items-center gap-2 border-b border-slate-100 pb-3 font-bold text-slate-800"><RefreshCw size={19} className="text-emerald-600"/>Tóm Tắt Gói Định Kỳ</h3>
          <div className="space-y-4 text-sm"><div className="flex justify-between gap-3"><span className="text-slate-500">Gói đã chọn:</span><strong className="text-right text-slate-800">{selectedPack.name}</strong></div><div className="flex justify-between"><span className="text-slate-500">Đơn giá/lượt:</span><strong className="text-emerald-700">{formatMoney(selectedPack.basePricePerDelivery)}đ</strong></div><div className="flex justify-between gap-3"><span className="text-slate-500">Thời hạn:</span><strong>{durationMonths} tháng</strong></div><div className="flex justify-between gap-3"><span className="text-slate-500">Ngày bắt đầu:</span><strong>{formatDate(startDate)}</strong></div><div className="flex justify-between gap-3"><span className="text-slate-500">Ngày kết thúc:</span><strong>{formatDate(endDate)}</strong></div><div className="flex justify-between gap-3"><span className="text-slate-500">Lịch giao:</span><strong className="text-right">{deliveryDays.map((day) => DELIVERY_OPTIONS.find((item) => item.id === day)?.label).join(', ')}</strong></div><div className="flex justify-between"><span className="text-slate-500">Số lượt giao thực tế:</span><strong>{totalDeliveries} lượt</strong></div><div className="flex justify-between border-t border-slate-100 pt-3"><span className="text-slate-500">Tạm tính:</span><strong>{formatMoney(originalPrice)}đ</strong></div><div className="flex justify-between"><span className="text-slate-500">Giảm giá ({discountRate * 100}%):</span><strong className="text-emerald-600">-{formatMoney(discountAmount)}đ</strong></div><div className="flex justify-between border-t border-slate-100 pt-4 text-base"><span className="font-bold text-slate-800">Tổng chi phí:</span><strong className="text-lg text-emerald-700">{formatMoney(totalPrice)}đ</strong></div></div>
          <div className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700"><Truck size={17} className="mb-2"/>Dự kiến có {totalDeliveries} lượt giao trong khoảng {formatDate(startDate)} – {formatDate(endDate)}.</div>

          {/* PHƯƠNG THỨC THANH TOÁN */}
          <div className="space-y-2 border-t border-slate-100 pt-3">
            <p className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
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
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
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
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Ví MoMo
              </button>
            </div>
          </div>

          <button
            type="submit"
            form="subscription-form"
            disabled={loading || !deliverySchedule.length}
            className={`flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white shadow-md transition disabled:cursor-not-allowed disabled:opacity-60 ${
              paymentMethod === 'momo'
                ? 'bg-pink-600 hover:bg-pink-700'
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
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
        </aside>
      </div>

      {/* DANH SÁCH GÓI ĐỊNH KỲ ĐÃ ĐĂNG KÝ */}
      {(loadingSubs || mySubscriptions.length > 0) && (() => {
        const totalSubPages = Math.max(1, Math.ceil(mySubscriptions.length / SUBS_PER_PAGE));
        const safeSubPage = Math.min(subsPage, totalSubPages);
        const startIndex = (safeSubPage - 1) * SUBS_PER_PAGE;
        const paginatedSubscriptions = mySubscriptions.slice(startIndex, startIndex + SUBS_PER_PAGE);

        return (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-slate-800">
                Gói Rau Củ Định Kỳ Đã Đăng Ký ({mySubscriptions.length})
              </h2>
              {totalSubPages > 1 && (
                <span className="text-xs font-medium text-slate-500">
                  Trang {safeSubPage} / {totalSubPages}
                </span>
              )}
            </div>
            {loadingSubs ? (
              <p className="text-sm text-slate-500">Đang tải danh sách gói...</p>
            ) : (
              <>
                <div className="space-y-4">
                  {paginatedSubscriptions.map((sub) => {
                    const isUnpaidMoMo =
                      sub.payment_method === 'momo' && sub.payment_status !== 'da_thanh_toan';
                    const canChange = sub.status === 'dang_hoat_dong' || sub.status === 'tam_dung';

                    return (
                      <div key={sub.id} className="rounded-xl border border-slate-200 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <h3 className="font-bold text-slate-800">
                              {sub.package_name}
                              {sub.subscription_code && (
                                <span className="ml-2 font-mono text-xs font-semibold text-emerald-700">
                                  #{sub.subscription_code}
                                </span>
                              )}
                            </h3>
                            <p className="text-xs text-slate-500">
                              Từ {formatDate(sub.start_date)} đến {formatDate(sub.end_date)} • {Number(sub.weight_per_delivery)}kg/lượt • {formatMoney(sub.total_price)}đ •{' '}
                              {sub.payment_method === 'momo'
                                ? sub.payment_status === 'da_thanh_toan'
                                  ? 'Ví MoMo (Đã thanh toán)'
                                  : sub.payment_status === 'that_bai'
                                    ? 'Ví MoMo (Thất bại)'
                                    : 'Ví MoMo (Chờ thanh toán)'
                                : 'Tiền mặt (COD)'}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                sub.status === 'dang_hoat_dong'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : sub.status === 'tam_dung'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {sub.status === 'dang_hoat_dong'
                                ? 'Đang hoạt động'
                                : sub.status === 'tam_dung'
                                  ? 'Tạm dừng'
                                  : sub.status === 'da_huy'
                                    ? 'Đã hủy'
                                    : 'Hết hạn'}
                            </span>
                            {canChange && isUnpaidMoMo && (
                              <button
                                type="button"
                                disabled={retryingSubId === sub.id}
                                onClick={() => handleResumeMoMoPayment(sub)}
                                className="inline-flex items-center gap-1 rounded-lg bg-pink-600 px-3 py-1 text-xs font-semibold text-white hover:bg-pink-700 disabled:opacity-50"
                              >
                                <CreditCard size={13} />
                                {retryingSubId === sub.id ? 'Đang mở...' : 'Thanh toán MoMo'}
                              </button>
                            )}
                            {sub.status === 'dang_hoat_dong' && !isUnpaidMoMo && (
                              <button
                                type="button"
                                onClick={() => handleUpdateSubscriptionStatus(sub, 'tam_dung')}
                                className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                              >
                                <PauseCircle size={14} /> Tạm dừng
                              </button>
                            )}
                            {sub.status === 'tam_dung' && !isUnpaidMoMo && (
                              <button
                                type="button"
                                onClick={() => handleUpdateSubscriptionStatus(sub, 'dang_hoat_dong')}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                              >
                                <PlayCircle size={14} /> Tiếp tục
                              </button>
                            )}
                            {canChange && (
                              <button
                                type="button"
                                onClick={() => handleUpdateSubscriptionStatus(sub, 'da_huy')}
                                className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                              >
                                <XCircle size={14} /> Hủy gói
                              </button>
                            )}
                          </div>
                        </div>
                        {Array.isArray(sub.schedules) && sub.schedules.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {sub.schedules.slice(0, 12).map((sch) => (
                              <span
                                key={sch.id}
                                className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${
                                  sch.status === 'da_giao'
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                    : sch.status === 'da_tao_don'
                                      ? 'border-blue-200 bg-blue-50 text-blue-700'
                                      : sch.status === 'that_bai'
                                        ? 'border-rose-200 bg-rose-50 text-rose-700'
                                        : 'border-slate-200 bg-slate-50 text-slate-600'
                                }`}
                              >
                                {formatDate(sch.delivery_date)} (
                                {sch.status === 'da_tao_don'
                                  ? sch.order?.order_code || 'Đã tạo đơn'
                                  : sch.status === 'da_giao'
                                    ? 'Đã giao'
                                    : sch.status === 'that_bai'
                                      ? 'Thiếu hàng'
                                      : sch.status === 'da_huy'
                                        ? 'Đã hủy'
                                        : 'Chờ tới ngày'}
                                )
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <Pagination
                  currentPage={safeSubPage}
                  totalPages={totalSubPages}
                  onPageChange={setSubsPage}
                />
              </>
            )}
          </div>
        );
      })()}
    </div>
  );
}
