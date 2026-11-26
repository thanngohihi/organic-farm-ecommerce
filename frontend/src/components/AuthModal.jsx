
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
    Eye,
    EyeOff,
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

export default function AuthModal({
    isOpen,
    onClose,
    onLoginSuccess,
}) {
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);

    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [loggedInUser, setLoggedInUser] = useState(null);

    const [formData, setFormData] = useState(INITIAL_FORM_DATA);

    // Hiện / ẩn mật khẩu
    const [showPassword, setShowPassword] = useState(false);

    // Hiện / ẩn mật khẩu xác nhận
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // ==========================================
    // ĐẶT LẠI TRẠNG THÁI KHI MỞ MODAL
    // ==========================================

    useEffect(() => {
        if (isOpen) {
            setIsLogin(true);
            setLoading(false);
            setError('');
            setSuccess('');
            setLoggedInUser(null);
            setFormData(INITIAL_FORM_DATA);
            setShowPassword(false);
            setShowConfirmPassword(false);
        }
    }, [isOpen]);

    // ==========================================
    // TỰ ĐỘNG CHUYỂN SAU ĐĂNG NHẬP THÀNH CÔNG
    // ==========================================

    useEffect(() => {
        if (!loggedInUser || !isOpen) return;

        const timer = setTimeout(() => {
            onLoginSuccess(loggedInUser);
            onClose();
        }, 1000);

        return () => clearTimeout(timer);

    }, [loggedInUser, isOpen, onLoginSuccess, onClose]);

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
    // XỬ LÝ LỖI API
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
            return response.data?.message ||
                'Email hoặc mật khẩu không chính xác.';
        }

        if (response.status === 409) {
            return response.data?.message || 'Email đã tồn tại.';
        }

        if (response.status === 403) {
            return response.data?.message ||
                'Bạn không có quyền thực hiện thao tác.';
        }

        if (response.status >= 500) {
            return 'Máy chủ gặp lỗi. Vui lòng thử lại sau.';
        }

        return response.data?.message ||
            err.message ||
            'Đã xảy ra lỗi.';
    };

    // ==========================================
    // LẤY USER VÀ TOKEN TỪ RESPONSE
    // ==========================================

    const extractLoginData = (responseData) => {
        const data = responseData?.data ?? responseData;

        const user =
            data?.user ??
            responseData?.user ??
            null;

        const token =
            data?.access_token ??
            data?.token ??
            responseData?.access_token ??
            responseData?.token ??
            null;

        return { user, token };
    };

    // ==========================================
    // LƯU PHIÊN ĐĂNG NHẬP
    // ==========================================

    const saveLoginSession = (user, token) => {
        if (token) {
            localStorage.setItem('access_token', token);

            // Đồng bộ các tên token cũ
            localStorage.removeItem('token');
            localStorage.removeItem('user_token');
        }

        localStorage.setItem(
            'organic_current_user',
            JSON.stringify(user)
        );

        setLoggedInUser(user);
        setSuccess('Đăng nhập thành công!');
        setError('');
    };

    // ==========================================
    // ĐĂNG NHẬP API
    // ==========================================

    const handleLogin = async (email, password) => {
        try {
            const response = await axios.post(
                `${API_URL}/login`,
                {
                    email,
                    password,
                }
            );

            const { user, token } = extractLoginData(response.data);

            if (!user) {
                throw new Error(
                    'API không trả về thông tin tài khoản.'
                );
            }

            if (!token) {
                throw new Error(
                    'API không trả về token đăng nhập. Vui lòng kiểm tra AuthController Laravel.'
                );
            }

            saveLoginSession(user, token);

        } catch (err) {

            // Chỉ sử dụng Demo khi không kết nối được backend
            if (!err.response) {
                try {
                    const mockRes = await mockLogin(email, password);

                    if (!mockRes?.user || !mockRes?.token) {
                        throw new Error(
                            'Tài khoản demo không trả về đầy đủ thông tin.'
                        );
                    }

                    saveLoginSession(
                        mockRes.user,
                        mockRes.token
                    );

                    setSuccess(
                        'Đăng nhập thành công (Chế độ Demo offline)!'
                    );

                    return;

                } catch (mockError) {
                    console.error('Lỗi đăng nhập Demo:', mockError);
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

        const response = await axios.post(
            `${API_URL}/register`,
            {
                full_name,
                phone,
                email,
                password,
                password_confirmation,
            }
        );

        setSuccess(
            response.data?.message ||
            'Đăng ký thành công! Vui lòng đăng nhập.'
        );

        setIsLogin(true);

        setFormData({
            ...INITIAL_FORM_DATA,
            email,
        });

        setShowPassword(false);
        setShowConfirmPassword(false);
    };

    // ==========================================
    // SUBMIT FORM
    // ==========================================

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (loading) return;

        const form = e.currentTarget;

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

        const password_confirmation =
            confirmInput?.value || '';

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
            console.error('Lỗi xác thực:', err);

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
    // CHUYỂN ĐỔI ĐĂNG NHẬP / ĐĂNG KÝ
    // ==========================================

    const handleSwitchMode = () => {
        setIsLogin(!isLogin);

        setError('');
        setSuccess('');
        setLoggedInUser(null);

        setShowPassword(false);
        setShowConfirmPassword(false);

        setFormData({
            ...INITIAL_FORM_DATA,
            email: formData.email,
        });
    };

    // ==========================================
    // GIAO DIỆN
    // ==========================================

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">

            <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8">

                {/* NÚT ĐÓNG */}

                <button
                    type="button"
                    onClick={onClose}
                    disabled={loading}
                    className="absolute right-4 top-4 rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                    aria-label="Đóng"
                >
                    <X size={22} />
                </button>

                {/* HEADER */}

                <div className="mb-6 text-center">

                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100">

                        <Leaf
                            className="text-emerald-600"
                            size={30}
                        />

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

                    <div className="mb-5 flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 animate-in fade-in duration-300">

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

                                <p className="mt-2 text-sm font-medium text-emerald-600">
                                    Đang chuyển vào website...
                                </p>

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
                                    type={
                                        showPassword
                                            ? 'text'
                                            : 'password'
                                    }
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
                                    className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-12 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                                />

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowPassword((prev) => !prev)
                                    }
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-emerald-600"
                                    aria-label={
                                        showPassword
                                            ? 'Ẩn mật khẩu'
                                            : 'Hiện mật khẩu'
                                    }
                                >

                                    {showPassword ? (
                                        <EyeOff size={20} />
                                    ) : (
                                        <Eye size={20} />
                                    )}

                                </button>

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
                                        type={
                                            showConfirmPassword
                                                ? 'text'
                                                : 'password'
                                        }
                                        name="password_confirmation"
                                        value={formData.password_confirmation}
                                        onChange={handleChange}
                                        placeholder="Nhập lại mật khẩu"
                                        required
                                        minLength={8}
                                        autoComplete="new-password"
                                        className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-12 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                                    />

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowConfirmPassword(
                                                (prev) => !prev
                                            )
                                        }
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-emerald-600"
                                        aria-label={
                                            showConfirmPassword
                                                ? 'Ẩn mật khẩu xác nhận'
                                                : 'Hiện mật khẩu xác nhận'
                                        }
                                    >

                                        {showConfirmPassword ? (
                                            <EyeOff size={20} />
                                        ) : (
                                            <Eye size={20} />
                                        )}

                                    </button>

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
