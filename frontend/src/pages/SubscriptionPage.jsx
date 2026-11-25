import React, { useMemo, useState } from 'react';
import axios from 'axios';
import {
  RefreshCw, Calendar, MapPin, Truck, CheckCircle2, ShieldCheck,
  Sparkles, Loader2, AlertCircle
} from 'lucide-react';

const API_URL = 'http://localhost:8000/api/v1/subscriptions';

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

const toLocalISO = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};
const parseLocalDate = (iso) => {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
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

export default function SubscriptionPage() {
  const [selectedPack, setSelectedPack] = useState(PACKAGES[0]);
  const [deliveryDays, setDeliveryDays] = useState(['Tuesday', 'Friday']);
  const [address, setAddress] = useState('');
  const [durationMonths, setDurationMonths] = useState(1);
  const [startDate, setStartDate] = useState(toLocalISO(new Date()));
  const [loading, setLoading] = useState(false);
  const [subSuccess, setSubSuccess] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    if (!startDate) return setErrorMessage('Vui lòng chọn ngày bắt đầu gói.');
    if (!deliveryDays.length) return setErrorMessage('Vui lòng chọn ít nhất một ngày giao hàng.');
    if (!deliverySchedule.length) return setErrorMessage('Không có lượt giao nào trong thời hạn đã chọn. Hãy điều chỉnh ngày bắt đầu hoặc lịch giao.');
    if (!address.trim() || address.trim().length < 10) return setErrorMessage('Vui lòng nhập địa chỉ giao hàng chi tiết (ít nhất 10 ký tự).');

    setLoading(true);
    const payload = {
      package_id: selectedPack.id,
      package_name: selectedPack.name,
      weight_per_delivery: selectedPack.weight,
      delivery_days: deliveryDays,
      delivery_address: address.trim(),
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
    } catch (error) {
      console.error('Subscription API Error:', error);
      if (error.response) {
        const status = error.response.status;
        const serverData = error.response.data;
        if (status === 422) {
          const validationErrors = serverData?.errors;
          const firstError = validationErrors ? Object.values(validationErrors)[0] : null;
          setErrorMessage(Array.isArray(firstError) ? firstError[0] : (serverData?.message || 'Vui lòng kiểm tra lại thông tin đăng ký.'));
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
    setSubSuccess(null); setErrorMessage(''); setAddress(''); setDeliveryDays(['Tuesday', 'Friday']);
    setSelectedPack(PACKAGES[0]); setDurationMonths(1); setStartDate(toLocalISO(new Date()));
  };

  if (subSuccess) {
    const successStart = subSuccess.start_date || startDate;
    const successEnd = subSuccess.end_date || endDate;
    return (
      <div className="mx-auto max-w-4xl p-4 sm:p-6">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-6 sm:p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-white"><CheckCircle2 size={36} /></div>
          <h2 className="text-2xl font-bold text-emerald-900">Đăng Ký Gói Nông Sản Thành Công!</h2>
          <p className="mt-2 text-sm text-emerald-700">Hệ thống đã tiếp nhận đăng ký định kỳ của bạn.</p>
          {subSuccess.id && <p className="mt-3 text-sm font-bold text-emerald-800">Mã đăng ký: #{subSuccess.id}</p>}
          <div className="mx-auto mt-6 max-w-lg rounded-xl bg-white p-5 text-left shadow-sm">
            <h3 className="font-bold text-slate-800">{subSuccess.package_name}</h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-600">
              <li className="flex justify-between gap-3"><span>Ngày bắt đầu:</span><strong className="text-emerald-700">{formatDate(successStart)}</strong></li>
              <li className="flex justify-between gap-3"><span>Ngày kết thúc:</span><strong className="text-emerald-700">{formatDate(successEnd)}</strong></li>
              <li className="flex justify-between gap-3"><span>Lịch giao:</span><strong className="text-right">{(subSuccess.delivery_days || deliveryDays).map((day) => DELIVERY_OPTIONS.find((item) => item.id === day)?.label || day).join(', ')}</strong></li>
              <li className="flex justify-between gap-3"><span>Địa chỉ nhận:</span><strong className="max-w-[65%] text-right">{subSuccess.delivery_address || address}</strong></li>
              <li className="flex justify-between gap-3"><span>Thời hạn:</span><strong>{subSuccess.duration_months || durationMonths} tháng</strong></li>
              <li className="flex justify-between gap-3"><span>Số lượt giao:</span><strong>{subSuccess.total_deliveries ?? totalDeliveries} lượt</strong></li>
              <li className="flex justify-between border-t border-slate-100 pt-3"><span>Tạm tính:</span><strong>{formatMoney(subSuccess.original_price ?? originalPrice)}đ</strong></li>
              <li className="flex justify-between"><span>Giảm giá:</span><strong className="text-emerald-600">-{formatMoney(subSuccess.discount_amount ?? discountAmount)}đ</strong></li>
              <li className="flex justify-between border-t border-slate-100 pt-3 text-base font-bold text-emerald-700"><span>Tổng chi phí:</span><span>{formatMoney(subSuccess.total_price ?? totalPrice)}đ</span></li>
            </ul>
          </div>
          <button type="button" onClick={resetSubscription} className="mt-6 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white hover:bg-emerald-700">Đăng ký gói khác</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4 sm:p-6">
      <div className="text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800"><Sparkles size={14} />Giải Pháp Nông Sản Định Kỳ</span>
        <h1 className="mt-3 text-2xl font-extrabold text-slate-800 sm:text-3xl">Đăng Ký Gói Rau Tươi Giao Theo Tuần</h1>
        <p className="mt-2 text-sm text-slate-500">Lựa chọn gói nông sản phù hợp và nhận hàng định kỳ tại nhà.</p>
      </div>
      {errorMessage && <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"><AlertCircle size={18} className="shrink-0" />{errorMessage}</div>}
      <div className="grid gap-8 lg:grid-cols-3">
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
          <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800">2. Cấu Hình Thời Hạn, Lịch Giao & Địa Chỉ</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div><label htmlFor="start-date" className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Ngày bắt đầu gói</label><input id="start-date" type="date" required min={toLocalISO(new Date())} value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-sm outline-none focus:border-emerald-500" /></div>
              <div><label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Thời hạn đăng ký</label><select value={durationMonths} onChange={(e) => setDurationMonths(Number(e.target.value))} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm outline-none focus:border-emerald-500"><option value={1}>1 tháng - Không giảm giá</option><option value={3}>3 tháng - Giảm 5%</option><option value={6}>6 tháng - Giảm 10%</option></select></div>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4"><div className="flex items-center gap-2 text-sm font-semibold text-emerald-800"><Calendar size={17}/>Thời hạn gói dự kiến</div><div className="mt-2 grid grid-cols-2 gap-3 text-sm"><div><span className="text-slate-500">Bắt đầu</span><p className="font-bold text-slate-800">{formatDate(startDate)}</p></div><div><span className="text-slate-500">Kết thúc</span><p className="font-bold text-slate-800">{formatDate(endDate)}</p></div></div><p className="mt-2 text-xs text-emerald-700">Ngày kết thúc được tính theo tháng lịch, kết thúc trước ngày kỷ niệm bắt đầu một ngày.</p></div>
            <div><label className="mb-3 block text-xs font-bold uppercase tracking-wider text-slate-500">Ngày giao hàng trong tuần (chọn ít nhất 1)</label><div className="flex flex-wrap gap-3">{DELIVERY_OPTIONS.map((item) => <button type="button" key={item.id} onClick={() => toggleDay(item.id)} className={`flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-bold transition ${deliveryDays.includes(item.id) ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}><Calendar size={15}/>{item.label} hàng tuần</button>)}</div></div>
            <div><label htmlFor="delivery-address" className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500">Địa chỉ giao hàng</label><div className="relative"><MapPin size={17} className="absolute left-3 top-3.5 text-slate-400"/><input id="delivery-address" type="text" required minLength={10} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Nhập địa chỉ nhận hàng chi tiết" className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-3 text-sm outline-none focus:border-emerald-500"/></div></div>
            <div className="rounded-xl bg-amber-50 p-4 text-xs leading-relaxed text-amber-800"><ShieldCheck size={18} className="mb-2 text-amber-600"/>Lịch giao và thời hạn được gửi đến hệ thống khi bạn xác nhận. Số lượt giao và chi phí được tính theo các ngày giao thực tế nằm trong thời hạn gói.</div>
            <button type="submit" disabled={loading || !deliverySchedule.length} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">{loading ? <><Loader2 size={18} className="animate-spin"/>Đang xử lý đăng ký...</> : <><CheckCircle2 size={18}/>Xác Nhận Đăng Ký - {formatMoney(totalPrice)}đ</>}</button>
          </form>
        </div>
        <aside className="h-fit space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="flex items-center gap-2 border-b border-slate-100 pb-3 font-bold text-slate-800"><RefreshCw size={19} className="text-emerald-600"/>Tóm Tắt Gói Định Kỳ</h3>
          <div className="space-y-4 text-sm"><div className="flex justify-between gap-3"><span className="text-slate-500">Gói đã chọn:</span><strong className="text-right text-slate-800">{selectedPack.name}</strong></div><div className="flex justify-between"><span className="text-slate-500">Đơn giá/lượt:</span><strong className="text-emerald-700">{formatMoney(selectedPack.basePricePerDelivery)}đ</strong></div><div className="flex justify-between gap-3"><span className="text-slate-500">Thời hạn:</span><strong>{durationMonths} tháng</strong></div><div className="flex justify-between gap-3"><span className="text-slate-500">Ngày bắt đầu:</span><strong>{formatDate(startDate)}</strong></div><div className="flex justify-between gap-3"><span className="text-slate-500">Ngày kết thúc:</span><strong>{formatDate(endDate)}</strong></div><div className="flex justify-between gap-3"><span className="text-slate-500">Lịch giao:</span><strong className="text-right">{deliveryDays.map((day) => DELIVERY_OPTIONS.find((item) => item.id === day)?.label).join(', ')}</strong></div><div className="flex justify-between"><span className="text-slate-500">Số lượt giao thực tế:</span><strong>{totalDeliveries} lượt</strong></div><div className="flex justify-between border-t border-slate-100 pt-3"><span className="text-slate-500">Tạm tính:</span><strong>{formatMoney(originalPrice)}đ</strong></div><div className="flex justify-between"><span className="text-slate-500">Giảm giá ({discountRate * 100}%):</span><strong className="text-emerald-600">-{formatMoney(discountAmount)}đ</strong></div><div className="flex justify-between border-t border-slate-100 pt-4 text-base"><span className="font-bold text-slate-800">Tổng chi phí:</span><strong className="text-lg text-emerald-700">{formatMoney(totalPrice)}đ</strong></div></div>
          <div className="rounded-xl bg-emerald-50 p-3 text-xs text-emerald-700"><Truck size={17} className="mb-2"/>Dự kiến có {totalDeliveries} lượt giao trong khoảng {formatDate(startDate)} – {formatDate(endDate)}.</div>
        </aside>
      </div>
    </div>
  );
}
