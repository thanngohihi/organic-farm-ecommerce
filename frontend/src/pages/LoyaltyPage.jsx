
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  Award,
  Gift,
  History,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  Coins,
  Loader2,
  AlertCircle,
} from 'lucide-react';

const API_URL = 'http://localhost:8000/api/v1/customer/loyalty';
const REDEEM_URL = 'http://localhost:8000/api/v1/customer/loyalty/redeem';

const VOUCHERS = [
  {
    id: 1,
    name: 'Voucher Miễn Phí Vận Chuyển 20k',
    cost: 200,
    desc: 'Áp dụng cho đơn hàng nông sản từ 150.000đ',
  },
  {
    id: 2,
    name: 'Voucher Giảm 10% Tổng Đơn Hàng',
    cost: 300,
    desc: 'Giảm tối đa 50.000đ cho đơn hàng rau củ sạch',
  },
  {
    id: 3,
    name: 'Voucher Tặng 1kg Cà Chua Cherry VietGAP',
    cost: 400,
    desc: 'Đổi điểm nhận quà nông sản tươi sạch tại vườn',
  },
];

const INITIAL_DATA = {
  member_tier: 'Thành viên',
  total_points: 0,
  point_value_vnd: 0,
  next_tier: 'Hạng tiếp theo',
  points_needed_next_tier: 0,
  history: [],
};

export default function LoyaltyPage() {
  const [loyaltyData, setLoyaltyData] = useState(INITIAL_DATA);
  const [vouchers, setVouchers] = useState(VOUCHERS);
  const [redeemedIds, setRedeemedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [redeemingId, setRedeemingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // ================================================
  // TẢI THÔNG TIN LOYALTY
  // ================================================

  const fetchLoyalty = async () => {
    try {
      setErrorMessage('');

      const response = await axios.get(API_URL, {
        headers: { Accept: 'application/json' },
      });

      const result = response.data?.data || response.data;

      setLoyaltyData({
        ...INITIAL_DATA,
        ...result,
        history: result?.history || [],
      });

      if (Array.isArray(result?.vouchers)) {
        setVouchers(result.vouchers);
      }

      if (Array.isArray(result?.redeemed_voucher_ids)) {
        setRedeemedIds(result.redeemed_voucher_ids);
      }
    } catch (error) {
      console.error('Loyalty API Error:', error);

      setErrorMessage(
        error.response?.data?.message ||
        'Không thể tải thông tin điểm thưởng. Vui lòng kiểm tra Backend hoặc đăng nhập lại.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoyalty();
  }, []);

  // ================================================
  // ĐỔI VOUCHER
  // ================================================

  const handleRedeem = async (voucher) => {
    if (redeemingId !== null) return;

    if (loyaltyData.total_points < voucher.cost) {
      setErrorMessage('Bạn không đủ điểm để đổi voucher này.');
      return;
    }

    const confirmed = window.confirm(
      `Bạn có chắc muốn sử dụng ${voucher.cost} điểm để đổi "${voucher.name}"?`
    );

    if (!confirmed) return;

    try {
      setRedeemingId(voucher.id);
      setErrorMessage('');
      setSuccessMessage('');

      const response = await axios.post(
        REDEEM_URL,
        {
          voucher_id: voucher.id,
        },
        {
          headers: { Accept: 'application/json' },
        }
      );

      const result = response.data?.data || response.data;

      setSuccessMessage(
        result?.message ||
        'Đổi voucher thành công!'
      );

      // Lấy lại số điểm và lịch sử chính thức từ Backend
      await fetchLoyalty();

    } catch (error) {
      console.error('Redeem Voucher Error:', error);

      setErrorMessage(
        error.response?.data?.message ||
        'Đổi voucher thất bại. Vui lòng thử lại.'
      );
    } finally {
      setRedeemingId(null);
    }
  };

  // ================================================
  // FORMAT
  // ================================================

  const formatMoney = (value) =>
    Number(value || 0).toLocaleString('vi-VN');

  const progress = Math.min(
    100,
    Math.max(
      0,
      loyaltyData.points_needed_next_tier > 0
        ? 100 - (
            loyaltyData.points_needed_next_tier /
            Math.max(
              1,
              loyaltyData.total_points +
              loyaltyData.points_needed_next_tier
            )
          ) * 100
        : 100
    )
  );

  // ================================================
  // LOADING
  // ================================================

  if (loading) {
    return (
      <div className="flex min-h-[350px] items-center justify-center gap-3 text-emerald-700">
        <Loader2 className="animate-spin" size={25} />
        <span className="text-sm font-semibold">
          Đang tải thông tin điểm thưởng...
        </span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">

      {/* HEADER */}

      <div className="border-b border-slate-200 pb-4">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-800">
          <Award className="h-7 w-7 text-amber-500" />
          Ví Điểm Thưởng & Khách Hàng Thân Thiết
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Tích điểm qua mỗi đơn hàng nông sản sạch để đổi quà và voucher.
        </p>
      </div>

      {/* ERROR */}

      {errorMessage && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          <AlertCircle size={18} className="shrink-0" />
          {errorMessage}
          <button
            type="button"
            onClick={fetchLoyalty}
            className="ml-auto font-bold underline"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* SUCCESS */}

      {successMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          <CheckCircle2 size={18} />
          {successMessage}
        </div>
      )}

      {/* MEMBER OVERVIEW */}

      <div className="grid gap-6 md:grid-cols-3">

        <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 p-6 text-white shadow-md md:col-span-2">

          <div className="flex items-center justify-between">

            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/30 px-3 py-1 text-xs font-bold uppercase">
              <Sparkles size={14} />
              Hạng thành viên: {loyaltyData.member_tier}
            </span>

            <Coins size={32} className="text-amber-200" />

          </div>

          <div className="mt-5">

            <p className="text-sm text-amber-100">
              Số điểm hiện có
            </p>

            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold">
                {formatMoney(loyaltyData.total_points)}
              </span>
              <span className="text-lg font-semibold text-amber-200">
                điểm
              </span>
            </div>

            <p className="mt-2 text-xs text-amber-100">
              Giá trị quy đổi:
              <strong className="ml-1 text-white">
                {formatMoney(loyaltyData.point_value_vnd)} đ
              </strong>
            </p>

          </div>

          <div className="mt-6 border-t border-amber-400/40 pt-4">

            <div className="mb-2 flex justify-between gap-2 text-xs text-amber-100">
              <span>Lên hạng {loyaltyData.next_tier}</span>
              <span>
                Còn {formatMoney(loyaltyData.points_needed_next_tier)} điểm
              </span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-amber-700/40">
              <div
                className="h-full rounded-full bg-white transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>

          </div>

        </div>

        {/* RULES */}

        <div className="flex flex-col justify-between rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5">

          <div>
            <h3 className="mb-3 flex items-center gap-2 font-bold text-emerald-900">
              <TrendingUp size={20} />
              Quy tắc tích điểm
            </h3>

            <ul className="space-y-3 text-xs leading-relaxed text-emerald-800">

              <li className="flex gap-2">
                <CheckCircle2 size={15} className="shrink-0" />
                Mỗi 10.000đ chi tiêu = 1 điểm.
              </li>

              <li className="flex gap-2">
                <CheckCircle2 size={15} className="shrink-0" />
                Hoàn thành đánh giá sản phẩm = +10 điểm.
              </li>

              <li className="flex gap-2">
                <CheckCircle2 size={15} className="shrink-0" />
                1 điểm có giá trị quy đổi 100đ.
              </li>

            </ul>
          </div>

          <div className="mt-4 rounded-xl border border-emerald-200 bg-white p-3 text-center text-xs font-bold text-emerald-700">
            Tích càng nhiều - Đổi quà càng nhiều!
          </div>

        </div>

      </div>

      {/* VOUCHERS */}

      <div className="space-y-4">

        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800">
          <Gift size={20} className="text-emerald-600" />
          Đổi Điểm Thưởng Lấy Ưu Đãi
        </h2>

        <div className="grid gap-4 md:grid-cols-3">

          {vouchers.map((voucher) => {

            const isRedeemed = redeemedIds.includes(voucher.id);

            const canRedeem =
              loyaltyData.total_points >= voucher.cost;

            return (
              <div
                key={voucher.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >

                <div>

                  <span className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                    {voucher.cost} điểm
                  </span>

                  <h4 className="mt-3 text-sm font-bold text-slate-800">
                    {voucher.name}
                  </h4>

                  <p className="mt-2 text-xs leading-relaxed text-slate-500">
                    {voucher.desc}
                  </p>

                </div>

                <button
                  type="button"
                  onClick={() => handleRedeem(voucher)}
                  disabled={
                    isRedeemed ||
                    !canRedeem ||
                    redeemingId !== null
                  }
                  className={`mt-5 flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold transition ${
                    isRedeemed
                      ? 'cursor-not-allowed bg-slate-100 text-slate-400'
                      : canRedeem
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'cursor-not-allowed bg-slate-200 text-slate-500'
                  }`}
                >

                  {redeemingId === voucher.id ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      Đang đổi...
                    </>
                  ) : isRedeemed ? (
                    'Đã đổi voucher'
                  ) : canRedeem ? (
                    'Đổi voucher ngay'
                  ) : (
                    'Không đủ điểm'
                  )}

                </button>

              </div>
            );
          })}

        </div>

      </div>

      {/* HISTORY */}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

        <h3 className="mb-4 flex items-center gap-2 font-bold text-slate-800">
          <History size={20} />
          Lịch Sử Tích & Sử Dụng Điểm
        </h3>

        {loyaltyData.history.length === 0 ? (

          <p className="py-8 text-center text-sm text-slate-400">
            Chưa có lịch sử giao dịch điểm.
          </p>

        ) : (

          <div className="divide-y divide-slate-100">

            {loyaltyData.history.map((item) => {

              const isEarn = item.type === 'earn';

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 py-4"
                >

                  <div className="flex min-w-0 items-center gap-3">

                    <div className={`rounded-xl p-2.5 ${
                      isEarn
                        ? 'bg-emerald-50 text-emerald-600'
                        : 'bg-amber-50 text-amber-600'
                    }`}>
                      {isEarn
                        ? <TrendingUp size={17} />
                        : <Gift size={17} />
                      }
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {item.title}
                      </p>
                      <p className="text-xs text-slate-400">
                        {item.date}
                      </p>
                    </div>

                  </div>

                  <span className={`shrink-0 font-bold ${
                    isEarn ? 'text-emerald-600' : 'text-amber-600'
                  }`}>
                    {item.points} điểm
                  </span>

                </div>
              );
            })}

          </div>

        )}

      </div>

    </div>
  );
}
