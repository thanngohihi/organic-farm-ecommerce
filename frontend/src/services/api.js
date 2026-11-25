
import axios from 'axios';

// ===============================
// 1. CẤU HÌNH API
// ===============================

const API_BASE = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ===============================
// 2. INTERCEPTOR - GẮN TOKEN AUTH
// ===============================

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('user_token');

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

export const fetchProducts = async (
  category = 'all',
  cert = 'all'
) => {
  // Khi kết nối Backend:
  // const response = await api.get('/products', {
  //   params: { category, cert },
  // });
  // return response.data;

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        {
          id: 1,
          name: 'Cà Chua Cherry Hữu Cơ',
          category: 'Rau củ quả',
          price: 45000,
          unit: 'Hộp 500g',
          cert: 'VietGAP',
          is_flash_sale: true,
          batch_code: 'LOT-20261115-01',
          image: 'https://placehold.co/400x400',
          exp_days: 4,
        },
        {
          id: 2,
          name: 'Cải Kale Thu Hoạch Sáng',
          category: 'Rau xanh',
          price: 38000,
          unit: 'Bó 300g',
          cert: 'USDA Organic',
          is_flash_sale: false,
          batch_code: 'LOT-20261116-02',
          image: 'https://placehold.co/400x400',
          exp_days: 3,
        },
        {
          id: 3,
          name: 'Dâu Tây Đà Lạt Thượng Hạng',
          category: 'Trái cây tươi',
          price: 120000,
          unit: 'Hộp 250g',
          cert: 'VietGAP',
          is_flash_sale: false,
          batch_code: 'LOT-20261116-05',
          image: 'https://placehold.co/400x400',
          exp_days: 2,
        },
      ]);
    }, 300);
  });
};

// ===============================
// 4. GET THÔNG TIN QR TRUY XUẤT LÔ HÀNG
// ===============================

export const fetchBatchQrDetail = async (batchCode) => {
  // Khi kết nối Backend:
  // const response = await api.get(
  //   `/batches/qr/${encodeURIComponent(batchCode)}`
  // );
  // return response.data;

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        batch_code: batchCode,
        product_name: 'Cà Chua Cherry Hữu Cơ',
        harvest_date: '15/11/2026',
        exp_date: '20/11/2026',
        engineer: 'Kỹ sư Nguyễn Văn Nông (Nông trại Đà Lạt)',
        quality_cert: 'VietGAP - Số 998/2026/BNN',
        soil_water_test_url: 'https://example.com/test-report',
        farming_logs: [
          {
            date: '01/10/2026',
            action: 'Gieo hạt giống hữu cơ F1',
            note: 'Sử dụng giá thể mùn dừa vi sinh',
            media: null,
          },
          {
            date: '15/10/2026',
            action: 'Tưới nước & Bón phân trùn hữu cơ',
            note: 'Nguồn nước giếng khoan đã qua kiểm định',
            media: 'https://placehold.co/600x400',
          },
          {
            date: '05/11/2026',
            action: 'Kiểm tra sâu bệnh vi sinh',
            note: 'Đạt chuẩn không dư lượng hóa chất',
            media: null,
          },
          {
            date: '15/11/2026',
            action: 'Thu hoạch & Đóng gói FEFO',
            note: 'Cắt lúc 5h sáng, đóng hộp bảo quản 10°C',
            media: 'https://placehold.co/600x400',
          },
        ],
      });
    }, 400);
  });
};

// ===============================
// 5. POST TÍNH PHÍ VẬN CHUYỂN
// ===============================

export const calculateShipping = async (address) => {
  // Khi kết nối Backend:
  // const response = await api.post(
  //   '/shipping/calculate-km',
  //   { address }
  // );
  // return response.data;

  return new Promise((resolve) => {
    setTimeout(() => {
      const distance = Math.floor(Math.random() * 8) + 2;
      const fee = distance * 5000;

      resolve({
        distance_km: distance,
        shipping_fee: fee,
      });
    }, 500);
  });
};

// ===============================
// 6. POST ĐẶT HÀNG LẺ (CHECKOUT FEFO)
// ===============================

export const checkoutSingleOrder = async (orderPayload) => {
  // Khi kết nối Backend:
  // const response = await api.post(
  //   '/orders/checkout-single',
  //   orderPayload
  // );
  // return response.data;

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        status: 'success',
        order_id:
          'ORD-' + Math.floor(100000 + Math.random() * 900000),
        message:
          'Đặt hàng thành công! Đơn hàng sẽ được xuất từ lô gần hết hạn nhất (FEFO).',
      });
    }, 700);
  });
};

// ===============================
// 7. EXPORT API INSTANCE
// ===============================
// =========================================================================
// 8. API DÀNH CHO NGƯỜI 5: FARM STAFF, SALES & ADMIN DASHBOARD
// =========================================================================

// --- [FARM STAFF] Lấy danh sách lô hàng FEFO ---
export const fetchBatches = async () => {
  // Khi kết nối Backend:
  // const response = await api.get('/v1/batches');
  // return response.data;

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        {
          id: 1,
          batch_code: 'LOT-20261115-01',
          product_id: 1,
          product_name: 'Cà Chua Cherry Hữu Cơ',
          initial_quantity: 100,
          remaining_quantity: 25,
          unit: 'Hộp 500g',
          harvest_date: '2026-11-15',
          expiry_date: '2026-11-27',
          is_flash_sale: true,
          status: 'Sắp hết hạn (FEFO ưu tiên)',
        },
        {
          id: 2,
          batch_code: 'LOT-20261120-02',
          product_id: 2,
          product_name: 'Cải Kale Thu Hoạch Sáng',
          initial_quantity: 80,
          remaining_quantity: 65,
          unit: 'Bó 300g',
          harvest_date: '2026-11-20',
          expiry_date: '2026-11-30',
          is_flash_sale: false,
          status: 'Tốt',
        },
        {
          id: 3,
          batch_code: 'LOT-20261124-03',
          product_id: 3,
          product_name: 'Dâu Tây Đà Lạt Thượng Hạng',
          initial_quantity: 50,
          remaining_quantity: 48,
          unit: 'Hộp 250g',
          harvest_date: '2026-11-24',
          expiry_date: '2026-12-02',
          is_flash_sale: false,
          status: 'Mới nhập',
        },
      ]);
    }, 300);
  });
};

// --- [FARM STAFF] Khởi tạo lô hàng mới ---
export const createBatch = async (payload) => {
  // Khi kết nối Backend:
  // const response = await api.post('/v1/batches', payload);
  // return response.data;

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        id: Date.now(),
        batch_code: `LOT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(10 + Math.random() * 89)}`,
        ...payload,
        remaining_quantity: Number(payload.initial_quantity),
        is_flash_sale: false,
        status: 'Mới nhập',
      });
    }, 400);
  });
};

// --- [FARM STAFF] Ghi nhận xuất hủy / hao hụt ---
export const recordBatchWaste = async (payload) => {
  // Khi kết nối Backend:
  // const response = await api.post('/v1/batches/waste-record', payload);
  // return response.data;

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        status: 'success',
        message: `Đã ghi nhận xuất hủy ${payload.quantity} đơn vị từ lô ${payload.batch_code}.`,
      });
    }, 400);
  });
};

// --- [FARM STAFF] Đăng nhật ký canh tác ---
export const createFarmingLog = async (payload) => {
  // Khi kết nối Backend (dùng FormData nếu upload file trực tiếp):
  // const response = await api.post('/v1/farming-logs', payload);
  // return response.data;

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        id: Date.now(),
        ...payload,
        created_at: new Date().toLocaleDateString('vi-VN'),
      });
    }, 400);
  });
};

// --- [SALES] Lấy danh sách đơn hàng ---
export const fetchOrdersForSales = async () => {
  // Khi kết nối Backend:
  // const response = await api.get('/v1/sales/orders');
  // return response.data;

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        {
          id: 'ORD-849201',
          customer_name: 'Trần Minh Anh',
          phone: '0909123456',
          address: '123 Nguyễn Văn Cừ, Q.5, TP.HCM',
          distance_km: 4.5,
          is_express: true,
          order_type: 'Đơn lẻ',
          total_amount: 155000,
          payment_method: 'MoMo (Đã thanh toán)',
          status: 'pending',
          created_at: '25/11/2026 09:30',
          items: [
            { name: 'Cà Chua Cherry Hữu Cơ', qty: 2, price: 45000 },
            { name: 'Cải Kale Thu Hoạch Sáng', qty: 1, price: 38000 },
          ],
        },
        {
          id: 'ORD-849188',
          customer_name: 'Lê Hoàng Nam',
          phone: '0918777888',
          address: '45 Lê Lợi, Q.1, TP.HCM',
          distance_km: 2.1,
          is_express: false,
          order_type: 'Gói định kỳ (Thứ 3 & Thứ 6)',
          total_amount: 240000,
          payment_method: 'MoMo (Đã thanh toán)',
          status: 'shipping',
          created_at: '25/11/2026 08:15',
          items: [
            { name: 'Dâu Tây Đà Lạt Thượng Hạng', qty: 2, price: 120000 },
          ],
        },
      ]);
    }, 300);
  });
};

// --- [SALES] Lấy danh sách khiếu nại ---
export const fetchComplaintsForSales = async () => {
  // Khi kết nối Backend:
  // const response = await api.get('/v1/sales/complaints');
  // return response.data;

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([
        {
          id: 101,
          order_id: 'ORD-849012',
          customer_name: 'Phạm Thu Hà',
          reason: 'Rau bị dập nát trong quá trình vận chuyển',
          description: 'Hộp cà chua cherry bị móp góc, có khoảng 5-6 quả bị dập.',
          evidence_url: 'https://placehold.co/600x400?text=Anh+Bang+Chung+Hu+Hong',
          status: 'pending',
          created_at: '25/11/2026 10:05',
        },
        {
          id: 102,
          order_id: 'ORD-848950',
          customer_name: 'Nguyễn Quốc Bảo',
          reason: 'Giao thiếu sản phẩm',
          description: 'Đơn đặt 2 bó cải Kale nhưng nhận được 1 bó.',
          evidence_url: 'https://placehold.co/600x400?text=Anh+Don+Hang+Thieu',
          status: 'approved_compensate',
          resolution_note: 'Đã tạo đơn giao bù 0đ mã ORD-849199',
          created_at: '24/11/2026 16:20',
        },
      ]);
    }, 300);
  });
};

// --- [SALES] Duyệt khiếu nại (Hoàn tiền / Giao bù 0đ) ---
export const approveComplaint = async (complaintId, actionType) => {
  // Khi kết nối Backend:
  // const response = await api.put(`/v1/sales/complaints/${complaintId}/approve`, {
  //   action: actionType, // 'refund' hoặc 'compensate'
  // });
  // return response.data;

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        status: 'success',
        message:
          actionType === 'refund'
            ? 'Đã duyệt hoàn tiền qua MoMo cho khách hàng!'
            : 'Đã duyệt và tự động sinh đơn giao bù 0đ xuất kho FEFO!',
      });
    }, 400);
  });
};

// --- [ADMIN] Lấy thống kê Dashboard & Cảnh báo Flash Sale ---
export const fetchAdminDashboardStats = async () => {
  // Khi kết nối Backend:
  // const [statsRes, alertRes] = await Promise.all([
  //   api.get('/v1/admin/dashboard-stats'),
  //   api.get('/v1/alerts/near-expiry'),
  // ]);
  // return { ...statsRes.data, near_expiry_batches: alertRes.data };

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        kpis: {
          total_revenue: 48500000,
          total_orders: 312,
          waste_rate_percent: 3.2,
          repeat_customer_rate: 64.5,
        },
        revenue_chart: [
          { day: 'T2', revenue: 5200000, waste: 150000 },
          { day: 'T3', revenue: 7800000, waste: 210000 },
          { day: 'T4', revenue: 6100000, waste: 120000 },
          { day: 'T5', revenue: 6900000, waste: 180000 },
          { day: 'T6', revenue: 9400000, waste: 250000 },
          { day: 'T7', revenue: 7200000, waste: 190000 },
          { day: 'CN', revenue: 5900000, waste: 140000 },
        ],
        near_expiry_batches: [
          {
            batch_code: 'LOT-20261115-01',
            product_name: 'Cà Chua Cherry Hữu Cơ',
            remaining_quantity: 25,
            expiry_date: '2026-11-27',
            days_left: 2,
            is_flash_sale: true,
          },
          {
            batch_code: 'LOT-20261116-05',
            product_name: 'Dâu Tây Đà Lạt Thượng Hạng',
            remaining_quantity: 12,
            expiry_date: '2026-11-28',
            days_left: 3,
            is_flash_sale: true,
          },
        ],
      });
    }, 350);
  });
};

export default api;
