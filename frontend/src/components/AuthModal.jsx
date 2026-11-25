
import React, { useEffect, useState } from 'react';
import {
    X,
    Lock,
    Mail,
    User,
    Leaf,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Phone,
} from 'lucide-react';
import axios from 'axios';
import { mockLogin } from '../services/mockAuth';

const API_URL = 'http://localhost:8000/api/v1/auth';

const INITIAL_FORM_DATA = {
    name: '',
    phone: '',
    email: '',
    password: '',
    password_confirmation: '',
};

export default function AuthModal({ isOpen, onClose, onLoginSuccess }) {
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loggedInUser, setLoggedInUser] = useState(null);

    const [formData, setFormData] = useState(INITIAL_FORM_DATA);

    // Đặt lại trạng thái modal mỗi khi mở lại để tránh giữ user đã đăng nhập trước đó
    useEffect(() => {
        if (isOpen) {
            setIsLogin(true);
            setLoading(false);
            setError('');
            setSuccess('');
            setLoggedInUser(null);
            setFormData(INITIAL_FORM_DATA);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    // ==========================================
    // CẬP NHẬT FORM
    // ==========================================

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));

        setError('');
        setSuccess('');
    };

    // ==========================================
    // XỬ LÝ LỖI API LARAVEL
    // ==========================================

    const getApiErrorMessage = (err) => {
        const response = err.response;

        if (!response) {
            return 'Không thể kết nối máy chủ. Vui lòng kiểm tra Laravel đã chạy chưa.';
        }

        if (response.status === 422) {
            const errors = response.data?.errors;

            if (errors) {
                const firstError = Object.values(errors)[0];

                if (Array.isArray(firstError)) {
                    return firstError[0];
                }
            }

            return response.data?.message || 'Dữ liệu không hợp lệ.';
        }

        if (response.status === 401) {
            return response.data?.message || 'Email hoặc mật khẩu không chính xác.';
        }

        if (response.status === 409) {
            return response.data?.message || 'Email đã tồn tại.';
        }

        if (response.status === 403) {
            return response.data?.message || 'Bạn không có quyền thực hiện thao tác.';
        }

        if (response.status >= 500) {
            return 'Máy chủ gặp lỗi. Vui lòng thử lại sau.';
        }

        return response.data?.message || err.message || 'Đã xảy ra lỗi.';
    };

    // ==========================================
    // ĐĂNG NHẬP API
    // ==========================================

    const handleLogin = async (email, password) => {
        try {
            const response = await axios.post(`${API_URL}/login`, {
                email,
                password,
            });

            const data = response.data;

            const user =
                data.user ||
                data.data?.user ||
                data.data ||
                null;

            const token =
                data.token ||
                data.access_token ||
                data.data?.token ||
                data.data?.access_token ||
                null;

            if (!user) {
                throw new Error('API không trả về thông tin tài khoản.');
            }

            if (token) {
                localStorage.setItem('access_token', token);
            }

            setLoggedInUser(user);
            setSuccess('Đăng nhập thành công!');
        } catch (err) {
            // Chỉ fallback sang tài khoản demo khi chưa kết nối được Backend Laravel
            if (!err.response) {
                try {
                    const mockRes = await mockLogin(email, password);
                    if (mockRes.token) {
                        localStorage.setItem('access_token', mockRes.token);
                    }
                    setLoggedInUser(mockRes.user);
                    setSuccess('Đăng nhập thành công (Chế độ Demo offline)!');
                    return;
                } catch {
                    // Giữ nguyên lỗi kết nối Backend bên dưới
                }
            }

            throw err;
        }
    };

    // ==========================================
    // ĐĂNG KÝ API
    // ==========================================

    const handleRegister = async (
        full_name,
        phone,
        email,
        password,
        password_confirmation
    ) => {
        if (!full_name) {
            throw new Error('Vui lòng nhập họ và tên.');
        }

        if (!phone) {
            throw new Error('Vui lòng nhập số điện thoại.');
        }

        if (!email) {
            throw new Error('Vui lòng nhập email.');
        }

        if (password.length < 8) {
            throw new Error('Mật khẩu phải có ít nhất 8 ký tự.');
        }

        if (password !== password_confirmation) {
            throw new Error('Mật khẩu xác nhận không khớp.');
        }

        const response = await axios.post(`${API_URL}/register`, {
            full_name,
            phone,
            email,
            password,
            password_confirmation,
        });

        setSuccess(
            response.data?.message ||
            'Đăng ký thành công! Vui lòng đăng nhập.'
        );

        // Chuyển sang đăng nhập sau khi đăng ký thành công
        setIsLogin(true);

        setFormData({
            name: '',
            phone: '',
            email,
            password: '',
            password_confirmation: '',
        });
    };

    // ==========================================
    // SUBMIT FORM
    // ==========================================

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (loading) return;

        const form = e.currentTarget;

        // Đọc trực tiếp giá trị input, hạn chế lỗi autofill
        const nameInput = form.querySelector('[name="name"]');
        const phoneInput = form.querySelector('[name="phone"]');
        const emailInput = form.querySelector('[name="email"]');
        const passwordInput = form.querySelector('[name="password"]');
        const confirmInput = form.querySelector(
            '[name="password_confirmation"]'
        );

        const full_name = nameInput?.value?.trim() || '';
        const phone = phoneInput?.value?.trim() || '';
        const email = emailInput?.value?.trim() || '';
        const password = passwordInput?.value || '';
        const password_confirmation = confirmInput?.value || '';

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            if (isLogin) {
                await handleLogin(email, password);
            } else {
                await handleRegister(
                    full_name,
                    phone,
                    email,
                    password,
                    password_confirmation
                );
            }
        } catch (err) {
            setSuccess('');

            setError(
                err.response
                    ? getApiErrorMessage(err)
                    : err.message || 'Đã xảy ra lỗi!'
            );
        } finally {
            setLoading(false);
        }
    };

    // ==========================================
    // TIẾP TỤC SAU ĐĂNG NHẬP
    // ==========================================

    const handleContinue = () => {
        if (loggedInUser) {
            const userToPass = loggedInUser;
            setLoggedInUser(null);
            setSuccess('');
            setError('');
            setFormData(INITIAL_FORM_DATA);
            onLoginSuccess(userToPass);
            onClose();
        }
    };

    // ==========================================
    // ĐỔI CHẾ ĐỘ ĐĂNG NHẬP / ĐĂNG KÝ
    // ==========================================

    const handleSwitchMode = () => {
        setIsLogin(!isLogin);
        setError('');
        setSuccess('');
        setLoggedInUser(null);

        setFormData({
            name: '',
            phone: '',
            email: formData.email,
            password: '',
            password_confirmation: '',
        });
    };

    // ==========================================
    // GIAO DIỆN
    // ==========================================

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">

            <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8">

                {/* NÚT ĐÓNG */}

                <button
                    type="button"
                    onClick={onClose}
                    disabled={loading}
                    className="absolute right-4 top-4 rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                >
                    <X size={22} />
                </button>

                {/* HEADER */}

                <div className="mb-6 text-center">

                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100">
                        <Leaf className="text-emerald-600" size={30} />
                    </div>

                    <h2 className="text-2xl font-bold text-gray-800">
                        {isLogin
                            ? 'Đăng nhập tài khoản'
                            : 'Tạo tài khoản mới'}
                    </h2>

                    <p className="mt-2 text-sm text-gray-500">
                        Trải nghiệm nông sản sạch từ nông trại
                    </p>

                </div>

                {/* THÔNG BÁO THÀNH CÔNG */}

                {success && (
                    <div className="mb-5 flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">

                        <CheckCircle2
                            className="mt-0.5 shrink-0 text-emerald-600"
                            size={22}
                        />

                        <div className="flex-1">

                            <p className="font-semibold text-emerald-800">
                                Thành công
                            </p>

                            <p className="mt-1 text-sm text-emerald-700">
                                {success}
                            </p>

                            {loggedInUser && isLogin && (
                                <button
                                    type="button"
                                    onClick={handleContinue}
                                    className="mt-3 w-full rounded-xl bg-emerald-600 px-4 py-2.5 font-semibold text-white transition hover:bg-emerald-700"
                                >
                                    Tiếp tục vào website
                                </button>
                            )}

                        </div>

                    </div>
                )}

                {/* THÔNG BÁO LỖI */}

                {error && (
                    <div className="mb-5 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">

                        <AlertCircle
                            className="mt-0.5 shrink-0 text-red-500"
                            size={22}
                        />

                        <div>
                            <p className="font-semibold text-red-700">
                                Không thể thực hiện
                            </p>

                            <p className="mt-1 text-sm text-red-600">
                                {error}
                            </p>
                        </div>

                    </div>
                )}

                {/* FORM */}

                {!loggedInUser && (
                    <form
                        onSubmit={handleSubmit}
                        className="space-y-4"
                    >

                        {/* HỌ VÀ TÊN */}

                        {!isLogin && (
                            <div>

                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Họ và tên
                                </label>

                                <div className="relative">

                                    <User
                                        className="absolute left-3 top-3 text-gray-400"
                                        size={20}
                                    />

                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="Nhập họ và tên"
                                        required
                                        autoComplete="name"
                                        className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                                    />

                                </div>

                            </div>
                        )}

                        {/* SỐ ĐIỆN THOẠI */}

                        {!isLogin && (
                            <div>

                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Số điện thoại
                                </label>

                                <div className="relative">

                                    <Phone
                                        className="absolute left-3 top-3 text-gray-400"
                                        size={20}
                                    />

                                    <input
                                        type="tel"
                                        name="phone"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        placeholder="Nhập số điện thoại"
                                        required
                                        autoComplete="tel"
                                        className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                                    />

                                </div>

                            </div>
                        )}

                        {/* EMAIL */}

                        <div>

                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Email
                            </label>

                            <div className="relative">

                                <Mail
                                    className="absolute left-3 top-3 text-gray-400"
                                    size={20}
                                />

                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="example@gmail.com"
                                    required
                                    autoComplete="email"
                                    className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                                />

                            </div>

                        </div>

                        {/* MẬT KHẨU */}

                        <div>

                            <label className="mb-1 block text-sm font-medium text-gray-700">
                                Mật khẩu
                            </label>

                            <div className="relative">

                                <Lock
                                    className="absolute left-3 top-3 text-gray-400"
                                    size={20}
                                />

                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="Nhập mật khẩu"
                                    required
                                    minLength={8}
                                    autoComplete={
                                        isLogin
                                            ? 'current-password'
                                            : 'new-password'
                                    }
                                    className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                                />

                            </div>

                            {!isLogin && (
                                <p className="mt-1 text-xs text-gray-500">
                                    Mật khẩu tối thiểu 8 ký tự.
                                </p>
                            )}

                        </div>

                        {/* XÁC NHẬN MẬT KHẨU */}

                        {!isLogin && (
                            <div>

                                <label className="mb-1 block text-sm font-medium text-gray-700">
                                    Xác nhận mật khẩu
                                </label>

                                <div className="relative">

                                    <Lock
                                        className="absolute left-3 top-3 text-gray-400"
                                        size={20}
                                    />

                                    <input
                                        type="password"
                                        name="password_confirmation"
                                        value={formData.password_confirmation}
                                        onChange={handleChange}
                                        placeholder="Nhập lại mật khẩu"
                                        required
                                        minLength={8}
                                        autoComplete="new-password"
                                        className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-3 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                                    />

                                </div>

                            </div>
                        )}

                        {/* NÚT SUBMIT */}

                        <button
                            type="submit"
                            disabled={loading}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >

                            {loading ? (
                                <>
                                    <Loader2
                                        size={20}
                                        className="animate-spin"
                                    />
                                    Đang xử lý...
                                </>
                            ) : (
                                isLogin
                                    ? 'Đăng nhập'
                                    : 'Đăng ký tài khoản'
                            )}

                        </button>

                    </form>
                )}

                {/* ĐỔI CHẾ ĐỘ */}

                {!loggedInUser && (
                    <div className="mt-6 text-center text-sm text-gray-600">

                        {isLogin
                            ? 'Bạn chưa có tài khoản?'
                            : 'Bạn đã có tài khoản?'}

                        <button
                            type="button"
                            disabled={loading}
                            onClick={handleSwitchMode}
                            className="ml-1 font-semibold text-emerald-600 transition hover:text-emerald-700"
                        >
                            {isLogin
                                ? 'Đăng ký ngay'
                                : 'Đăng nhập'}
                        </button>

                    </div>
                )}

            </div>

        </div>
    );
}
