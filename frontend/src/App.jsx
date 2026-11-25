import FarmBatchesPage from './pages/dashboard/FarmBatchesPage';
import FarmingLogsPage from './pages/dashboard/FarmingLogsPage';
import SalesOrdersPage from './pages/dashboard/SalesOrdersPage';
import SalesComplaintsPage from './pages/dashboard/SalesComplaintsPage';
import AdminStatsPage from './pages/dashboard/AdminStatsPage';
import React, { useEffect, useState } from 'react';

import {
    Sprout,
    ShoppingBag,
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
    AlertTriangle,
    Award,
} from 'lucide-react';

import HomePage from './pages/HomePage';
import BrandStory from './pages/BrandStory';
import TraceabilityPage from './pages/TraceabilityPage';
import CartCheckoutPage from './pages/CartCheckoutPage';
import SubscriptionPage from './pages/SubscriptionPage';
import ComplaintPage from './pages/ComplaintPage';
import LoyaltyPage from './pages/LoyaltyPage';

import AuthModal from './components/AuthModal';
import Footer from './components/Footer';

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

const LOGIN_REQUIRED_MESSAGES = {
    cart: 'Bạn cần đăng nhập trước khi xem giỏ hàng hoặc tiến hành thanh toán.',
    subscription: 'Vui lòng đăng nhập để đăng ký gói nông sản định kỳ.',
    complaint: 'Bạn cần đăng nhập để gửi khiếu nại và theo dõi yêu cầu.',
    loyalty: 'Đăng nhập để xem điểm thưởng Loyalty của bạn.',
};

// ======================================================
// LẤY VAI TRÒ TỪ TÀI KHOẢN ĐĂNG NHẬP
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
// MENU THEO TỪNG VAI TRÒ
// ======================================================

const NAV_ITEMS = {
    customer: [
        {
            id: 'home',
            label: 'Trang chủ & Danh mục',
            icon: Sprout,
        },
        {
            id: 'story',
            label: 'Câu chuyện thương hiệu',
            icon: BookOpen,
        },
        {
            id: 'qr',
            label: 'Truy xuất nguồn gốc',
            icon: QrCode,
        },
        {
            id: 'cart',
            label: 'Giỏ hàng & Đặt hàng',
            icon: ShoppingBag,
        },
        {
            id: 'subscription',
            label: 'Gói nông sản định kỳ',
            icon: RefreshCw,
        },
        {
            id: 'complaint',
            label: 'Gửi khiếu nại',
            icon: AlertTriangle,
        },
        {
            id: 'loyalty',
            label: 'Điểm Loyalty',
            icon: Award,
        },
    ],

    farm_staff: [
        {
            id: 'farm_batches',
            label: 'Quản lý lô hàng',
            icon: Package,
        },
        {
            id: 'farm_logs',
            label: 'Nhật ký canh tác',
            icon: ClipboardList,
        },
    ],

    sales: [
        {
            id: 'sales_orders',
            label: 'Quản lý đơn hàng',
            icon: ShoppingBag,
        },
        {
            id: 'sales_complaints',
            label: 'Khiếu nại khách hàng',
            icon: AlertCircle,
        },
    ],

    admin: [
        {
            id: 'fefo_dashboard',
            label: 'Quản lý tồn kho FEFO',
            icon: BarChart3,
        },
        {
            id: 'admin_products',
            label: 'Danh mục sản phẩm',
            icon: ShoppingBag,
        },
    ],
};

// ======================================================
// APP CHÍNH
// ======================================================

export default function App() {

    // MẶC ĐỊNH LUÔN BẮT ĐẦU TỪ TRANG CHỦ
    const [activePage, setActivePage] = useState('home');

    const [qrBatchCode, setQrBatchCode] = useState('');

    const [authOpen, setAuthOpen] = useState(false);

    const [currentUser, setCurrentUser] = useState(null);
    const [loginNotice, setLoginNotice] = useState(null);
    const [pendingPage, setPendingPage] = useState(null);

    const [cartItems, setCartItems] = useState([]);

    const activeRole = getUserRole(currentUser);

    // ==================================================
    // ĐIỀU HƯỚNG TRANG
    // ==================================================

    const requireLogin = (message, targetPage = null) => {
        setLoginNotice(message);
        setPendingPage(targetPage);
    };

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
    // THÊM SẢN PHẨM VÀO GIỎ HÀNG
    // ==================================================

    const handleAddToCart = (product) => {

        if (!currentUser) {
            requireLogin(
                'Bạn cần đăng nhập để mua hàng và thêm sản phẩm vào giỏ.',
                'cart'
            );
            return;
        }

        if (!product || product.id == null) {
            alert('Sản phẩm không hợp lệ!');
            return;
        }

        setCartItems((previousItems) => {

            const existingItem = previousItems.find(
                (item) => String(item.id) === String(product.id)
            );

            const nextQuantity = existingItem
                ? Number(existingItem.quantity || 0) + 1
                : 1;

            const stock = Number(
                product.stock ??
                product.current_quantity ??
                0
            );

            if (nextQuantity > stock) {
                alert('Sản phẩm không đủ số lượng tồn kho!');
                return previousItems;
            }

            if (stock <= 0) {
                alert('Sản phẩm hiện đã hết hàng!');
                return previousItems;
            }

            if (existingItem) {

                return previousItems.map((item) =>
                    String(item.id) === String(product.id)
                        ? { ...item, quantity: nextQuantity }
                        : item
                );

            }

            return [
                ...previousItems,
                {
                    ...product,
                    quantity: 1,
                },
            ];

        });

    };

    // ==================================================
    // ĐI ĐẾN GIỎ HÀNG
    // ==================================================

    const handleGoToCart = () => {

        if (!currentUser) {

            requireLogin(
                'Bạn cần đăng nhập trước khi xem giỏ hàng hoặc tiến hành thanh toán.',
                'cart'
            );

            return;
        }

        navigatePage('cart');

    };

    // ==================================================
    // LẮNG NGHE SỰ KIỆN ĐIỀU HƯỚNG TỪ CÁC TRANG
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
    // ĐỌC MÃ LÔ TỪ URL QR (/traceability/:batchCode)
    // ==================================================

    useEffect(() => {

        const path = window.location.pathname;
        const prefix = '/traceability/';

        if (path.startsWith(prefix)) {
            const codeFromUrl = path.slice(prefix.length).split('/')[0];

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
    // TỔNG SỐ SẢN PHẨM TRONG GIỎ
    // ==================================================

    const totalCartCount = cartItems.reduce(
        (total, item) => total + Number(item.quantity || 0),
        0
    );

    // ==================================================
    // ĐĂNG NHẬP THÀNH CÔNG
    // ==================================================

    const handleLoginSuccess = (user) => {

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

    };

    // ==================================================
    // ĐĂNG XUẤT
    // ==================================================

    const handleLogout = () => {

        localStorage.removeItem('access_token');
        localStorage.removeItem('token');
        localStorage.removeItem('user_token');

        setCurrentUser(null);
        setCartItems([]);
        setLoginNotice(null);
        setPendingPage(null);
        setQrBatchCode('');

        setActivePage('home');

        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });

    };

    // ==================================================
    // ĐIỀU HƯỚNG TRANG QR
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
    // ĐIỀU HƯỚNG TRANG CHỦ
    // ==================================================

    const handleGoHome = () => {

        setQrBatchCode('');

        navigatePage('home');

    };

    // ==================================================
    // HIỂN THỊ TRANG KHÁCH HÀNG
    // ==================================================

    const renderLoginRequiredFallback = (page) => (
        <div className="mx-auto my-12 max-w-md rounded-3xl border border-emerald-100 bg-white p-8 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                <AlertCircle size={28} />
            </div>
            <h3 className="text-xl font-bold text-slate-800">Bạn cần đăng nhập</h3>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {LOGIN_REQUIRED_MESSAGES[page] || 'Vui lòng đăng nhập để tiếp tục.'}
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
                    />
                );

            case 'subscription':

                if (!currentUser) {
                    return renderLoginRequiredFallback('subscription');
                }

                return <SubscriptionPage />;

            case 'complaint':

                if (!currentUser) {
                    return renderLoginRequiredFallback('complaint');
                }

                return <ComplaintPage />;

            case 'loyalty':

                if (!currentUser) {
                    return renderLoginRequiredFallback('loyalty');
                }

                return <LoyaltyPage />;

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
    // HIỂN THỊ TRANG NHÂN VIÊN / ADMIN
    // ==================================================

    const renderStaffPage = () => {

        if (activeRole === 'farm_staff') {
            switch (activePage) {
                case 'farm_logs':
                    return <FarmingLogsPage />;
                case 'farm_batches':
                default:
                    return <FarmBatchesPage />;
            }
        }

        if (activeRole === 'sales') {
            switch (activePage) {
                case 'sales_complaints':
                    return <SalesComplaintsPage />;
                case 'sales_orders':
                default:
                    return <SalesOrdersPage />;
            }
        }

        if (activeRole === 'admin') {
            switch (activePage) {
                case 'admin_products':
                    return <FarmBatchesPage />; // Admin có thể xem và quản lý luôn kho lô hàng
                case 'fefo_dashboard':
                default:
                    return <AdminStatsPage />;
            }
        }

        return null;

    };

    // ==================================================
    // MENU THEO VAI TRÒ
    // ==================================================

    const navItems = NAV_ITEMS[activeRole] || NAV_ITEMS.customer;

    // ==================================================
    // GIAO DIỆN CHÍNH
    // ==================================================

    return (

        <div className="flex min-h-screen flex-col bg-slate-50 font-sans">

            {/* HEADER */}

            <header className="sticky top-0 z-30 bg-emerald-800 text-white shadow-md">

                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">

                    {/* LOGO - QUAY VỀ TRANG CHỦ */}

                    <button
                        type="button"
                        onClick={handleGoHome}
                        className="flex items-center gap-3 text-left"
                    >

                        <span className="rounded-xl bg-emerald-600 p-2">
                            <Sprout size={25} />
                        </span>

                        <span>
                            <span className="block text-lg font-extrabold leading-tight">
                                Organic Farm Ecommerce
                            </span>

                            <span className="block text-xs text-emerald-100">
                                Từ nông trại đến bàn ăn
                            </span>
                        </span>

                    </button>

                    {/* TÀI KHOẢN */}

                    <div className="flex items-center gap-3">

                        {currentUser ? (
                            <>

                                <span className="hidden items-center gap-2 text-sm text-emerald-100 sm:flex">

                                    <UserCircle size={18} />

                                    {currentUser.full_name ||
                                        currentUser.name ||
                                        currentUser.email ||
                                        'Tài khoản'}

                                    <span className="ml-1 inline-flex items-center gap-1 rounded-full border border-amber-300/40 bg-amber-400/15 px-2 py-1 text-xs font-bold text-amber-200">

                                        <Award size={14} />

                                        {Number(
                                            currentUser.loyalty_points ??
                                            currentUser.loyaltyPoints ??
                                            currentUser.points ??
                                            currentUser.loyalty?.points ??
                                            0
                                        ).toLocaleString('vi-VN')} điểm

                                    </span>

                                </span>

                                <span className="hidden rounded-lg bg-emerald-900 px-3 py-2 text-xs font-semibold text-emerald-200 sm:block">
                                    {ROLE_LABELS[activeRole]}
                                </span>

                                <button
                                    type="button"
                                    onClick={handleLogout}
                                    className="flex items-center gap-2 rounded-lg border border-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 sm:text-sm"
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

            {/* ==================================================
                KHÁCH HÀNG
            ================================================== */}

            {activeRole === 'customer' ? (

                <>

                    {/* MENU KHÁCH HÀNG */}

                    <nav className="border-b border-emerald-100 bg-white shadow-sm">

                        <div className="mx-auto flex max-w-7xl flex-wrap items-center px-4 py-3">

                            <div className="flex flex-wrap gap-1">

                                {navItems.map(({ id, label, icon: Icon }) => (

                                    <button
                                        type="button"
                                        key={id}
                                        onClick={() => navigatePage(id)}
                                        className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition sm:text-sm ${
                                            activePage === id
                                                ? 'bg-emerald-50 font-bold text-emerald-700'
                                                : 'text-slate-600 hover:bg-slate-50'
                                        }`}
                                    >

                                        <Icon size={17} />

                                        {label}

                                        {id === 'cart' && totalCartCount > 0 && (

                                            <span className="ml-1 rounded-full bg-emerald-600 px-2 py-0.5 text-xs text-white">
                                                {totalCartCount}
                                            </span>

                                        )}

                                    </button>

                                ))}

                            </div>

                        </div>

                    </nav>

                    {/* NỘI DUNG KHÁCH HÀNG */}

                    <main className="w-full flex-1">

                        {renderCustomerPage()}

                    </main>

                </>

            ) : (

                /* ==================================================
                   NHÂN VIÊN VÀ ADMIN
                ================================================== */

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

                    {/* NỘI DUNG NHÂN VIÊN / ADMIN */}

                    <section className="min-w-0 md:col-span-3">

                        {renderStaffPage()}

                    </section>

                </main>

            )}

            {/* ==================================================
                THÔNG BÁO YÊU CẦU ĐĂNG NHẬP
            ================================================== */}

            {loginNotice && (

                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 px-4 backdrop-blur-sm">

                    <div className="w-full max-w-md rounded-3xl border border-emerald-100 bg-white p-6 shadow-2xl">

                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                            <AlertCircle size={28} />
                        </div>

                        <h3 className="text-center text-xl font-bold text-slate-800">
                            Bạn cần đăng nhập
                        </h3>

                        <p className="mt-3 text-center leading-relaxed text-slate-600">
                            {loginNotice}
                        </p>

                        <div className="mt-6 flex flex-col gap-3 sm:flex-row">

                            <button
                                type="button"
                                onClick={() => {
                                    setLoginNotice(null);
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

            {/* FOOTER */}

            <Footer />

            {/* MODAL ĐĂNG NHẬP */}

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
