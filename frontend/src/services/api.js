
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

export default api;
