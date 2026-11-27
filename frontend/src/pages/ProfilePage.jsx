import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Camera,
  Lock,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Award,
  ShieldCheck,
} from 'lucide-react';
import { getAuthHeaders } from '../services/api';

const BASE_API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';
const AUTH_API = `${BASE_API}/auth`;

const ROLE_DISPLAY = {
  customer: 'Khách hàng thân thiết',
  farm_staff: 'Kỹ sư canh tác (Farm Staff)',
  sales: 'Nhân viên Bán hàng & CSKH (Sales)',
  admin: 'Quản trị viên (Admin)',
};

export default function ProfilePage({
  currentUser,
  onUserUpdated,
  canEditAvatar = false,
}) {
  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState('info');
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [avatarError, setAvatarError] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });

  // Snapshot đã lưu để tên hiển thị ở header chỉ cập nhật khi bấm Lưu
  const [savedProfile, setSavedProfile] = useState({
    full_name: currentUser?.full_name || currentUser?.name || '',
    email: currentUser?.email || '',
    avatar_url: currentUser?.avatar_url || '',
    loyalty_points: currentUser?.loyalty_points || 0,
  });

  const [form, setForm] = useState({
    full_name: currentUser?.full_name || currentUser?.name || '',
    email: currentUser?.email || '',
    phone: currentUser?.phone || '',
    address: currentUser?.address || '',
  });

  const [pwForm, setPwForm] = useState({
    current_password: '',
    new_password: '',
    new_password_confirmation: '',
  });

  const syncFromUser = (user) => {
    if (!user) return;
    setSavedProfile({
      full_name: user.full_name || user.name || '',
      email: user.email || '',
      avatar_url: user.avatar_url || '',
      loyalty_points: user.loyalty_points || 0,
    });
    setForm({
      full_name: user.full_name || user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      address: user.address || '',
    });
    setAvatarError(false);
  };

  useEffect(() => {
    syncFromUser(currentUser);
  }, [currentUser]);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      try {
        const res = await axios.get(`${AUTH_API}/profile`, {
          headers: {
            Accept: 'application/json',
            ...getAuthHeaders(),
          },
        });
        const freshUser = res.data?.data?.user;
        if (mounted && freshUser) {
          syncFromUser(freshUser);
          if (onUserUpdated) onUserUpdated(freshUser);
        }
      } catch (err) {
        console.error('Lỗi tải hồ sơ cá nhân:', err);
      } finally {
        if (mounted) setLoadingProfile(false);
      }
    };

    loadProfile();
    return () => {
      mounted = false;
    };
  }, []);

  const extractError = (err, fallback) => {
    const data = err?.response?.data;
    if (data?.errors) {
      const first = Object.values(data.errors)[0];
      if (Array.isArray(first) && first.length > 0) return first[0];
    }
    if (data?.message) return data.message;
    if (!err?.response) {
      return 'Không thể kết nối Backend Laravel. Hãy kiểm tra server và MySQL.';
    }
    return fallback;
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileMsg({ type: '', text: '' });
    setSavingProfile(true);

    try {
      const payload = {
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
      };

      const res = await axios.put(`${AUTH_API}/profile`, payload, {
        headers: {
          Accept: 'application/json',
          ...getAuthHeaders(),
        },
      });

      const updatedUser = res.data?.data?.user;
      if (updatedUser) {
        syncFromUser(updatedUser);
        if (onUserUpdated) onUserUpdated(updatedUser);
      }

      setProfileMsg({
        type: 'success',
        text: res.data?.message || 'Cập nhật thông tin cá nhân thành công!',
      });
    } catch (err) {
      setProfileMsg({
        type: 'error',
        text: extractError(err, 'Không thể cập nhật thông tin cá nhân.'),
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !canEditAvatar) return;

    if (!file.type.startsWith('image/')) {
      setProfileMsg({ type: 'error', text: 'Vui lòng chọn tệp hình ảnh (JPG, PNG, WEBP).' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setProfileMsg({ type: 'error', text: 'Ảnh đại diện không được vượt quá 5MB.' });
      return;
    }

    setUploadingAvatar(true);
    setProfileMsg({ type: '', text: '' });

    try {
      const fd = new FormData();
      fd.append('avatar', file);

      const res = await axios.post(`${AUTH_API}/profile/avatar`, fd, {
        headers: {
          Accept: 'application/json',
          ...getAuthHeaders(),
        },
      });

      const updatedUser = res.data?.data?.user;
      const newAvatarUrl = res.data?.data?.avatar_url;

      if (updatedUser) {
        setSavedProfile((prev) => ({
          ...prev,
          avatar_url: updatedUser.avatar_url || prev.avatar_url,
        }));
        setAvatarError(false);
        if (onUserUpdated) onUserUpdated(updatedUser);
      } else if (newAvatarUrl) {
        setSavedProfile((prev) => ({ ...prev, avatar_url: newAvatarUrl }));
        setAvatarError(false);
      }

      setProfileMsg({
        type: 'success',
        text: 'Đã tải lên và lưu ảnh đại diện mới!',
      });
    } catch (err) {
      setProfileMsg({
        type: 'error',
        text: extractError(err, 'Không thể tải ảnh đại diện lên server.'),
      });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMsg({ type: '', text: '' });

    if (pwForm.new_password.length < 8) {
      setPasswordMsg({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 8 ký tự.' });
      return;
    }

    if (pwForm.new_password !== pwForm.new_password_confirmation) {
      setPasswordMsg({ type: 'error', text: 'Mật khẩu xác nhận không khớp.' });
      return;
    }

    setSavingPassword(true);

    try {
      const res = await axios.put(`${AUTH_API}/change-password`, pwForm, {
        headers: {
          Accept: 'application/json',
          ...getAuthHeaders(),
        },
      });

      setPwForm({
        current_password: '',
        new_password: '',
        new_password_confirmation: '',
      });
      setPasswordMsg({
        type: 'success',
        text: res.data?.message || 'Đổi mật khẩu thành công!',
      });
    } catch (err) {
      setPasswordMsg({
        type: 'error',
        text: extractError(err, 'Không thể đổi mật khẩu.'),
      });
    } finally {
      setSavingPassword(false);
    }
  };

  // Chỉ dùng giá trị đã lưu trong savedProfile để không nhảy chữ khi đang gõ
  const displayName = savedProfile.full_name || savedProfile.email || 'Tài khoản';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

  const roleCode =
    typeof currentUser?.role === 'string'
      ? currentUser.role
      : currentUser?.role?.name || 'customer';

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4 sm:p-6">
      {/* HEADER HỒ SƠ */}
      <div className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              {canEditAvatar && savedProfile.avatar_url && !avatarError ? (
                <img
                  src={savedProfile.avatar_url}
                  alt={displayName}
                  onError={() => setAvatarError(true)}
                  className="h-20 w-20 rounded-full border-4 border-emerald-100 object-cover shadow-sm"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-emerald-100 bg-emerald-600 text-2xl font-extrabold text-white shadow-sm">
                  {initials || <User size={30} />}
                </div>
              )}

              {canEditAvatar && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  title="Tải ảnh đại diện từ máy"
                  className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-emerald-600 text-white shadow hover:bg-emerald-700 disabled:opacity-60"
                >
                  {uploadingAvatar ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Camera size={14} />
                  )}
                </button>
              )}
            </div>

            <div>
              <h1 className="text-2xl font-extrabold text-slate-800">
                {displayName}
              </h1>
              <p className="mt-1 text-sm text-slate-500">{savedProfile.email}</p>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                {!canEditAvatar && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                    <ShieldCheck size={14} />
                    {ROLE_DISPLAY[roleCode] || 'Nhân sự hệ thống'}
                  </span>
                )}

                {canEditAvatar && (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
                    <Award size={14} />
                    {Number(savedProfile.loyalty_points || 0).toLocaleString('vi-VN')} điểm Loyalty
                  </span>
                )}
              </div>
            </div>
          </div>

          {canEditAvatar && (
            <div className="flex flex-wrap gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
              >
                <Camera size={16} />
                {uploadingAvatar ? 'Đang tải ảnh...' : 'Đổi ảnh đại diện'}
              </button>
            </div>
          )}
        </div>
      </div>

      {loadingProfile && (
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-medium text-slate-500">
          <Loader2 size={16} className="animate-spin text-emerald-600" />
          Đang đồng bộ thông tin tài khoản từ cơ sở dữ liệu...
        </div>
      )}

      {/* THANH TAB CHUYỂN ĐỔI */}
      <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <button
          type="button"
          onClick={() => setActiveTab('info')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
            activeTab === 'info'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <User size={17} />
          Thông tin cá nhân
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('password')}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
            activeTab === 'password'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Lock size={17} />
          Đổi mật khẩu
        </button>
      </div>

      {/* TAB 1: THÔNG TIN CÁ NHÂN */}
      {activeTab === 'info' && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-lg font-bold text-slate-800">
            Thông tin cá nhân
          </h2>
          <p className="mb-5 text-xs text-slate-500">
            Cập nhật thông tin liên hệ chính xác để thuận tiện cho việc giao hàng và hỗ trợ.
          </p>

          {profileMsg.text && (
            <div
              className={`mb-5 flex items-start gap-2.5 rounded-2xl border p-4 text-sm ${
                profileMsg.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-rose-200 bg-rose-50 text-rose-700'
              }`}
            >
              {profileMsg.type === 'success' ? (
                <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
              ) : (
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
              )}
              <span>{profileMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                  Họ và tên
                </label>
                <div className="relative">
                  <User size={18} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={form.full_name}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, full_name: e.target.value }))
                    }
                    placeholder="Nhập họ và tên"
                    className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                  Số điện thoại
                </label>
                <div className="relative">
                  <Phone size={18} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="tel"
                    required
                    value={form.phone}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, phone: e.target.value }))
                    }
                    placeholder="VD: 0901234567"
                    className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">
                Email đăng nhập
              </label>
              <div className="relative">
                <Mail size={18} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="email"
                  disabled
                  value={form.email}
                  className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">
                Địa chỉ giao hàng / Liên hệ
              </label>
              <div className="relative">
                <MapPin size={18} className="absolute left-3.5 top-3 text-slate-400" />
                <textarea
                  rows={2}
                  value={form.address}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, address: e.target.value }))
                  }
                  placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố..."
                  className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingProfile}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {savingProfile ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Lưu thông tin cá nhân
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: ĐỔI MẬT KHẨU */}
      {activeTab === 'password' && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-lg font-bold text-slate-800">
            Đổi mật khẩu
          </h2>
          <p className="mb-5 text-xs text-slate-500">
            Đặt mật khẩu mới ít nhất 8 ký tự để bảo mật tài khoản.
          </p>

          {passwordMsg.text && (
            <div
              className={`mb-4 flex items-start gap-2 rounded-2xl border p-3.5 text-xs ${
                passwordMsg.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-rose-200 bg-rose-50 text-rose-700'
              }`}
            >
              {passwordMsg.type === 'success' ? (
                <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              ) : (
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
              )}
              <span>{passwordMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                Mật khẩu hiện tại
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="password"
                  required
                  value={pwForm.current_password}
                  onChange={(e) =>
                    setPwForm((prev) => ({ ...prev, current_password: e.target.value }))
                  }
                  placeholder="Nhập mật khẩu cũ"
                  className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Mật khẩu mới
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={pwForm.new_password}
                    onChange={(e) =>
                      setPwForm((prev) => ({ ...prev, new_password: e.target.value }))
                    }
                    placeholder="Tối thiểu 8 ký tự"
                    className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">
                  Xác nhận mật khẩu mới
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={pwForm.new_password_confirmation}
                    onChange={(e) =>
                      setPwForm((prev) => ({
                        ...prev,
                        new_password_confirmation: e.target.value,
                      }))
                    }
                    placeholder="Nhập lại mật khẩu mới"
                    className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={savingPassword}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {savingPassword ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Đang cập nhật...
                </>
              ) : (
                'Cập nhật mật khẩu'
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
