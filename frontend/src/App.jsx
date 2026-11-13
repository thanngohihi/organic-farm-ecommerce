import React, { useState } from 'react';
import { 
  Sprout, ShoppingBag, ShieldCheck, QrCode, Truck, RefreshCw, 
  UserCheck, AlertCircle, BarChart3, CheckCircle2, ChevronRight, LogIn
} from 'lucide-react';

export default function App() {
  const [activeRole, setActiveRole] = useState('customer');
  const [activeTab, setActiveTab] = useState('catalog');

  const products = [
    { id: 1, name: 'Cà Chua Hữu Cơ VietGAP', price: '35.000đ/kg', cert: 'VietGAP', batch: 'BATCH-CC-20261110', exp: '2026-11-16', stock: 45 },
    { id: 2, name: 'Cải Bó Xôi Organic USDA', price: '48.000đ/kg', cert: 'USDA Organic', batch: 'BATCH-BX-20261112', exp: '2026-11-15', stock: 20 },
    { id: 3, name: 'Dâu Tây Đà Lạt VietGAP', price: '120.000đ/hộp 500g', cert: 'VietGAP', batch: 'BATCH-DT-20261111', exp: '2026-11-17', stock: 15 },
    { id: 4, name: 'Củ Cải Đỏ Hữu Cơ', price: '42.000đ/kg', cert: 'GlobalGAP', batch: 'BATCH-CC-20261113', exp: '2026-11-25', stock: 110 }
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Banner */}
      <header className="bg-emerald-800 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-600 rounded-lg">
              <Sprout className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-tight">Organic Farm Ecommerce</h1>
              <p className="text-xs text-emerald-200">Single Farm Model • Nông trại Cuối Mắn đến Bàn ăn</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 bg-emerald-950/60 p-1.5 rounded-lg border border-emerald-700/50">
            <span className="text-xs text-emerald-300 font-medium px-2">Vai trò:</span>
            {['customer', 'farm_staff', 'sales', 'admin'].map((role) => (
              <button
                key={role}
                onClick={() => setActiveRole(role)}
                className={`px-3 py-1 rounded text-xs font-semibold transition ${
                  activeRole === role ? 'bg-emerald-500 text-white shadow' : 'text-emerald-200 hover:bg-emerald-800'
                }`}
              >
                {role === 'customer' ? 'Khách Hàng' : role === 'farm_staff' ? 'Nông Trại' : role === 'sales' ? 'Sales' : 'Admin'}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar Nav */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 px-2">Menu Chức Năng</h2>
          <nav className="space-y-1">
            <button 
              onClick={() => setActiveTab('catalog')} 
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'catalog' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Danh Mục Sản Phẩm</span>
            </button>
            <button 
              onClick={() => setActiveTab('subscription')} 
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'subscription' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <RefreshCw className="w-4 h-4" />
              <span>Gói Định Kỳ (Subscription)</span>
            </button>
            <button 
              onClick={() => setActiveTab('qr_scanner')} 
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'qr_scanner' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <QrCode className="w-4 h-4" />
              <span>Quét QR Truy Xuất</span>
            </button>
            <button 
              onClick={() => setActiveTab('fefo_dashboard')} 
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'fefo_dashboard' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Quản Lý Tồn Kho FEFO</span>
            </button>
          </nav>
        </div>

        {/* Content Panel */}
        <div className="md:col-span-3 space-y-6">
          {activeTab === 'catalog' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-slate-800">Sản Phẩm Tươi Sạch Trong Ngày</h2>
                <span className="text-xs bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full font-semibold">Tự động xuất kho FEFO</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {products.map((p) => (
                  <div key={p.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">{p.cert}</span>
                      <span className="text-xs text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded">Hạn: {p.exp}</span>
                    </div>
                    <h3 className="font-bold text-slate-800 mt-2">{p.name}</h3>
                    <p className="text-sm font-extrabold text-emerald-700 mt-1">{p.price}</p>
                    <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
                      <span>Lô: <strong className="text-slate-700">{p.batch}</strong></span>
                      <button className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-emerald-700 transition">Mua Ngay</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'subscription' && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800 mb-2">Đăng Ký Gói Nông Sản Định Kỳ (Subscription)</h2>
              <p className="text-sm text-slate-600 mb-4">Tự động giao rau tươi đến tận nhà bạn 2 lần/tuần vào Thứ 3 & Thứ 6.</p>
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex justify-between items-center">
                <div>
                  <h4 className="font-bold text-emerald-900">Gói Rau Xanh Gia Đình (4 Tuần)</h4>
                  <p className="text-xs text-emerald-700 mt-1">Bao gồm 5kg rau xanh + 3kg củ quả hữu cơ theo mùa</p>
                </div>
                <button className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow hover:bg-emerald-700">850.000đ/tháng</button>
              </div>
            </div>
          )}

          {activeTab === 'qr_scanner' && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center">
              <QrCode className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
              <h2 className="text-lg font-bold text-slate-800">Quét Mã QR Code Truy Xuất Nguồn Gốc</h2>
              <p className="text-sm text-slate-600 max-w-md mx-auto mt-1 mb-4">Minh bạch 100% Nhật ký gieo trồng, bón phân vi sinh và kết quả kiểm định chất lượng.</p>
              <div className="p-4 bg-slate-100 rounded-xl border border-dashed border-slate-300 inline-block font-mono text-sm">
                BATCH-CC-20261110 (Cà Chua VietGAP - Harvested 2026-11-10)
              </div>
            </div>
          )}

          {activeTab === 'fefo_dashboard' && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h2 className="text-lg font-bold text-slate-800 mb-4">Bảng Theo Dõi Hạn Sử Dụng Kho FEFO</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-100 text-slate-600 font-semibold">
                    <tr>
                      <th className="p-3 rounded-l-lg">Mã Lô</th>
                      <th className="p-3">Sản Phẩm</th>
                      <th className="p-3">Tồn Kho</th>
                      <th className="p-3">Hạn Sử Dụng</th>
                      <th className="p-3 rounded-r-lg">Ưu Tiên Xuất Kho</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {products.map((p) => (
                      <tr key={p.id}>
                        <td className="p-3 font-mono font-semibold">{p.batch}</td>
                        <td className="p-3">{p.name}</td>
                        <td className="p-3 font-bold text-slate-700">{p.stock} {p.name.includes('Dâu') ? 'hộp' : 'kg'}</td>
                        <td className="p-3 text-amber-600 font-semibold">{p.exp}</td>
                        <td className="p-3">
                          <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded text-xs font-bold">FEFO Top Priority</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
