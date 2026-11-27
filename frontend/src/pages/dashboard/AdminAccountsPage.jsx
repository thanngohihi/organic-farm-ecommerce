import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  UserPlus,
  ShieldCheck,
  Trash2,
  RefreshCw,
  Loader2,
  Users,
  Lock,
  Unlock,
  Search,
} from 'lucide-react';
import { getAuthHeaders } from '../../services/api';
import Pagination from '../../components/Pagination';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';
const ACCOUNTS_PER_PAGE = 5;

export default function AdminAccountsPage() {
  const [activeTab, setActiveTab] = useState('staff'); // 'staff' | 'customers'
  const [staffList, setStaffList] = useState([]);
  const [customerList, setCustomerList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Password@123');
  const [role, setRole] = useState('farm_staff');

  const loadAllAccounts = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const [staffRes, custRes] = await Promise.all([
        axios.get(`${API_URL}/admin/staff-accounts`, { headers }),
        axios.get(`${API_URL}/admin/customers`, { headers }),
      ]);
      setStaffList(Array.isArray(staffRes.data?.data) ? staffRes.data.data : []);
      setCustomerList(Array.isArray(custRes.data?.data) ? custRes.data.data : []);
    } catch (err) {
      console.error('Lỗi tải danh sách tài khoản:', err);
      alert(
        err.response?.data?.message ||
          'Không thể tải danh sách tài khoản từ máy chủ.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllAccounts();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [activeTab, searchTerm]);

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    const cleanEmail = email.toLowerCase().trim();
    const cleanPhone = phone.trim();

    if (!name.trim() || !cleanPhone || !cleanEmail || password.length < 8) {
      alert('Vui lòng nhập đầy đủ họ tên, SĐT, email và mật khẩu (>= 8 ký tự)!');
      return;
    }

    setSaving(true);
    try {
      const res = await axios.post(
        `${API_URL}/admin/staff-accounts`,
        {
          role_name: role,
          full_name: name.trim(),
          email: cleanEmail,
          phone: cleanPhone,
          password,
        },
        { headers: getAuthHeaders() }
      );

      setName('');
      setPhone('');
      setEmail('');
      await loadAllAccounts();
      alert(
        res.data?.message ||
          `Đã tạo tài khoản ${
            role === 'farm_staff' ? 'Nhân viên Nông trại' : 'Nhân viên Sales'
          } (${cleanEmail}) trong MySQL thành công!`
      );
    } catch (err) {
      const firstErr = Object.values(err.response?.data?.errors || {})
        .flat()
        .join('\n');
      alert(
        firstErr ||
          err.response?.data?.message ||
          'Không thể tạo tài khoản nhân sự.'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (account) => {
    if (account.is_default) {
      alert('Không thể khóa tài khoản mặc định của hệ thống!');
      return;
    }

    const actionText = account.is_active ? 'khóa' : 'mở khóa';
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn ${actionText} tài khoản "${account.full_name}" (${account.email}) không?`
    );
    if (!confirmed) return;

    setBusyId(account.id);
    try {
      const res = await axios.patch(
        `${API_URL}/admin/accounts/${account.id}/toggle-active`,
        {},
        { headers: getAuthHeaders() }
      );
      alert(res.data?.message || `Đã ${actionText} tài khoản.`);
      await loadAllAccounts();
    } catch (err) {
      alert(err.response?.data?.message || `Không thể ${actionText} tài khoản.`);
    } finally {
      setBusyId(null);
    }
  };

  const handleDeleteAccount = async (account) => {
    if (account.is_default) {
      alert('Không thể xóa tài khoản mặc định của hệ thống!');
      return;
    }

    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn XÓA vĩnh viễn tài khoản "${account.full_name}" (${account.email}) khỏi hệ thống không?`
    );
    if (!confirmed) return;

    setBusyId(account.id);
    try {
      const res = await axios.delete(
        `${API_URL}/admin/accounts/${account.id}`,
        { headers: getAuthHeaders() }
      );
      alert(res.data?.message || 'Đã xóa tài khoản khỏi hệ thống.');
      await loadAllAccounts();
    } catch (err) {
      alert(
        err.response?.data?.message || 'Không thể xóa tài khoản này.'
      );
    } finally {
      setBusyId(null);
    }
  };

  const rawList = activeTab === 'staff' ? staffList : customerList;
  const keyword = searchTerm.trim().toLowerCase();
  const filteredList = keyword
    ? rawList.filter(
        (acc) =>
          String(acc.full_name || '').toLowerCase().includes(keyword) ||
          String(acc.email || '').toLowerCase().includes(keyword) ||
          String(acc.phone || '').toLowerCase().includes(keyword)
      )
    : rawList;

  const totalPages = Math.max(1, Math.ceil(filteredList.length / ACCOUNTS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginatedList = filteredList.slice(
    (safePage - 1) * ACCOUNTS_PER_PAGE,
    safePage * ACCOUNTS_PER_PAGE
  );

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
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5"
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
              Số điện thoại *
            </label>
            <input
              type="text"
              placeholder="VD: 0901234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
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
              placeholder="VD: nhanvien@organicfarm.vn"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Mật khẩu (tối thiểu 8 ký tự) *
            </label>
            <input
              type="text"
              minLength={8}
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

          <div className="flex justify-end sm:col-span-2 lg:col-span-5">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              + Tạo tài khoản nhân sự
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('staff')}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeTab === 'staff'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <ShieldCheck size={15} />
              Nhân sự (Staff & Sales) ({staffList.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('customers')}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeTab === 'customers'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Users size={15} />
              Khách hàng ({customerList.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm tên, email, SĐT..."
                className="rounded-xl border border-slate-200 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="button"
              onClick={loadAllAccounts}
              disabled={loading}
              className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Làm mới
            </button>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Đang tải danh sách tài khoản...</p>
        ) : filteredList.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            Không có tài khoản nào phù hợp.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                    <th className="p-3">Họ và tên</th>
                    <th className="p-3">Email đăng nhập</th>
                    <th className="p-3">Số điện thoại</th>
                    {activeTab === 'staff' ? (
                      <th className="p-3">Vai trò</th>
                    ) : (
                      <th className="p-3">Đơn / Điểm Loyalty</th>
                    )}
                    <th className="p-3">Trạng thái</th>
                    <th className="p-3">Ngày tạo</th>
                    <th className="p-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedList.map((acc) => (
                    <tr key={acc.id} className="hover:bg-slate-50">
                      <td className="p-3 font-semibold text-slate-800">
                        {acc.full_name}
                      </td>
                      <td className="p-3 font-mono text-xs text-slate-600">
                        {acc.email}
                      </td>
                      <td className="p-3 text-xs text-slate-600">{acc.phone}</td>
                      {activeTab === 'staff' ? (
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
                      ) : (
                        <td className="p-3 text-xs text-slate-600">
                          <strong>{acc.orders_count ?? 0}</strong> đơn •{' '}
                          <span className="font-semibold text-amber-700">
                            {acc.loyalty_points ?? 0} điểm
                          </span>
                        </td>
                      )}
                      <td className="p-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            acc.is_active
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-rose-100 text-rose-700'
                          }`}
                        >
                          {acc.is_active ? 'Đang hoạt động' : 'Đã khóa'}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-slate-500">
                        {acc.created_at
                          ? new Date(acc.created_at).toLocaleDateString('vi-VN')
                          : '—'}
                      </td>
                      <td className="p-3 text-right">
                        {acc.is_default ? (
                          <span className="text-xs italic text-slate-400">
                            Mặc định
                          </span>
                        ) : (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={busyId === acc.id}
                              onClick={() => handleToggleActive(acc)}
                              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                                acc.is_active
                                  ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              }`}
                            >
                              {acc.is_active ? (
                                <>
                                  <Lock size={13} /> Khóa
                                </>
                              ) : (
                                <>
                                  <Unlock size={13} /> Mở khóa
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              disabled={busyId === acc.id}
                              onClick={() => handleDeleteAccount(acc)}
                              className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                            >
                              <Trash2 size={13} /> Xóa
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              currentPage={safePage}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </div>
  );
}
