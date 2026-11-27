
import React, { useEffect, useState } from 'react';
import axios from 'axios';

import {
    Sprout,
    ShoppingBag,
    ShoppingCart,
    BookOpen,
    QrCode,
    BarChart3,
    Package,
    ClipboardList,
    LogIn,
    LogOut,
    UserCircle,
    AlertCircle,
    RefreshCw,
    Award,
    User,
    Receipt,
    ChevronDown,
    CheckCircle2,
    X,
} from 'lucide-react';

import FarmBatchesPage from './pages/dashboard/FarmBatchesPage';
import FarmingLogsPage from './pages/dashboard/FarmingLogsPage';
import SalesOrdersPage from './pages/dashboard/SalesOrdersPage';
import SalesComplaintsPage from './pages/dashboard/SalesComplaintsPage';
import AdminStatsPage from './pages/dashboard/AdminStatsPage';
import AdminAccountsPage from './pages/dashboard/AdminAccountsPage';

import HomePage from './pages/HomePage';
import BrandStory from './pages/BrandStory';
import TraceabilityPage from './pages/TraceabilityPage';
import CartCheckoutPage from './pages/CartCheckoutPage';
import SubscriptionPage from './pages/SubscriptionPage';
import LoyaltyPage from './pages/LoyaltyPage';
import ProfilePage from './pages/ProfilePage';
import TransactionHistoryPage from './pages/TransactionHistoryPage';

import AuthModal from './components/AuthModal';
import Footer from './components/Footer';
import { getSavedAuthToken, syncAxiosAuthToken, showToast } from './services/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';

// ======================================================
// CẤU HÌNH VAI TRÒ
// ======================================================

const ROLE_LABELS = {
    customer: 'Khách hàng',
    farm_staff: 'Nông trại',
    sales: 'Sales',
    admin: 'Admin',
};

const ROLE_DEFAULT_PAGE = {
    customer: 'home',
    farm_staff: 'farm_batches',
    sales: 'sales_orders',
    admin: 'fefo_dashboard',
};

const VALID_PAGES_BY_ROLE = {
    customer: [
        'home',
        'story',
        'qr',
        'cart',
        'subscription',
        'complaint',
        'transactions',
        'loyalty',
        'profile',
    ],
    farm_staff: ['farm_batches', 'farm_logs', 'profile'],
    sales: ['sales_orders', 'sales_complaints', 'profile'],
    admin: ['fefo_dashboard', 'admin_accounts', 'profile'],
};

const LOGIN_REQUIRED_MESSAGES = {
    cart: 'Bạn cần đăng nhập trước khi xem giỏ hàng hoặc tiến hành thanh toán.',
    subscription: 'Vui lòng đăng nhập để đăng ký gói nông sản định kỳ.',
    complaint: 'Bạn cần đăng nhập để gửi khiếu nại và theo dõi yêu cầu.',
    loyalty: 'Đăng nhập để xem điểm thưởng Loyalty của bạn.',
    profile: 'Vui lòng đăng nhập để xem và chỉnh sửa thông tin cá nhân.',
    transactions: 'Vui lòng đăng nhập để xem lịch sử giao dịch của bạn.',
};

// ======================================================
// HÀM ĐỌC VAI TRÒ
// ======================================================

const getUserRole = (user) => {
    if (!user) return 'customer';

    const rawRole =
        user.role ??
        user.role_name ??
        user.user_type ??
        (Array.isArray(user.roles) ? user.roles[0] : user.roles);

    const role =
        typeof rawRole === 'string'
            ? rawRole.toLowerCase().trim()
            : rawRole?.name?.toLowerCase?.().trim();

    return ROLE_DEFAULT_PAGE[role] ? role : 'customer';
};

// ======================================================
// ĐỌC TÀI KHOẢN ĐÃ LƯU
// ======================================================

const getSavedUser = () => {
    try {
        const token =
            localStorage.getItem('access_token') ||
            localStorage.getItem('token') ||
            localStorage.getItem('user_token');

        const savedUser = localStorage.getItem('organic_current_user');

        if (!token || !savedUser) {
            return null;
        }

        return JSON.parse(savedUser);
    } catch (error) {
        console.error('Lỗi khôi phục tài khoản:', error);
        return null;
    }
};

// ======================================================
// MENU THEO VAI TRÒ
// ======================================================

const NAV_ITEMS = {
    customer: [
        { id: 'home', label: 'Trang chủ & Danh mục', icon: Sprout },
        { id: 'story', label: 'Câu chuyện thương hiệu', icon: BookOpen },
        { id: 'qr', label: 'Truy xuất nguồn gốc', icon: QrCode },
        { id: 'subscription', label: 'Gói nông sản định kỳ', icon: RefreshCw },
    ],

    farm_staff: [
        { id: 'farm_batches', label: 'Quản lý lô hàng', icon: Package },
        { id: 'farm_logs', label: 'Nhật ký canh tác', icon: ClipboardList },
    ],

    sales: [
        { id: 'sales_orders', label: 'Quản lý đơn hàng', icon: ShoppingBag },
        { id: 'sales_complaints', label: 'Khiếu nại khách hàng', icon: AlertCircle },
    ],

    admin: [
        { id: 'fefo_dashboard', label: 'Quản lý tồn kho FEFO', icon: BarChart3 },
        { id: 'admin_accounts', label: 'Tạo tài khoản nhân sự', icon: UserCircle },
    ],
};

// ======================================================
// APP
// ======================================================

export default function App() {

    // Khôi phục tài khoản khi tải lại trang
    const [currentUser, setCurrentUser] = useState(getSavedUser);

    // Khôi phục giỏ hàng
    const [cartItems, setCartItems] = useState(() => {
        try {
            return JSON.parse(
                localStorage.getItem('organic_cart_items') || '[]'
            );
        } catch {
            return [];
        }
    });

    // Giữ nguyên trang hiện tại khi load lại trình duyệt (F5)
    const [activePage, setActivePage] = useState(() => {
        const user = getSavedUser();
        const role = getUserRole(user);
        const savedPage = localStorage.getItem('organic_active_page');
        const allowed = VALID_PAGES_BY_ROLE[role] || [];

        if (
            savedPage &&
            allowed.includes(savedPage) &&
            (!LOGIN_REQUIRED_MESSAGES[savedPage] || user)
        ) {
            return savedPage;
        }

        return ROLE_DEFAULT_PAGE[role] || 'home';
    });

    const [qrBatchCode, setQrBatchCode] = useState(
        () => localStorage.getItem('organic_qr_batch_code') || ''
    );

    const [authOpen, setAuthOpen] = useState(false);

    const [loginNotice, setLoginNotice] = useState(null);
    const [loginNoticeTitle, setLoginNoticeTitle] = useState('Bạn cần đăng nhập');

    const [pendingPage, setPendingPage] = useState(null);

    const [visitedTabs, setVisitedTabs] = useState({});

    const [userMenuOpen, setUserMenuOpen] = useState(false);

    const [headerAvatarError, setHeaderAvatarError] = useState(false);
    const [toast, setToast] = useState(null);

    const activeRole = getUserRole(currentUser);

    useEffect(() => {
        setHeaderAvatarError(false);
    }, [currentUser?.avatar_url]);

    // ==================================================
    // ĐỒNG BỘ TOKEN & LÀM MỚI THÔNG TIN USER TỪ BACKEND
    // ==================================================

    useEffect(() => {
        const token = getSavedAuthToken();
        if (!token) return;

        syncAxiosAuthToken(token);

        if (token.startsWith('mock-jwt-token-')) return;

        axios
            .get(`${API_URL}/auth/me`, {
                headers: {
                    Accept: 'application/json',
                    Authorization: `Bearer ${token}`,
                },
            })
            .then((res) => {
                const freshUser = res.data?.data?.user;
                if (freshUser) {
                    setCurrentUser(freshUser);
                    localStorage.setItem(
                        'organic_current_user',
                        JSON.stringify(freshUser)
                    );
                }
            })
            .catch((err) => {
                if (err?.response?.status === 401 || err?.response?.status === 419) {
                    syncAxiosAuthToken(null);
                    localStorage.removeItem('access_token');
                    localStorage.removeItem('token');
                    localStorage.removeItem('user_token');
                    localStorage.removeItem('organic_current_user');
                    setCurrentUser(null);
                    setLoginNoticeTitle('Phiên đăng nhập đã hết hạn');
                    setLoginNotice('Phiên đăng nhập hoặc Token bảo mật đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.');
                }
            });
    }, []);

    useEffect(() => {
        let timerId;
        const handleToastEvent = (event) => {
            const detail = event.detail || {};
            if (!detail.message) return;
            setToast({
                id: Date.now(),
                message: detail.message,
                type: detail.type || 'success',
            });
            clearTimeout(timerId);
            timerId = setTimeout(() => setToast(null), 3200);
        };

        const handleSessionExpired = (event) => {
            setCurrentUser(null);
            setUserMenuOpen(false);
            setAuthOpen(false);
            setLoginNoticeTitle('Phiên đăng nhập đã hết hạn');
            setLoginNotice(
                event.detail?.message ||
                    'Phiên đăng nhập hoặc Token bảo mật đã hết hạn. Vui lòng đăng nhập lại!'
            );
        };

        window.addEventListener('organic:toast', handleToastEvent);
        window.addEventListener('organic:session-expired', handleSessionExpired);
        return () => {
            clearTimeout(timerId);
            window.removeEventListener('organic:toast', handleToastEvent);
            window.removeEventListener('organic:session-expired', handleSessionExpired);
        };
    }, []);

    // ==================================================
    // LƯU GIỎ HÀNG
    // ==================================================

    useEffect(() => {
        localStorage.setItem(
            'organic_cart_items',
            JSON.stringify(cartItems)
        );
    }, [cartItems]);

    // ==================================================
    // LƯU TÀI KHOẢN
    // ==================================================

    useEffect(() => {
        if (currentUser) {
            localStorage.setItem(
                'organic_current_user',
                JSON.stringify(currentUser)
            );
        }
    }, [currentUser]);

    useEffect(() => {
        if (activePage) {
            localStorage.setItem('organic_active_page', activePage);
        }
    }, [activePage]);

    useEffect(() => {
        if (qrBatchCode) {
            localStorage.setItem('organic_qr_batch_code', qrBatchCode);
        } else {
            localStorage.removeItem('organic_qr_batch_code');
        }
    }, [qrBatchCode]);

    // ==================================================
    // CACHE TAB NHÂN VIÊN
    // ==================================================

    useEffect(() => {
        if (activeRole !== 'customer') {
            const key = `${activeRole}:${activePage}`;

            setVisitedTabs((prev) =>
                prev[key] ? prev : { ...prev, [key]: true }
            );
        }
    }, [activeRole, activePage]);

    // ==================================================
    // YÊU CẦU ĐĂNG NHẬP
    // ==================================================

    const requireLogin = (message, targetPage = null, title = 'Bạn cần đăng nhập') => {
        setLoginNoticeTitle(title);
        setLoginNotice(message);
        setPendingPage(targetPage);
    };

    // ==================================================
    // ĐIỀU HƯỚNG
    // ==================================================

    const navigatePage = (page) => {
        if (LOGIN_REQUIRED_MESSAGES[page] && !currentUser) {
            requireLogin(LOGIN_REQUIRED_MESSAGES[page], page);
            return;
        }

        setActivePage(page);

        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    };

    // ==================================================
    // THÊM VÀO GIỎ
    // ==================================================

    const handleAddToCart = async (product) => {
        if (!currentUser) {
            requireLogin(
                'Bạn cần đăng nhập để mua hàng và thêm sản phẩm vào giỏ.',
                'cart'
            );
            return { ok: false };
        }

        if (!product || product.id == null) {
            showToast('Sản phẩm không hợp lệ!', 'error');
            return { ok: false };
        }

        const existingItem = cartItems.find(
            (item) => String(item.id) === String(product.id)
        );
        const nextQuantity = existingItem
            ? Number(existingItem.quantity || 0) + 1
            : 1;

        try {
            const res = await axios.get(
                `${API_URL}/products/${encodeURIComponent(product.id)}/stock`,
                { params: { requested_quantity: nextQuantity } }
            );
            const stockData = res.data?.data;
            const liveStock = Number(
                stockData?.available_stock ??
                product.stock ??
                product.current_quantity ??
                0
            );

            if (liveStock <= 0) {
                showToast('Sản phẩm hiện đã hết hàng trong kho!', 'error');
                return { ok: false, available_stock: 0 };
            }

            if (!stockData?.sufficient || nextQuantity > liveStock) {
                showToast(
                    `Không đủ tồn kho! "${product.name}" chỉ còn ${liveStock} ${product.unit || 'kg'}.`,
                    'error'
                );
                return { ok: false, available_stock: liveStock };
            }

            setCartItems((previousItems) => {
                const currentExisting = previousItems.find(
                    (item) => String(item.id) === String(product.id)
                );
                const qtyToSet = currentExisting
                    ? Number(currentExisting.quantity || 0) + 1
                    : 1;

                if (qtyToSet > liveStock) {
                    return previousItems;
                }

                if (currentExisting) {
                    return previousItems.map((item) =>
                        String(item.id) === String(product.id)
                            ? {
                                ...item,
                                quantity: qtyToSet,
                                stock: liveStock,
                                batch_code: stockData?.fefo_batch_code || item.batch_code,
                            }
                            : item
                    );
                }

                return [
                    ...previousItems,
                    {
                        ...product,
                        stock: liveStock,
                        batch_code: stockData?.fefo_batch_code || product.batch_code || product.batch,
                        quantity: 1,
                    },
                ];
            });

            showToast(
                `Đã thêm "${product.name}" vào giỏ hàng (SL: ${nextQuantity})!`,
                'success'
            );
            return { ok: true, available_stock: liveStock };
        } catch (err) {
            showToast(
                err.response?.data?.message || 'Không thể kiểm tra tồn kho sản phẩm lúc này!',
                'error'
            );
            return { ok: false };
        }
    };

    // ==================================================
    // ĐI ĐẾN GIỎ HÀNG
    // ==================================================

    const handleGoToCart = () => {
        if (!currentUser) {
            requireLogin(
                LOGIN_REQUIRED_MESSAGES.cart,
                'cart'
            );
            return;
        }

        navigatePage('cart');
    };

    // ==================================================
    // SỰ KIỆN ĐIỀU HƯỚNG
    // ==================================================

    useEffect(() => {
        const handleOrganicNavigate = (event) => {
            const targetPage = event.detail?.page;

            if (!targetPage) return;

            navigatePage(targetPage);
        };

        window.addEventListener(
            'organic:navigate',
            handleOrganicNavigate
        );

        return () => {
            window.removeEventListener(
                'organic:navigate',
                handleOrganicNavigate
            );
        };
    }, [currentUser]);

    // ==================================================
    // ĐỌC MÃ QR TỪ URL
    // ==================================================

    useEffect(() => {
        const path = window.location.pathname;
        const matchedPrefix = ['/traceability/', '/trace/'].find((p) =>
            path.startsWith(p)
        );

        if (matchedPrefix) {
            const codeFromUrl = path.slice(matchedPrefix.length).split('/')[0];

            if (codeFromUrl) {
                try {
                    const decodedCode = decodeURIComponent(codeFromUrl);

                    setQrBatchCode(decodedCode);
                    setActivePage('qr');
                } catch (error) {
                    console.error('Không thể đọc mã QR:', error);
                }
            }
        }
    }, []);

    // ==================================================
    // TỔNG GIỎ HÀNG
    // ==================================================

    const totalCartCount = cartItems.reduce(
        (total, item) => total + Number(item.quantity || 0),
        0
    );

    // ==================================================
    // ĐĂNG NHẬP THÀNH CÔNG
    // ==================================================

    const handleLoginSuccess = (user) => {
        if (!user) {
            alert('Không nhận được thông tin tài khoản!');
            return;
        }

        const token = getSavedAuthToken();
        if (token) {
            syncAxiosAuthToken(token);
        }

        // Lưu user
        localStorage.setItem(
            'organic_current_user',
            JSON.stringify(user)
        );

        setCurrentUser(user);

        const role = getUserRole(user);

        setActivePage(
            role === 'customer' && pendingPage
                ? pendingPage
                : ROLE_DEFAULT_PAGE[role]
        );

        setAuthOpen(false);
        setLoginNotice(null);
        setPendingPage(null);
        setUserMenuOpen(false);
        setVisitedTabs({});
    };

    const handleUserUpdated = (updatedUser) => {
        if (!updatedUser) return;
        setCurrentUser(updatedUser);
        localStorage.setItem(
            'organic_current_user',
            JSON.stringify(updatedUser)
        );
    };

    // ==================================================
    // ĐĂNG XUẤT
    // ==================================================

    const handleLogout = () => {
        const token = getSavedAuthToken();
        if (token && !token.startsWith('mock-jwt-token-')) {
            axios
                .post(
                    `${API_URL}/auth/logout`,
                    {},
                    {
                        headers: {
                            Accept: 'application/json',
                            Authorization: `Bearer ${token}`,
                        },
                    }
                )
                .catch(() => {});
        }

        syncAxiosAuthToken(null);

        localStorage.removeItem('access_token');
        localStorage.removeItem('token');
        localStorage.removeItem('user_token');

        localStorage.removeItem('organic_current_user');

        setCurrentUser(null);
        setCartItems([]);
        setLoginNotice(null);
        setPendingPage(null);
        setQrBatchCode('');
        setUserMenuOpen(false);
        setVisitedTabs({});

        localStorage.removeItem('organic_cart_items');
        localStorage.removeItem('organic_active_page');
        localStorage.removeItem('organic_qr_batch_code');

        setActivePage('home');

        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    };

    // ==================================================
    // ĐIỀU HƯỚNG QR
    // ==================================================

    const handleNavigateQr = (batchCode) => {
        if (!batchCode) {
            alert('Không tìm thấy mã lô sản phẩm!');
            return;
        }

        setQrBatchCode(String(batchCode));
        navigatePage('qr');
    };

    // ==================================================
    // TRANG CHỦ
    // ==================================================

    const handleGoHome = () => {
        setQrBatchCode('');
        navigatePage('home');
    };

    // ==================================================
    // FALLBACK YÊU CẦU ĐĂNG NHẬP
    // ==================================================

    const renderLoginRequiredFallback = (page) => (
        <div className="mx-auto my-12 max-w-md rounded-3xl border border-emerald-100 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                <AlertCircle size={28} />
            </div>

            <h3 className="text-xl font-bold text-slate-800">
                Bạn cần đăng nhập
            </h3>

            <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {LOGIN_REQUIRED_MESSAGES[page] ||
                    'Vui lòng đăng nhập để tiếp tục.'}
            </p>

            <button
                type="button"
                onClick={() => {
                    setPendingPage(page);
                    setAuthOpen(true);
                }}
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white transition hover:bg-emerald-700"
            >
                <LogIn size={18} />
                Đăng nhập ngay
            </button>
        </div>
    );

    // ==================================================
    // TRANG KHÁCH HÀNG
    // ==================================================

    const renderCustomerPage = () => {
        switch (activePage) {
            case 'home':
                return (
                    <HomePage
                        addToCart={handleAddToCart}
                        cartItems={cartItems}
                        onNavigateQr={handleNavigateQr}
                        onGoToCart={handleGoToCart}
                    />
                );

            case 'story':
                return <BrandStory />;

            case 'qr':
                return (
                    <TraceabilityPage
                        initialBatchCode={qrBatchCode}
                        batchCode={qrBatchCode}
                    />
                );

            case 'cart':
                if (!currentUser) {
                    return renderLoginRequiredFallback('cart');
                }

                return (
                    <CartCheckoutPage
                        cartItems={cartItems}
                        setCartItems={setCartItems}
                        currentUser={currentUser}
                    />
                );

            case 'subscription':
                if (!currentUser) {
                    return renderLoginRequiredFallback('subscription');
                }

                return <SubscriptionPage currentUser={currentUser} />;

            case 'complaint':
                if (!currentUser) {
                    return renderLoginRequiredFallback('complaint');
                }

                return <TransactionHistoryPage initialTab="complaint" />;

            case 'transactions':
                if (!currentUser) {
                    return renderLoginRequiredFallback('transactions');
                }

                return <TransactionHistoryPage initialTab="orders" />;

            case 'profile':
                if (!currentUser) {
                    return renderLoginRequiredFallback('profile');
                }

                return (
                    <ProfilePage
                        currentUser={currentUser}
                        onUserUpdated={handleUserUpdated}
                        canEditAvatar
                        onNavigate={navigatePage}
                    />
                );

            case 'loyalty':
                if (!currentUser) {
                    return renderLoginRequiredFallback('loyalty');
                }

                return (
                    <LoyaltyPage
                        onPointsUpdated={(pts) =>
                            handleUserUpdated({
                                ...currentUser,
                                loyalty_points: pts,
                            })
                        }
                    />
                );

            default:
                return (
                    <HomePage
                        addToCart={handleAddToCart}
                        cartItems={cartItems}
                        onNavigateQr={handleNavigateQr}
                        onGoToCart={handleGoToCart}
                    />
                );
        }
    };

    // ==================================================
    // TRANG NHÂN VIÊN / ADMIN
    // ==================================================

    const renderStaffPage = () => {
        if (activePage === 'profile') {
            return (
                <ProfilePage
                    currentUser={currentUser}
                    onUserUpdated={handleUserUpdated}
                    canEditAvatar={false}
                />
            );
        }

        const isLoaded = (role, page) =>
            (activeRole === role && activePage === page) ||
            Boolean(visitedTabs[`${role}:${page}`]);

        if (activeRole === 'farm_staff') {
            return (
                <>
                    {isLoaded('farm_staff', 'farm_batches') && (
                        <div
                            className={
                                activePage === 'farm_batches'
                                    ? 'block'
                                    : 'hidden'
                            }
                        >
                            <FarmBatchesPage />
                        </div>
                    )}

                    {isLoaded('farm_staff', 'farm_logs') && (
                        <div
                            className={
                                activePage === 'farm_logs'
                                    ? 'block'
                                    : 'hidden'
                            }
                        >
                            <FarmingLogsPage />
                        </div>
                    )}
                </>
            );
        }

        if (activeRole === 'sales') {
            return (
                <>
                    {isLoaded('sales', 'sales_orders') && (
                        <div
                            className={
                                activePage === 'sales_orders'
                                    ? 'block'
                                    : 'hidden'
                            }
                        >
                            <SalesOrdersPage />
                        </div>
                    )}

                    {isLoaded('sales', 'sales_complaints') && (
                        <div
                            className={
                                activePage === 'sales_complaints'
                                    ? 'block'
                                    : 'hidden'
                            }
                        >
                            <SalesComplaintsPage />
                        </div>
                    )}
                </>
            );
        }

        if (activeRole === 'admin') {
            return (
                <>
                    {isLoaded('admin', 'fefo_dashboard') && (
                        <div
                            className={
                                activePage === 'fefo_dashboard'
                                    ? 'block'
                                    : 'hidden'
                            }
                        >
                            <AdminStatsPage />
                        </div>
                    )}

                    {isLoaded('admin', 'admin_accounts') && (
                        <div
                            className={
                                activePage === 'admin_accounts'
                                    ? 'block'
                                    : 'hidden'
                            }
                        >
                            <AdminAccountsPage />
                        </div>
                    )}
                </>
            );
        }

        return null;
    };

    // ==================================================
    // MENU
    // ==================================================

    const navItems = NAV_ITEMS[activeRole] || NAV_ITEMS.customer;

    // ==================================================
    // GIAO DIỆN
    // ==================================================

    return (
        <div className="flex min-h-screen flex-col bg-slate-50 font-sans">

            {/* HEADER */}

            <header className="sticky top-0 z-30 bg-emerald-800 text-white shadow-md">
                <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center justify-between gap-2 px-4 py-2.5 lg:flex-nowrap lg:gap-3">

                    {/* LOGO */}

                    <button
                        type="button"
                        onClick={handleGoHome}
                        className="order-1 flex shrink-0 items-center gap-2.5 text-left"
                    >
                        <span className="rounded-xl bg-emerald-600 p-2">
                            <Sprout size={22} />
                        </span>

                        <span>
                            <span className="block whitespace-nowrap text-sm font-extrabold leading-tight xl:text-base">
                                Organic Farm Ecommerce
                            </span>

                            <span className="hidden whitespace-nowrap text-[11px] text-emerald-100 xl:block">
                                Không làm mà đòi có ăn
                            </span>
                        </span>
                    </button>

                    {/* MENU ĐIỀU HƯỚNG TRÊN HEADER (DÀNH CHO KHÁCH HÀNG) */}

                    {activeRole === 'customer' && (
                        <nav className="order-3 flex w-full flex-wrap items-center gap-1 border-t border-emerald-700/70 pt-2 lg:order-2 lg:w-auto lg:flex-nowrap lg:border-t-0 lg:pt-0">
                            {navItems.map(({ id, label, icon: Icon }) => (
                                <button
                                    type="button"
                                    key={id}
                                    onClick={() => navigatePage(id)}
                                    className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-1.5 text-xs font-medium transition xl:px-2.5 xl:py-2 xl:text-[13px] ${
                                        activePage === id
                                            ? 'bg-white/20 font-bold text-white shadow-sm'
                                            : 'text-emerald-100 hover:bg-emerald-700/70 hover:text-white'
                                    }`}
                                >
                                    <Icon size={15} className="shrink-0" />
                                    <span>{label}</span>
                                </button>
                            ))}
                        </nav>
                    )}

                    {/* GIỎ HÀNG & TÀI KHOẢN */}

                    <div className="order-2 flex shrink-0 items-center gap-2 whitespace-nowrap lg:order-3">
                        {activeRole === 'customer' && (
                            <button
                                type="button"
                                onClick={handleGoToCart}
                                title="Giỏ hàng & Đặt hàng"
                                aria-label={`Giỏ hàng, đang có ${totalCartCount} sản phẩm`}
                                className={`relative flex items-center justify-center rounded-xl p-2.5 transition ${
                                    activePage === 'cart'
                                        ? 'bg-white/25 text-white ring-1 ring-emerald-300'
                                        : 'bg-emerald-700/70 text-emerald-50 hover:bg-emerald-700'
                                }`}
                            >
                                <ShoppingCart size={20} />
                                {totalCartCount > 0 && (
                                    <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-bold text-white ring-2 ring-emerald-800">
                                        {totalCartCount}
                                    </span>
                                )}
                            </button>
                        )}

                        {currentUser ? (
                            <>
                                {/* Hover / Click Tên người dùng để mở Frame Menu */}
                                <div
                                    className="relative"
                                    onMouseEnter={() => setUserMenuOpen(true)}
                                    onMouseLeave={() => setUserMenuOpen(false)}
                                >
                                    <button
                                        type="button"
                                        onClick={() => setUserMenuOpen((prev) => !prev)}
                                        className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-sm font-semibold text-emerald-50 transition hover:bg-emerald-700/80"
                                    >
                                        {activeRole === 'customer' &&
                                        currentUser.avatar_url &&
                                        !headerAvatarError ? (
                                            <img
                                                src={currentUser.avatar_url}
                                                alt={currentUser.full_name || 'Avatar'}
                                                onError={() => setHeaderAvatarError(true)}
                                                className="h-8 w-8 rounded-full border-2 border-emerald-300 object-cover"
                                            />
                                        ) : (
                                            <UserCircle size={22} className="shrink-0 text-emerald-200" />
                                        )}

                                        <span className="max-w-[100px] truncate xl:max-w-[150px]">
                                            {currentUser.full_name ||
                                                currentUser.name ||
                                                currentUser.email ||
                                                'Tài khoản'}
                                        </span>

                                        <ChevronDown
                                            size={15}
                                            className={`shrink-0 text-emerald-200 transition-transform ${
                                                userMenuOpen ? 'rotate-180' : ''
                                            }`}
                                        />
                                    </button>

                                    {/* Frame hiển thị khi trỏ chuột lên Tên người dùng */}
                                    {userMenuOpen && (
                                        <div className="absolute right-0 top-full z-50 w-64 pt-2">
                                            <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-white p-2 text-slate-700 shadow-2xl">
                                                <div className="mb-1 border-b border-slate-100 px-3 py-2">
                                                    <p className="truncate text-sm font-bold text-slate-800">
                                                        {currentUser.full_name ||
                                                            currentUser.name ||
                                                            'Tài khoản'}
                                                    </p>
                                                    <p className="truncate text-xs text-slate-400">
                                                        {currentUser.email}
                                                    </p>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setUserMenuOpen(false);
                                                        navigatePage('profile');
                                                    }}
                                                    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                                                        activePage === 'profile'
                                                            ? 'bg-emerald-50 text-emerald-700'
                                                            : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'
                                                    }`}
                                                >
                                                    <User size={17} className="text-emerald-600" />
                                                    Thông tin cá nhân
                                                </button>

                                                {activeRole === 'customer' && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setUserMenuOpen(false);
                                                                navigatePage('transactions');
                                                            }}
                                                            className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                                                                activePage === 'transactions'
                                                                    ? 'bg-emerald-50 text-emerald-700'
                                                                    : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'
                                                            }`}
                                                        >
                                                            <Receipt size={17} className="text-emerald-600" />
                                                            Lịch sử giao dịch
                                                        </button>

                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setUserMenuOpen(false);
                                                                navigatePage('loyalty');
                                                            }}
                                                            className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                                                                activePage === 'loyalty'
                                                                    ? 'bg-amber-50 text-amber-700'
                                                                    : 'text-slate-700 hover:bg-amber-50 hover:text-amber-700'
                                                            }`}
                                                        >
                                                            <span className="flex items-center gap-2.5">
                                                                <Award size={17} className="text-amber-500" />
                                                                Điểm Loyalty
                                                            </span>
                                                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                                                                {Number(
                                                                    currentUser.loyalty_points ??
                                                                    currentUser.loyaltyPoints ??
                                                                    currentUser.points ??
                                                                    currentUser.loyalty?.points ??
                                                                    0
                                                                ).toLocaleString('vi-VN')}
                                                            </span>
                                                        </button>
                                                    </>
                                                )}

                                                <div className="mt-1 border-t border-slate-100 pt-1 sm:hidden">
                                                    <button
                                                        type="button"
                                                        onClick={handleLogout}
                                                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-rose-600 hover:bg-rose-50"
                                                    >
                                                        <LogOut size={17} />
                                                        Đăng xuất
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {activeRole !== 'customer' && (
                                    <span className="hidden rounded-lg bg-emerald-900 px-3 py-2 text-xs font-semibold text-emerald-200 sm:block">
                                        {ROLE_LABELS[activeRole]}
                                    </span>
                                )}

                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    className="hidden items-center gap-2 rounded-lg border border-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 sm:flex sm:text-sm"
                                >
                                    <LogOut size={16} />
                                    Đăng xuất
                                </button>
                            </>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setAuthOpen(true)}
                                className="flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600"
                            >
                                <LogIn size={17} />
                                Đăng nhập
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* KHÁCH HÀNG */}

            {activeRole === 'customer' ? (
                <main className="w-full flex-1">
                    {renderCustomerPage()}
                </main>
            ) : (
                /* NHÂN VIÊN VÀ ADMIN */

                <main className="mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 content-start gap-6 px-4 py-6 md:grid-cols-4">

                    {/* SIDEBAR */}

                    <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <h2 className="mb-4 px-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                            Menu {ROLE_LABELS[activeRole]}
                        </h2>

                        <nav className="space-y-1">
                            {navItems.map(({ id, label, icon: Icon }) => (
                                <button
                                    type="button"
                                    key={id}
                                    onClick={() => navigatePage(id)}
                                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium transition ${
                                        activePage === id
                                            ? 'bg-emerald-50 font-bold text-emerald-700'
                                            : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    <Icon size={18} />
                                    {label}
                                </button>
                            ))}
                        </nav>
                    </aside>

                    {/* NỘI DUNG */}

                    <section className="min-w-0 md:col-span-3">
                        {renderStaffPage()}
                    </section>
                </main>
            )}

            {/* MODAL YÊU CẦU ĐĂNG NHẬP */}

            {loginNotice && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 px-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-3xl border border-emerald-100 bg-white p-6 shadow-2xl">

                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                            <AlertCircle size={28} />
                        </div>

                        <h3 className="text-center text-xl font-bold text-slate-800">
                            {loginNoticeTitle}
                        </h3>

                        <p className="mt-3 text-center leading-relaxed text-slate-600">
                            {loginNotice}
                        </p>

                        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                            <button
                                type="button"
                                onClick={() => {
                                    setLoginNotice(null);
                                    setLoginNoticeTitle('Bạn cần đăng nhập');
                                    setPendingPage(null);
                                }}
                                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 font-semibold text-slate-600 transition hover:bg-slate-50"
                            >
                                Để sau
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    setLoginNotice(null);
                                    setLoginNoticeTitle('Bạn cần đăng nhập');
                                    setAuthOpen(true);
                                }}
                                className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700"
                            >
                                <span className="inline-flex items-center justify-center gap-2">
                                    <LogIn size={18} />
                                    Đăng nhập ngay
                                </span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TOAST NOTIFICATION GÓC MÀN HÌNH */}

            {toast && (
                <div className="fixed bottom-5 right-5 z-[80] max-w-sm">
                    <div
                        className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 shadow-xl ${
                            toast.type === 'error'
                                ? 'border-rose-200 bg-rose-50 text-rose-900'
                                : 'border-emerald-200 bg-emerald-900 text-white'
                        }`}
                    >
                        {toast.type === 'error' ? (
                            <AlertCircle size={20} className="mt-0.5 shrink-0 text-rose-600" />
                        ) : (
                            <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-300" />
                        )}

                        <p className="flex-1 text-xs font-semibold leading-relaxed sm:text-sm">
                            {toast.message}
                        </p>

                        <button
                            type="button"
                            onClick={() => setToast(null)}
                            className={`rounded-lg p-1 transition ${
                                toast.type === 'error'
                                    ? 'text-rose-500 hover:bg-rose-100'
                                    : 'text-emerald-200 hover:bg-emerald-800'
                            }`}
                            aria-label="Đóng thông báo"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>
            )}

            {/* FOOTER */}

            {activeRole === 'customer' && <Footer />}

            {/* AUTH MODAL */}

            <AuthModal
                isOpen={authOpen}
                onClose={() => {
                    setAuthOpen(false);
                    setLoginNotice(null);
                    setPendingPage(null);
                }}
                onLoginSuccess={handleLoginSuccess}
            />
        </div>
    );
}
