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
// DASHBOARD FEFO
// ======================================================

function FefoDashboard() {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <h2 className="mb-2 text-2xl font-bold text-slate-800">
                Bảng theo dõi hạn sử dụng kho FEFO
            </h2>

            <p className="mb-4 text-sm text-slate-500">
                Các lô có hạn sử dụng gần nhất được ưu tiên xuất trước.
            </p>

            <div className="rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
                Hệ thống FEFO đã sẵn sàng kết nối dữ liệu lô hàng.
            </div>

        </div>
    );
}

// ======================================================
// CÁC TRANG TẠM THỜI CHO NHÂN VIÊN / ADMIN
// ======================================================

function SimpleOperationsPage({ title, description }) {
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

            <h2 className="text-2xl font-bold text-slate-800">
                {title}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
                {description}
            </p>

        </div>
    );
}

// ======================================================
// APP CHÍNH
// ======================================================

export default function App() {

    const [activePage, setActivePage] = useState('home');

    const [qrBatchCode, setQrBatchCode] = useState('');

    const [authOpen, setAuthOpen] = useState(false);

    const [currentUser, setCurrentUser] = useState(null);

    const [cartItems, setCartItems] = useState([]);

    const activeRole = getUserRole(currentUser);

    // ==================================================
    // THÊM SẢN PHẨM VÀO GIỎ HÀNG
    // ==================================================

    const handleAddToCart = (product) => {

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

            if (
                product.stock != null &&
                nextQuantity > Number(product.stock)
            ) {
                alert('Sản phẩm không đủ số lượng tồn kho!');
                return previousItems;
            }

            if (
                !existingItem &&
                product.stock != null &&
                Number(product.stock) <= 0
            ) {
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
    // LẮNG NGHE SỰ KIỆN ĐIỀU HƯỚNG TỪ CÁC TRANG
    // ==================================================

    useEffect(() => {

        const handleOrganicNavigate = (event) => {

            const targetPage = event.detail?.page;

            if (!targetPage) return;

            setActivePage(targetPage);

            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });

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

    }, []);

    // ==================================================
    // TỔNG SỐ SẢN PHẨM TRONG GIỎ
    // ==================================================

    const totalCartCount = cartItems.reduce(
        (total, item) => total + Number(item.quantity || 0),
        0
    );

    // ==================================================
    // ĐỌC MÃ LÔ TỪ URL QR
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
    // ĐĂNG NHẬP THÀNH CÔNG
    // ==================================================

    const handleLoginSuccess = (user) => {

        setCurrentUser(user);

        const role = getUserRole(user);

        setActivePage(ROLE_DEFAULT_PAGE[role]);

        setAuthOpen(false);
    };

    // ==================================================
    // ĐĂNG XUẤT
    // ==================================================

    const handleLogout = () => {

        setCurrentUser(null);

        setActivePage('home');
    };

    // ==================================================
    // ĐIỀU HƯỚNG TRANG QR
    // ==================================================

    const handleNavigateQr = (batchCode) => {

        if (batchCode) {
            setQrBatchCode(String(batchCode));
        }

        setActivePage('qr');
    };

    // ==================================================
    // HIỂN THỊ TRANG KHÁCH HÀNG
    // ==================================================

    const renderCustomerPage = () => {

        switch (activePage) {

            case 'home':
                return (
                    <HomePage
                        onAddToCart={handleAddToCart}
                        addToCart={handleAddToCart}
                        cartItems={cartItems}
                        onNavigateQr={handleNavigateQr}
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
                return (
                    <CartCheckoutPage
                        cartItems={cartItems}
                        setCartItems={setCartItems}
                    />
                );

            case 'subscription':
                return <SubscriptionPage />;

            case 'complaint':
                return <ComplaintPage />;

            case 'loyalty':
                return <LoyaltyPage />;

            default:
                return (
                    <HomePage
                        onAddToCart={handleAddToCart}
                        addToCart={handleAddToCart}
                        cartItems={cartItems}
                        onNavigateQr={handleNavigateQr}
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

                    <button
                        type="button"
                        onClick={() => {
                            setActivePage(ROLE_DEFAULT_PAGE[activeRole]);
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
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
                                    {currentUser.name ||
                                        currentUser.email ||
                                        'Tài khoản'}
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
                                        onClick={() => {
                                            setActivePage(id);
                                            window.scrollTo({
                                                top: 0,
                                                behavior: 'smooth'
                                            });
                                        }}
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
                                    onClick={() => {
                                        setActivePage(id);
                                        window.scrollTo({
                                            top: 0,
                                            behavior: 'smooth'
                                        });
                                    }}
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

            {/* FOOTER DÙNG CHUNG TOÀN WEBSITE */}

            <Footer />

            {/* MODAL ĐĂNG NHẬP */}

            <AuthModal
                isOpen={authOpen}
                onClose={() => setAuthOpen(false)}
                onLoginSuccess={handleLoginSuccess}
            />

        </div>

    );
}
