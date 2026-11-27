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

export const showToast = (message, type = 'success') => {
  if (!message) return;
  window.dispatchEvent(
    new CustomEvent('organic:toast', {
      detail: { message, type },
    })
  );
};

// ===============================
// 2. INTERCEPTOR - GẮN TOKEN & XỬ LÝ HẾT HẠN PHIÊN / 419 CSRF
// ===============================

let lastSessionExpiredAt = 0;

const attachAuthAndExpiryInterceptors = (instance) => {
  instance.interceptors.request.use(
    (config) => {
      const token = getSavedAuthToken();
      if (token && !config.headers?.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      const status = error?.response?.status;
      const reqUrl = String(error?.config?.url || '');
      const isAuthCredentialEndpoint =
        reqUrl.includes('/auth/login') ||
        reqUrl.includes('/auth/register') ||
        reqUrl.includes('/auth/forgot-password') ||
        reqUrl.includes('/auth/logout');

      if ((status === 401 || status === 419) && !isAuthCredentialEndpoint) {
        const hadToken = Boolean(getSavedAuthToken());
        if (hadToken || status === 419) {
          syncAxiosAuthToken(null);
          localStorage.removeItem('access_token');
          localStorage.removeItem('token');
          localStorage.removeItem('user_token');
          localStorage.removeItem('organic_current_user');

          const now = Date.now();
          if (now - lastSessionExpiredAt > 1500) {
            lastSessionExpiredAt = now;
            window.dispatchEvent(
              new CustomEvent('organic:session-expired', {
                detail: {
                  status,
                  message:
                    status === 419
                      ? 'Phiên làm việc (CSRF Token) đã hết hạn do để trang quá lâu. Vui lòng đăng nhập lại!'
                      : 'Phiên đăng nhập (Token) đã hết hạn. Vui lòng đăng nhập lại để tiếp tục thao tác.',
                },
              })
            );
          }
        }
      }

      return Promise.reject(error);
    }
  );
};

attachAuthAndExpiryInterceptors(api);
attachAuthAndExpiryInterceptors(axios);

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
