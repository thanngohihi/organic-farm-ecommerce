import React, { useState, useEffect } from 'react';
import { UserPlus, ShieldCheck, Trash2 } from 'lucide-react';

const DEFAULT_STAFF = [
  {
    id: 2,
    name: 'Kỹ sư Nông Trại',
    email: 'farm@farm.vn',
    role: 'farm_staff',
    created_at: '20/11/2026',
    isDefault: true,
  },
  {
    id: 3,
    name: 'Nhân viên Bán Hàng',
    email: 'sales@farm.vn',
    role: 'sales',
    created_at: '20/11/2026',
    isDefault: true,
  },
];

export default function AdminAccountsPage() {
  const [staffList, setStaffList] = useState([]);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('farm123456');
  const [role, setRole] = useState('farm_staff');

  // Tải danh sách tài khoản mặc định + tài khoản đã tạo từ localStorage
  useEffect(() => {
    const savedCustomUsers = JSON.parse(
      localStorage.getItem('custom_staff_users') || '{}'
    );
    const customList = Object.values(savedCustomUsers);
    setStaffList([...customList, ...DEFAULT_STAFF]);
  }, []);

  const handleCreateAccount = (e) => {
    e.preventDefault();
    const cleanEmail = email.toLowerCase().trim();

    if (!name.trim() || !cleanEmail || !password.trim()) {
      alert('Vui lòng nhập đầy đủ họ tên, email và mật khẩu!');
      return;
    }

    if (staffList.some((acc) => acc.email === cleanEmail)) {
      alert('Email này đã tồn tại trong hệ thống!');
      return;
    }

    const newAccount = {
      id: Date.now(),
      name: name.trim(),
      email: cleanEmail,
      password,
      role,
      created_at: new Date().toLocaleDateString('vi-VN'),
    };

    const savedCustomUsers = JSON.parse(
      localStorage.getItem('custom_staff_users') || '{}'
    );
    savedCustomUsers[cleanEmail] = newAccount;
    localStorage.setItem('custom_staff_users', JSON.stringify(savedCustomUsers));

    setStaffList([newAccount, ...staffList]);
    setName('');
    setEmail('');
    alert(
      `Đã tạo tài khoản ${
        role === 'farm_staff' ? 'Nhân viên Nông trại' : 'Nhân viên Sales'
      } (${cleanEmail}) thành công!`
    );
  };

  // Xử lý xóa tài khoản
  const handleDeleteAccount = (account) => {
    if (account.isDefault) {
      alert('Không thể xóa tài khoản mẫu mặc định của hệ thống!');
      return;
    }

    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa tài khoản "${account.name}" (${account.email}) không?`
    );
    if (!confirmed) return;

    // Xóa khỏi localStorage
    const savedCustomUsers = JSON.parse(
      localStorage.getItem('custom_staff_users') || '{}'
    );
    delete savedCustomUsers[account.email];
    localStorage.setItem('custom_staff_users', JSON.stringify(savedCustomUsers));

    // Cập nhật lại giao diện bảng
    setStaffList((prev) => prev.filter((item) => item.email !== account.email));
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <UserPlus className="text-emerald-600" size={22} />
          <h2 className="text-xl font-bold text-slate-800">
            Cấp Tài khoản Nhân sự Nội bộ (Sales & Farm Staff)
          </h2>
        </div>

        <form
          onSubmit={handleCreateAccount}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Họ và tên nhân viên *
            </label>
            <input
              type="text"
              placeholder="VD: Nguyễn Văn A"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Email đăng nhập *
            </label>
            <input
              type="email"
              placeholder="VD: nhanvien@farm.vn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Mật khẩu khởi tạo *
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Phân quyền vai trò *
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
            >
              <option value="farm_staff">Nhân viên Nông trại (Farm Staff)</option>
              <option value="sales">Nhân viên Bán hàng (Sales)</option>
            </select>
          </div>

          <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
            <button
              type="submit"
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              + Tạo tài khoản nhân sự
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-bold text-slate-800">
          Danh sách Tài khoản Nhân sự đang hoạt động
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <th className="p-3">Họ và tên</th>
                <th className="p-3">Email đăng nhập</th>
                <th className="p-3">Vai trò</th>
                <th className="p-3">Ngày cấp</th>
                <th className="p-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staffList.map((acc) => (
                <tr key={acc.email} className="hover:bg-slate-50">
                  <td className="p-3 font-semibold text-slate-800">{acc.name}</td>
                  <td className="p-3 font-mono text-xs text-slate-600">
                    {acc.email}
                  </td>
                  <td className="p-3">
                    {acc.role === 'farm_staff' ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                        <ShieldCheck size={13} /> Farm Staff
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-bold text-blue-800">
                        <ShieldCheck size={13} /> Sales
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-xs text-slate-500">{acc.created_at}</td>
                  <td className="p-3 text-right">
                    {acc.isDefault ? (
                      <span className="text-xs italic text-slate-400">
                        Mặc định
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleDeleteAccount(acc)}
                        className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                      >
                        <Trash2 size={14} /> Xóa
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}