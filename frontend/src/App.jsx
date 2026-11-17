
import React, { useState, useEffect } from 'react';

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
  AlertCircle
} from 'lucide-react';

import HomePage from './pages/HomePage';
import BrandStory from './pages/BrandStory';
import TraceabilityPage from './pages/TraceabilityPage';
import CartCheckoutPage from './pages/CartCheckoutPage';
import AuthModal from './components/AuthModal';

// ==============================
// CẤU HÌNH VAI TRÒ
// ==============================

const ROLE_LABELS = {
  customer: 'Khách Hàng',
  farm_staff: 'Nông Trại',
  sales: 'Sales',
  admin: 'Admin'
};

const ROLE_DEFAULT_PAGE = {
  customer: 'home',
  farm_staff: 'farm_batches',
  sales: 'sales_orders',
  admin: 'fefo_dashboard'
};

// ==============================
// MENU THEO TỪNG VAI TRÒ
// ==============================

const NAV_ITEMS = {
  customer: [
    { id: 'home', label: 'Trang chủ', icon: Sprout },
    { id: 'story', label: 'Câu chuyện thương hiệu', icon: BookOpen },
    { id: 'cart', label: 'Giỏ hàng & Đặt hàng', icon: ShoppingBag },
    { id: 'qr', label: 'Truy xuất nguồn gốc', icon: QrCode }
  ],

  farm_staff: [
    { id: 'farm_batches', label: 'Quản lý lô hàng', icon: Package },
    { id: 'farm_logs', label: 'Nhật ký canh tác', icon: ClipboardList }
  ],

  sales: [
    { id: 'sales_orders', label: 'Quản lý đơn hàng', icon: ShoppingBag },
    { id: 'sales_complaints', label: 'Khiếu nại khách hàng', icon: AlertCircle }
  ],

  admin: [
    { id: 'fefo_dashboard', label: 'Quản lý tồn kho FEFO', icon: BarChart3 },
    { id: 'admin_products', label: 'Danh mục sản phẩm', icon: ShoppingBag }
  ]
};

// ==============================
// DASHBOARD FEFO
// ==============================

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
        Hệ thống FEFO đã sẵn sàng kết nối dữ liệu Lô hàng.
      </div>

    </div>
  );
}

// ==============================
// CÁC TRANG CHỨC NĂNG TẠM THỜI
// ==============================

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

// ==============================
// COMPONENT APP CHÍNH
// ==============================

export default function App() {

  const [activeRole, setActiveRole] = useState('customer');

  const [activePage, setActivePage] = useState('home');

  const [qrBatchCode, setQrBatchCode] = useState(
    'BATCH-CC-20261110'
  );

  const [authOpen, setAuthOpen] = useState(false);

  const [currentUser, setCurrentUser] = useState(null);

  // ==============================
  // GIỎ HÀNG
  // Không có sản phẩm mẫu
  // ==============================

  const [cartItems, setCartItems] = useState([]);

  // ==============================
  // THÊM SẢN PHẨM VÀO GIỎ HÀNG
  // ==============================

  const addToCart = (product) => {

    if (!product || !product.id) {
      alert('Sản phẩm không hợp lệ!');
      return;
    }

    setCartItems(prev => {

      const existing = prev.find(
        item => item.id === product.id
      );

      if (existing) {

        const newQuantity = Number(existing.quantity) + 1;

        if (
          product.stock != null &&
          newQuantity > Number(product.stock)
        ) {
          alert('Sản phẩm không đủ số lượng tồn kho!');
          return prev;
        }

        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: newQuantity }
            : item
        );
      }

      if (
        product.stock != null &&
        Number(product.stock) <= 0
      ) {
        alert('Sản phẩm hiện đã hết hàng!');
        return prev;
      }

      return [
        ...prev,
        {
          ...product,
          quantity: 1
        }
      ];
    });

    alert(`Đã thêm ${product.name} vào giỏ hàng!`);
  };

  // ==============================
  // ĐỌC MÃ LÔ TỪ URL QR
  // Ví dụ:
  // /traceability/BATCH-CC-20261110
  // ==============================

  useEffect(() => {

    const path = window.location.pathname;

    const prefix = '/traceability/';

    if (path.startsWith(prefix)) {

      const codeFromUrl = path.slice(prefix.length);

      if (codeFromUrl) {

        try {

          const decodedCode = decodeURIComponent(
            codeFromUrl.split('/')[0]
          );

          setQrBatchCode(decodedCode);

          setActiveRole('customer');

          setActivePage('qr');

        } catch (error) {

          console.error('Không thể đọc mã QR:', error);

        }
      }
    }

  }, []);

  // ==============================
  // CHUYỂN ĐỔI VAI TRÒ
  // ==============================

  const changeRole = (role) => {

    if (!ROLE_DEFAULT_PAGE[role]) return;

    setActiveRole(role);

    setActivePage(ROLE_DEFAULT_PAGE[role]);

  };

  // ==============================
  // ĐĂNG XUẤT
  // ==============================

  const handleLogout = () => {

    setCurrentUser(null);

  };

  // ==============================
  // ĐĂNG NHẬP THÀNH CÔNG
  // ==============================

  const handleLoginSuccess = (user) => {

    setCurrentUser(user);

    setAuthOpen(false);

  };

  // ==============================
  // HIỂN THỊ TRANG THEO VAI TRÒ
  // ==============================

  const renderPage = () => {

    // KHÁCH HÀNG
    if (activeRole === 'customer') {

      switch (activePage) {

        // TRANG CHỦ
        case 'home':
          return (
            <HomePage
              addToCart={addToCart}
              cartItems={cartItems}
            />
          );

        // CÂU CHUYỆN THƯƠNG HIỆU
        case 'story':
          return <BrandStory />;

        // GIỎ HÀNG VÀ THANH TOÁN
        case 'cart':
          return (
            <CartCheckoutPage
              cartItems={cartItems}
              setCartItems={setCartItems}
            />
          );

        // TRUY XUẤT NGUỒN GỐC
        case 'qr':
          return (
            <TraceabilityPage
              initialBatchCode={qrBatchCode}
            />
          );

        default:
          return (
            <HomePage
              addToCart={addToCart}
              cartItems={cartItems}
            />
          );
      }
    }

    // ==============================
    // NHÂN VIÊN NÔNG TRẠI
    // ==============================

    if (activeRole === 'farm_staff') {

      switch (activePage) {

        case 'farm_logs':
          return (
            <SimpleOperationsPage
              title="Nhật ký canh tác"
              description="Giao diện dành cho nhân viên nông trại cập nhật các mốc tưới nước, bón phân và chăm sóc cây trồng."
            />
          );

        case 'farm_batches':
        default:
          return (
            <SimpleOperationsPage
              title="Quản lý lô hàng"
              description="Giao diện khởi tạo lô hàng và sinh mã QR tem in bao bì."
            />
          );
      }
    }

    // ==============================
    // NHÂN VIÊN SALES
    // ==============================

    if (activeRole === 'sales') {

      switch (activePage) {

        case 'sales_complaints':
          return (
            <SimpleOperationsPage
              title="Khiếu nại khách hàng"
              description="Quản lý và xử lý các khiếu nại của khách hàng."
            />
          );

        case 'sales_orders':
        default:
          return (
            <SimpleOperationsPage
              title="Quản lý đơn hàng"
              description="Giao diện duyệt đơn hàng và theo dõi trạng thái giao hàng."
            />
          );
      }
    }

    // ==============================
    // ADMIN
    // ==============================

    if (activeRole === 'admin') {

      switch (activePage) {

        case 'admin_products':
          return (
            <SimpleOperationsPage
              title="Danh mục sản phẩm"
              description="Quản lý danh mục sản phẩm nông sản hữu cơ."
            />
          );

        case 'fefo_dashboard':
        default:
          return <FefoDashboard />;
      }
    }

    return (
      <HomePage
        addToCart={addToCart}
      />
    );
  };

  // ==============================
  // MENU HIỆN TẠI
  // ==============================

  const navItems =
    NAV_ITEMS[activeRole] || NAV_ITEMS.customer;

  // ==============================
  // GIAO DIỆN CHÍNH
  // ==============================

  return (

    <div className="min-h-screen bg-slate-50">

      {/* HEADER */}

      <header className="sticky top-0 z-30 bg-emerald-800 text-white shadow-md">

        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">

          {/* LOGO */}

          <button
            onClick={() => changeRole('customer')}
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

          {/* CHỌN VAI TRÒ DEMO */}

          <div className="flex flex-wrap items-center gap-1 rounded-xl border border-emerald-700 bg-emerald-950/50 p-1">

            <span className="px-2 text-xs text-emerald-200">
              Vai trò demo:
            </span>

            {Object.entries(ROLE_LABELS).map(
              ([role, label]) => (

                <button
                  key={role}
                  onClick={() => changeRole(role)}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    activeRole === role
                      ? 'bg-emerald-500 text-white'
                      : 'text-emerald-100 hover:bg-emerald-800'
                  }`}
                >
                  {label}
                </button>

              )
            )}

          </div>

        </div>

      </header>

      {/* NAVIGATION KHÁCH HÀNG */}

      {activeRole === 'customer' ? (

        <>

          <nav className="border-b border-emerald-100 bg-white">

            <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">

              {/* MENU */}

              <div className="flex flex-wrap gap-1">

                {navItems.map(
                  ({ id, label, icon: Icon }) => (

                    <button
                      key={id}
                      onClick={() => setActivePage(id)}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                        activePage === id
                          ? 'bg-emerald-50 font-bold text-emerald-700'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >

                      <Icon size={17} />

                      {label}

                      {id === 'cart' && cartItems.length > 0 && (
                        <span className="ml-1 rounded-full bg-emerald-600 px-2 py-0.5 text-xs text-white">
                          {cartItems.reduce(
                            (sum, item) => sum + item.quantity,
                            0
                          )}
                        </span>
                      )}

                    </button>

                  )
                )}

              </div>

              {/* TÀI KHOẢN */}

              <div className="flex items-center gap-3">

                {currentUser ? (

                  <>

                    <span className="hidden text-sm text-slate-600 sm:inline">

                      <UserCircle
                        className="mr-1 inline"
                        size={17}
                      />

                      {currentUser.name || currentUser.email || 'Tài khoản'}

                    </span>

                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                    >

                      <LogOut size={16} />

                      Đăng xuất

                    </button>

                  </>

                ) : (

                  <button
                    onClick={() => setAuthOpen(true)}
                    className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                  >

                    <LogIn size={16} />

                    Đăng nhập

                  </button>

                )}

              </div>

            </div>

          </nav>

          {/* NỘI DUNG KHÁCH HÀNG */}

          <main className="min-h-[70vh] py-6">
            {renderPage()}
          </main>

        </>

      ) : (

        /* GIAO DIỆN NHÂN VIÊN VÀ ADMIN */

        <main className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 md:grid-cols-4">

          {/* SIDEBAR */}

          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">

            <h2 className="mb-4 px-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              Menu {ROLE_LABELS[activeRole]}
            </h2>

            <nav className="space-y-1">

              {navItems.map(
                ({ id, label, icon: Icon }) => (

                  <button
                    key={id}
                    onClick={() => setActivePage(id)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium ${
                      activePage === id
                        ? 'bg-emerald-50 font-bold text-emerald-700'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >

                    <Icon size={18} />

                    {label}

                  </button>

                )
              )}

            </nav>

          </aside>

          {/* NỘI DUNG */}

          <section className="min-w-0 md:col-span-3">
            {renderPage()}
          </section>

        </main>

      )}

      {/* FOOTER */}

      <footer className="border-t border-slate-200 bg-white px-4 py-6 text-center text-xs text-slate-500">

        © {new Date().getFullYear()} Organic Farm Ecommerce

        · Nông sản sạch minh bạch nguồn gốc

      </footer>

      {/* MODAL ĐĂNG NHẬP */}

      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />

    </div>
  );
}
