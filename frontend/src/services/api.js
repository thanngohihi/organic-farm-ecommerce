import axios from 'axios';

// ===============================
// 1. CẤU HÌNH API LARAVEL V1
// ===============================

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

export const getSavedAuthToken = () =>
  localStorage.getItem('access_token') ||
  localStorage.getItem('token') ||
  localStorage.getItem('user_token') ||
  '';

export const getAuthHeaders = () => {
  const token = getSavedAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const syncAxiosAuthToken = (token) => {
  if (token) {
    axios.defaults.headers.common.Authorization = `Bearer ${token}`;
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete axios.defaults.headers.common.Authorization;
    delete api.defaults.headers.common.Authorization;
  }
};

// ===============================
// 2. INTERCEPTOR - GẮN TOKEN AUTH
// ===============================

api.interceptors.request.use(
  (config) => {
    const token = getSavedAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ===============================
// 3. GET DANH SÁCH SẢN PHẨM
// ===============================

export const fetchProducts = async (category = 'all', cert = 'all') => {
  const response = await api.get('/products', {
    params: { category, cert },
  });
  return Array.isArray(response.data?.data) ? response.data.data : [];
};

// ===============================
// 4. GET THÔNG TIN QR TRUY XUẤT LÔ HÀNG
// ===============================

export const fetchBatchQrDetail = async (batchCode) => {
  const response = await api.get(`/batches/qr/${encodeURIComponent(batchCode)}`);
  const data = response.data?.data ?? {};
  const batch = data.batch ?? data;
  const rawLogs = Array.isArray(data.farming_logs)
    ? data.farming_logs
    : Array.isArray(batch?.farming_logs)
    ? batch.farming_logs
    : [];

  return {
    batch_code: batch.batch_code || batchCode,
    product_name: batch.product_name || batch.product?.name || 'Nông sản hữu cơ',
    harvest_date: batch.harvest_date || '—',
    exp_date: batch.expiry_date || batch.exp_date || '—',
    engineer: batch.farm_staff_name || batch.farm_staff?.full_name || 'Kỹ sư nông trại',
    quality_cert: batch.certification || batch.product?.certification || 'VietGAP',
    soil_water_test_url:
      rawLogs.find((l) => l.soil_water_test_url)?.soil_water_test_url ||
      batch.certification_doc_url ||
      null,
    farming_logs: rawLogs.map((log) => ({
      date: log.logged_at ? String(log.logged_at).slice(0, 10) : '',
      action: log.title || log.stage || 'Hoạt động canh tác',
      note: log.description || '',
      media: Array.isArray(log.media_urls) ? log.media_urls[0] || null : null,
    })),
  };
};

// ===============================
// 5. POST TÍNH PHÍ VẬN CHUYỂN
// ===============================

export const calculateShipping = async (address, latitude = null, longitude = null) => {
  const response = await api.post('/shipping/calculate-km', {
    customer_address: address,
    latitude,
    longitude,
  });
  return response.data?.data ?? response.data;
};

// ===============================
// 6. POST ĐẶT HÀNG LẺ (CHECKOUT FEFO)
// ===============================

export const checkoutSingleOrder = async (orderPayload) => {
  const response = await api.post('/customer/orders/checkout-single', orderPayload);
  return response.data;
};

// ===============================
// 7. FARM STAFF, SALES & ADMIN DASHBOARD
// ===============================

export const fetchBatches = async () => {
  const response = await api.get('/farm/batches');
  return Array.isArray(response.data?.data) ? response.data.data : [];
};

export const createBatch = async (payload) => {
  const response = await api.post('/farm/batches', payload);
  return response.data?.data ?? response.data;
};

export const recordBatchWaste = async (payload) => {
  const response = await api.post('/farm/batches/waste-record', payload);
  return response.data;
};

export const createFarmingLog = async (payload) => {
  const config =
    payload instanceof FormData
      ? { headers: { 'Content-Type': 'multipart/form-data' } }
      : undefined;
  const response = await api.post('/farm/farming-logs', payload, config);
  return response.data?.data ?? response.data;
};

export const fetchOrdersForSales = async () => {
  const response = await api.get('/sales/orders');
  return Array.isArray(response.data?.data) ? response.data.data : [];
};

export const fetchComplaintsForSales = async () => {
  const response = await api.get('/sales/complaints');
  return Array.isArray(response.data?.data) ? response.data.data : [];
};

export const approveComplaint = async (complaintId, actionType, extra = {}) => {
  const response = await api.put(`/sales/complaints/${complaintId}/approve`, {
    action: actionType,
    ...extra,
  });
  return response.data;
};

export const fetchAdminDashboardStats = async () => {
  const [statsRes, alertRes] = await Promise.all([
    api.get('/admin/dashboard-stats'),
    api.get('/alerts/near-expiry'),
  ]);
  const stats = statsRes.data?.data ?? {};
  return {
    ...stats,
    near_expiry_batches: Array.isArray(alertRes.data?.data) ? alertRes.data.data : [],
  };
};

export default api;
