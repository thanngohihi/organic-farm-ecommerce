
import React, { useState } from 'react';
import { X, Lock, Mail, User, Leaf } from 'lucide-react';
import { mockLogin, mockRegister } from '../services/mockAuth';

export default function AuthModal({ isOpen, onClose, onLoginSuccess }) {
    const [isLogin, setIsLogin] = useState(true);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: ''
    });

    if (!isOpen) return null;

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            if (isLogin) {
                const res = await mockLogin(
                    formData.email,
                    formData.password
                );

                onLoginSuccess(res.user);
                onClose();
            } else {
                await mockRegister(
                    formData.name,
                    formData.email,
                    formData.password
                );

                alert('Đăng ký thành công! Vui lòng đăng nhập.');

                setIsLogin(true);
                setFormData({
                    name: '',
                    email: '',
                    password: ''
                });
            }
        } catch (err) {
            setError(err.message || 'Đã có lỗi xảy ra!');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="relative w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">

                {/* Header */}
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 text-gray-400 hover:text-gray-700"
                >
                    <X size={24} />
                </button>

                <div className="mb-6 text-center">
                    <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                        <Leaf className="text-green-600" size={30} />
                    </div>

                    <h2 className="text-2xl font-bold text-gray-800">
                        {isLogin
                            ? 'Đăng Nhập Khách Hàng'
                            : 'Tạo Tài Khoản Mới'}
                    </h2>

                    <p className="mt-2 text-sm text-gray-500">
                        Trải nghiệm nông sản sạch từ Nông trại
                    </p>
                </div>

                {/* Body Form */}
                <form onSubmit={handleSubmit} className="space-y-4">

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
                                    className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-3 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                                />
                            </div>
                        </div>
                    )}

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
                                className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-3 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                            />
                        </div>
                    </div>

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
                                minLength={6}
                                className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-3 outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                            />
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                            {error}
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full rounded-lg bg-green-600 py-3 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        {loading
                            ? 'Đang xử lý...'
                            : isLogin
                                ? 'Đăng Nhập'
                                : 'Đăng Ký'}
                    </button>
                </form>

                {/* Switch Login / Register */}
                <div className="mt-6 text-center text-sm text-gray-600">
                    {isLogin
                        ? 'Chưa có tài khoản?'
                        : 'Đã có tài khoản?'}

                    <button
                        type="button"
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setError('');
                            setFormData({
                                name: '',
                                email: '',
                                password: ''
                            });
                        }}
                        className="ml-1 font-semibold text-green-600 hover:text-green-700"
                    >
                        {isLogin ? 'Đăng ký ngay' : 'Đăng nhập'}
                    </button>
                </div>

            </div>
        </div>
    );
}
