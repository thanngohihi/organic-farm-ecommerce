import React, { useState } from 'react';
import {
  Sprout, ShoppingBag, BookOpen, RefreshCw, QrCode, BarChart3,
  Package, ClipboardList, Truck, LogIn, LogOut, UserCircle,
  CheckCircle2, AlertCircle, PlusCircle
} from 'lucide-react';

import HomePage from './pages/HomePage';
import BrandStory from './pages/BrandStory';
import AuthModal from './components/AuthModal';

const PRODUCTS = [
  { id: 1, name: 'Cà Chua Hữu Cơ VietGAP', price: '35.000đ/kg', cert: 'VietGAP', batch: 'BATCH-CC-20261110', exp: '2026-11-16', stock: 45, unit: 'kg' },
  { id: 2, name: 'Cải Bó Xôi Organic USDA', price: '48.000đ/kg', cert: 'USDA Organic', batch: 'BATCH-BX-20261112', exp: '2026-11-15', stock: 20, unit: 'kg' },
  { id: 3, name: 'Dâu Tây Đà Lạt VietGAP', price: '120.000đ/hộp 500g', cert: 'VietGAP', batch: 'BATCH-DT-20261111', exp: '2026-11-17', stock: 15, unit: 'hộp' },
  { id: 4, name: 'Củ Cải Đỏ Hữu Cơ', price: '42.000đ/kg', cert: 'GlobalGAP', batch: 'BATCH-CC-20261113', exp: '2026-11-25', stock: 110, unit: 'kg' }
];

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

const NAV_ITEMS = {
  customer: [
    { id: 'home', label: 'Trang chủ', icon: Sprout },
    { id: 'story', label: 'Câu chuyện thương hiệu', icon: BookOpen },
    { id: 'subscription', label: 'Gói nông sản định kỳ', icon: RefreshCw },
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
    { id: 'admin_products', label: 'Danh mục sản phẩm', icon: ShoppingBag },
    { id: 'admin_reports', label: 'Báo cáo thống kê', icon: ClipboardList }
  ]
};

function PageTitle({ title, subtitle }) {
  return (
    <div className="mb-6">
      <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
    </div>
  );
}

function SubscriptionPage() {
  return (
    <div className="space-y-6">
      <PageTitle title="Gói nông sản định kỳ" subtitle="Đăng ký để nhận rau củ tươi theo lịch giao hàng." />
      <div className="grid gap-5 md:grid-cols-2">
        {[
          { name: 'Gói Rau Xanh Gia Đình', desc: '5kg rau xanh và 3kg củ quả theo mùa mỗi tuần.', price: '850.000đ/tháng' },
          { name: 'Gói Nông Sản Cơ Bản', desc: 'Lựa chọn rau củ thiết yếu cho gia đình nhỏ.', price: '450.000đ/tháng' }
        ].map((item) => (
          <article key={item.name} className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
            <div className="mb-3 inline-flex rounded-xl bg-emerald-50 p-3 text-emerald-700"><RefreshCw /></div>
            <h3 className="text-lg font-bold text-slate-800">{item.name}</h3>
            <p className="my-3 text-sm leading-6 text-slate-600">{item.desc}</p>
            <p className="mb-4 text-xl font-extrabold text-emerald-700">{item.price}</p>
            <button onClick={() => window.alert('Đây là giao diện minh họa Tuần 1. Chức năng đăng ký sẽ được tích hợp API ở tuần tiếp theo.')} className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">Chọn gói</button>
          </article>
        ))}
      </div>
      <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Lưu ý: Đây là dữ liệu minh họa phía Frontend, chưa tạo đơn hàng thật.</p>
    </div>
  );
}

function TraceabilityPage() {
  const [batch, setBatch] = useState('BATCH-CC-20261110');
  const [searched, setSearched] = useState(false);
  const product = PRODUCTS.find((item) => item.batch.toLowerCase() === batch.trim().toLowerCase());

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <PageTitle title="Truy xuất nguồn gốc" subtitle="Nhập mã lô sản phẩm để xem thông tin minh họa." />
      <form className="flex flex-col gap-3 sm:flex-row" onSubmit={(e) => { e.preventDefault(); setSearched(true); }}>
        <input value={batch} onChange={(e) => { setBatch(e.target.value); setSearched(false); }} className="min-w-0 flex-1 rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500" placeholder="Nhập mã lô..." />
        <button className="rounded-lg bg-emerald-600 px-5 py-3 font-semibold text-white hover:bg-emerald-700">Tra cứu</button>
      </form>
      {searched && (product ? (
        <div className="mt-6 rounded-xl bg-emerald-50 p-5">
          <div className="flex items-center gap-2 font-bold text-emerald-800"><CheckCircle2 size={20} /> Tìm thấy lô hàng</div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-slate-500">Sản phẩm</dt><dd className="font-semibold">{product.name}</dd></div>
            <div><dt className="text-slate-500">Mã lô</dt><dd className="font-semibold">{product.batch}</dd></div>
            <div><dt className="text-slate-500">Chứng nhận</dt><dd className="font-semibold">{product.cert}</dd></div>
            <div><dt className="text-slate-500">Hạn sử dụng</dt><dd className="font-semibold">{product.exp}</dd></div>
          </dl>
          <p className="mt-4 text-xs text-slate-500">Dữ liệu mẫu; nhật ký canh tác và QR thật sẽ kết nối Backend ở giai đoạn tiếp theo.</p>
        </div>
      ) : <p className="mt-5 rounded-lg bg-red-50 p-4 text-sm text-red-700">Không tìm thấy mã lô này trong dữ liệu mẫu.</p>)}
    </div>
  );
}

function FefoDashboard() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <PageTitle title="Bảng theo dõi hạn sử dụng kho FEFO" subtitle="Lô có hạn sử dụng gần nhất được ưu tiên xuất trước." />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="bg-slate-100 text-slate-600"><tr>
            {['Mã lô', 'Sản phẩm', 'Tồn kho', 'Hạn sử dụng', 'Ưu tiên xuất kho'].map((label) => <th key={label} className="p-3">{label}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {[...PRODUCTS].sort((a, b) => a.exp.localeCompare(b.exp)).map((p) => (
              <tr key={p.id}>
                <td className="p-3 font-mono text-xs font-semibold">{p.batch}</td>
                <td className="p-3">{p.name}</td>
                <td className="p-3 font-bold">{p.stock} {p.unit}</td>
                <td className="p-3 font-semibold text-amber-600">{p.exp}</td>
                <td className="p-3"><span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">FEFO</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SimpleOperationsPage({ title, description, buttonLabel }) {
  const [message, setMessage] = useState('');
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <PageTitle title={title} subtitle={description} />
      <div className="max-w-xl space-y-4">
        <label className="block text-sm font-medium text-slate-700">Tên hoặc nội dung</label>
        <input className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-emerald-500" placeholder="Nhập nội dung minh họa..." />
        <button onClick={() => setMessage('Đã ghi nhận thao tác minh họa. Chức năng sẽ được kết nối API sau.')} className="rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-700">{buttonLabel}</button>
        {message && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
      </div>
    </div>
  );
}

export default function App() {
  // Role selector hiện chỉ phục vụ demo giao diện; phân quyền thật phải được xác thực ở Backend.
  const [activeRole, setActiveRole] = useState('customer');
  const [activePage, setActivePage] = useState('home');
  const [authOpen, setAuthOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const changeRole = (role) => {
    setActiveRole(role);
    setActivePage(ROLE_DEFAULT_PAGE[role]);
  };

  const renderPage = () => {
    if (activeRole === 'customer') {
      switch (activePage) {
        case 'home': return <HomePage />;
        case 'story': return <BrandStory />;
        case 'subscription': return <SubscriptionPage />;
        case 'qr': return <TraceabilityPage />;
        default: return <HomePage />;
      }
    }

    if (activeRole === 'farm_staff') {
      if (activePage === 'farm_logs') {
        return <SimpleOperationsPage title="Nhật ký canh tác" description="Giao diện mẫu để nhân viên nông trại ghi nhận hoạt động chăm sóc." buttonLabel="Lưu nhật ký mẫu" />;
      }
      return <SimpleOperationsPage title="Quản lý lô hàng" description="Giao diện mẫu khởi tạo lô hàng và chuẩn bị thông tin mã QR." buttonLabel="Tạo lô hàng mẫu" />;
    }

    if (activeRole === 'sales') {
      if (activePage === 'sales_complaints') {
        return <SimpleOperationsPage title="Khiếu nại khách hàng" description="Giao diện mẫu tiếp nhận và theo dõi khiếu nại." buttonLabel="Ghi nhận khiếu nại mẫu" />;
      }
      return <SimpleOperationsPage title="Quản lý đơn hàng" description="Giao diện mẫu dành cho nhân viên bán hàng." buttonLabel="Cập nhật đơn hàng mẫu" />;
    }

    if (activeRole === 'admin') {
      if (activePage === 'admin_products') {
        return <SimpleOperationsPage title="Danh mục sản phẩm" description="Khu vực quản trị danh mục sản phẩm." buttonLabel="Thêm sản phẩm mẫu" />;
      }
      if (activePage === 'admin_reports') {
        return <SimpleOperationsPage title="Báo cáo thống kê" description="Khu vực báo cáo dành cho Admin; biểu đồ sẽ kết nối dữ liệu Backend." buttonLabel="Tải báo cáo mẫu" />;
      }
      return <FefoDashboard />;
    }

    return <HomePage />;
  };

  const navItems = NAV_ITEMS[activeRole] || NAV_ITEMS.customer;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-30 bg-emerald-800 text-white shadow-md">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <button onClick={() => changeRole('customer')} className="flex items-center gap-3 text-left">
            <span className="rounded-xl bg-emerald-600 p-2"><Sprout size={25} /></span>
            <span>
              <span className="block text-lg font-extrabold leading-tight">Organic Farm Ecommerce</span>
              <span className="block text-xs text-emerald-100">Từ nông trại đến bàn ăn</span>
            </span>
          </button>

          <div className="flex flex-wrap items-center gap-1 rounded-xl border border-emerald-700 bg-emerald-950/50 p-1">
            <span className="px-2 text-xs text-emerald-200">Vai trò demo:</span>
            {Object.entries(ROLE_LABELS).map(([role, label]) => (
              <button key={role} onClick={() => changeRole(role)} className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${activeRole === role ? 'bg-emerald-500 text-white' : 'text-emerald-100 hover:bg-emerald-800'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {activeRole === 'customer' ? (
        <>
          <nav className="border-b border-emerald-100 bg-white">
            <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="flex flex-wrap gap-1">
                {navItems.map(({ id, label, icon: Icon }) => (
                  <button key={id} onClick={() => setActivePage(id)} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${activePage === id ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                    <Icon size={17} />{label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                {currentUser ? (
                  <>
                    <span className="hidden text-sm text-slate-600 sm:inline"><UserCircle className="mr-1 inline" size={17} />{currentUser.name}</span>
                    <button onClick={() => setCurrentUser(null)} className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"><LogOut size={16} />Đăng xuất</button>
                  </>
                ) : (
                  <button onClick={() => setAuthOpen(true)} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"><LogIn size={16} />Đăng nhập</button>
                )}
              </div>
            </div>
          </nav>
          <main className="min-h-[70vh]">{renderPage()}</main>
        </>
      ) : (
        <main className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 md:grid-cols-4">
          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-4 px-2 text-xs font-bold uppercase tracking-wider text-slate-400">Menu {ROLE_LABELS[activeRole]}</h2>
            <nav className="space-y-1">
              {navItems.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setActivePage(id)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium ${activePage === id ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50'}`}>
                  <Icon size={18} />{label}
                </button>
              ))}
            </nav>
          </aside>
          <section className="min-w-0 md:col-span-3">{renderPage()}</section>
        </main>
      )}

      <footer className="border-t border-slate-200 bg-white px-4 py-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Organic Farm Ecommerce · Frontend demo
      </footer>

      <AuthModal
        isOpen={authOpen}
        onClose={() => setAuthOpen(false)}
        onLoginSuccess={(user) => setCurrentUser(user)}
      />
    </div>
  );
}
