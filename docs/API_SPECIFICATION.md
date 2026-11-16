# 🌿 TÀI LIỆU ĐẶC TẢ KỸ THUẬT TOÀN DIỆN HỆ THỐNG API (FULL API SPECIFICATION)
## DỰ ÁN: WEBSITE THƯƠNG MẠI ĐIỆN TỬ NÔNG SẢN SẠCH (SINGLE FARM)
**Giai đoạn:** Tuần 1 - Chuẩn hóa CSDL & Tài liệu API Specification phục vụ Mock Data Frontend  
**Tác giả:** Người 1 (Backend Lead - Core System, Auth & Payment)  
**Mục đích:** Cung cấp đầy đủ cấu trúc Request/Response và dữ liệu JSON mẫu (Mock Data) để **Người 4 (Khách hàng)** và **Người 5 (Dashboard Quản trị)** tự giả lập dữ liệu dựng toàn bộ giao diện UI song song ngay từ Tuần 1.  
**Phiên bản tài liệu:** v2.0.0 (Bản hoàn chỉnh tổng thể 4 tuần)  

---

## 📌 MỤC LỤC
1. [Quy chuẩn kết nối API chung](#1-quy-chuẩn-kết-nối-api-chung)
2. [Tài khoản kiểm thử phân quyền 5 Roles (Credentials & Mock Roles)](#2-tài-khoản-kiểm-thử-phân-quyền-5-roles-credentials--mock-roles)
3. [PHẦN A: BỘ API DÀNH CHO NGƯỜI 4 (CUSTOMER APP - MOBILE-FIRST)](#phần-a-bộ-api-dành-cho-người-4-customer-app---mobile-first)
   - [A1. Danh mục & Chi tiết nông sản](#a1-danh-mục--chi-tiết-nông-sản)
   - [A2. Quét mã QR truy xuất nguồn gốc & Nhật ký minh bạch](#a2-quét-mã-qr-truy-xuất-nguồn-gốc--nhật-ký-minh-bạch)
   - [A3. Đặt hàng lẻ & Tính phí ship động Google Maps](#a3-đặt-hàng-lẻ--tính-phí-ship-động-google-maps)
   - [A4. Đăng ký Gói nông sản định kỳ theo tháng (Subscription)](#a4-đăng-ký-gói-nông-sản-định-kỳ-theo-tháng-subscription)
   - [A5. Thanh toán trực tuyến MoMo](#a5-thanh-toán-trực-tuyến-momo)
   - [A6. Gửi yêu cầu Khiếu nại & Đổi trả kèm ảnh/video](#a6-gửi-yêu-cầu-khiếu-nại--đổi-trả-kèm-ảnhvideo)
   - [A7. Điểm thưởng Khách hàng thân thiết (Loyalty)](#a7-điểm-thưởng-khách-hàng-thân-thiết-loyalty)
4. [PHẦN B: BỘ API DÀNH CHO NGƯỜI 5 (OPERATIONS DASHBOARD - 3 CẤP QUYỀN)](#phần-b-bộ-api-dành-cho-người-5-operations-dashboard---3-cấp-quyền)
   - [B1. Phân hệ Kỹ sư canh tác (Farm Staff Dashboard)](#b1-phân-hệ-kỹ-sư-canh-tác-farm-staff-dashboard)
   - [B2. Phân hệ Bán hàng & CSKH (Sales Dashboard)](#b2-phân-hệ-bán-hàng--cskh-sales-dashboard)
   - [B3. Phân hệ Quản trị viên (Admin Dashboard & Analytics)](#b3-phân-hệ-quản-trị-viên-admin-dashboard--analytics)
5. [PHẦN C: BỘ API XÁC THỰC AUTH & UPLOAD MEDIA CLOUDINARY (NGƯỜI 1)](#phần-c-bộ-api-xác-thực-auth--upload-media-cloudinary-người-1)

---

## 1. QUY CHUẨN KẾT NỐI API CHUNG
* **Base URL:** `http://127.0.0.1:8000/api/v1`
* **Default Headers:**
  ```http
  Accept: application/json
  Content-Type: application/json
  ```
* **Khi đã đăng nhập (Protected Routes):**
  ```http
  Authorization: Bearer <access_token>
  ```
* **Định dạng Upload File:** `multipart/form-data`

---

## 2. TÀI KHOẢN KIỂM THỬ PHÂN QUYỀN 5 ROLES (CREDENTIALS & MOCK ROLES)
Người 4 và Người 5 dùng bảng tài khoản dưới đây để test phân luồng giao diện:

| Role Name | Tên hiển thị | Email | Password | Điều hướng giao diện (`redirect_to`) | Ghi chú quyền hạn |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **guest** | Khách vãng lai | *(Không cần)* | *(Không cần)* | `/` | Chỉ xem sản phẩm, quét QR |
| **customer** | Khách hàng | Tự đăng ký qua `/register` | Tự chọn | `/customer/home` | Mua lẻ, Subscription, Khiếu nại |
| **farm_staff** | Kỹ sư canh tác | `staff@organicfarm.vn` | `Password@123` | `/dashboard/farm-staff/batches` | Quản lý lô, nhật ký, in QR. Không xem doanh thu |
| **sales** | Bán hàng / CSKH | `sales@organicfarm.vn` | `Password@123` | `/dashboard/sales/orders` | Duyệt đơn, điều phối ship, duyệt khiếu nại |
| **admin** | Quản trị viên | `admin@organicfarm.vn` | `Password@123` | `/dashboard/admin/analytics` | Toàn quyền, Thống kê, Quản lý tài khoản |

---

# PHẦN A: BỘ API DÀNH CHO NGƯỜI 4 (CUSTOMER APP - MOBILE-FIRST)

### A1. Danh mục & Chi tiết nông sản
Người 4 dùng 2 API này để dựng: **Trang chủ, Trang danh sách sản phẩm (có lọc VietGAP/USDA) và Trang chi tiết sản phẩm**.

#### 1. Lấy danh sách sản phẩm (Kèm bộ lọc)
* **Endpoint:** `GET /products`
* **Query Params:** `?category=rau-an-la&certification=VietGAP&sort=price_asc`
* **Mock Response (`200 OK`):**
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "name": "Cà Chua Hữu Cơ VietGAP",
      "slug": "ca-chua-huu-co-vietgap",
      "sku": "PROD-CA-CHUA-01",
      "category": "Rau củ quả",
      "unit": "kg",
      "base_price": 35000,
      "certification": "VietGAP",
      "thumbnail_url": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500",
      "current_stock": 45.5,
      "nearest_expiry": "2026-11-20",
      "is_flash_sale": false
    },
    {
      "id": 2,
      "name": "Cải Bó Xôi Organic USDA",
      "slug": "cai-bo-xoi-organic-usda",
      "sku": "PROD-BO-XOI-02",
      "category": "Rau ăn lá",
      "unit": "kg",
      "base_price": 48000,
      "certification": "USDA Organic",
      "thumbnail_url": "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=500",
      "current_stock": 20.0,
      "nearest_expiry": "2026-11-18",
      "is_flash_sale": true,
      "discount_percent": 30
    }
  ]
}
```

#### 2. Lấy chi tiết sản phẩm
* **Endpoint:** `GET /products/{id}`
* **Mock Response (`200 OK`):**
```json
{
  "status": "success",
  "data": {
    "id": 1,
    "name": "Cà Chua Hữu Cơ VietGAP",
    "description": "Cà chua được trồng trong nhà kính Củ Chi, hoàn toàn không sử dụng thuốc trừ sâu hóa học.",
    "certification": "VietGAP",
    "certification_doc_url": "https://res.cloudinary.com/organic-farm/image/upload/v1731500001/cert_vietgap.pdf",
    "active_batch": {
      "batch_code": "BATCH-CC-20261110-01",
      "harvest_date": "2026-11-10",
      "expiry_date": "2026-11-20"
    }
  }
}
```

---

### A2. Quét mã QR truy xuất nguồn gốc & Nhật ký minh bạch
Người 4 dùng API này để dựng: **Trang kết quả quét mã QR từ camera điện thoại**.

* **Endpoint:** `GET /batches/qr/{batch_code}`
* **Mock Response (`200 OK`):**
```json
{
  "status": "success",
  "data": {
    "batch_code": "BATCH-CC-20261110-01",
    "product_name": "Cà Chua Hữu Cơ VietGAP",
    "farm_location": "Nhà màng A1, Nông trại Củ Chi, TP.HCM",
    "farm_staff_in_charge": "Kỹ sư Nguyễn Văn A",
    "harvest_date": "2026-11-10",
    "expiry_date": "2026-11-20",
    "soil_water_test_result": "Đạt chuẩn an toàn kim loại nặng & vi sinh vật",
    "timeline_logs": [
      {
        "stage": "gieo_hat",
        "title": "Gieo hạt giống hữu cơ F1",
        "description": "Ươm hạt giống trong giá thể xơ dừa đã xử lý nấm bệnh.",
        "logged_at": "2026-09-01 08:30:00",
        "media_urls": ["https://res.cloudinary.com/organic-farm/image/upload/sample1.jpg"]
      },
      {
        "stage": "thu_hoach",
        "title": "Thu hoạch quả chín cây đợt 1",
        "description": "Thu hái thủ công vào sáng sớm, loại bỏ quả dập.",
        "logged_at": "2026-11-10 06:15:00",
        "media_urls": ["https://res.cloudinary.com/organic-farm/image/upload/sample2.jpg"]
      }
    ]
  }
}
```

---

### A3. Đặt hàng lẻ & Tính phí ship động Google Maps
Người 4 dùng 2 API này để dựng: **Giỏ hàng, Form điền địa chỉ giao hàng, Tính khoảng cách km thực tế và Nút Đặt hàng**.

#### 1. Tính phí ship động theo km (Google Maps API)
* **Endpoint:** `POST /shipping/calculate-km`
* **Request Body:**
```json
{
  "customer_address": "227 Nguyễn Văn Cừ, Phường 4, Quận 5, TP.HCM",
  "latitude": 10.762622,
  "longitude": 106.682172
}
```
* **Mock Response (`200 OK`):**
```json
{
  "status": "success",
  "data": {
    "distance_km": 18.5,
    "duration_text": "35 phút",
    "shipping_fee": 45000,
    "farm_origin": "Nông trại Củ Chi, TP.HCM"
  }
}
```

#### 2. Đặt hàng lẻ (Checkout)
* **Endpoint:** `POST /orders/checkout-single`
* **Headers:** `Authorization: Bearer <customer_token>`
* **Request Body:**
```json
{
  "delivery_address": "227 Nguyễn Văn Cừ, Quận 5, TP.HCM",
  "distance_km": 18.5,
  "payment_method": "momo",
  "use_loyalty_points": 50,
  "items": [
    { "product_id": 1, "quantity": 2.5 }
  ]
}
```
* **Mock Response (`201 Created`):**
```json
{
  "status": "success",
  "message": "Đặt hàng thành công. Hệ thống tự động xuất kho theo nguyên tắc FEFO.",
  "data": {
    "order_code": "ORD-20261116-8921",
    "subtotal": 87500,
    "shipping_fee": 45000,
    "loyalty_discount": 50000,
    "total_amount": 82500,
    "payment_status": "cho_thanh_toan",
    "order_status": "cho_xac_nhan"
  }
}
```

---

### A4. Đăng ký Gói nông sản định kỳ theo tháng (Subscription)
Người 4 dùng API này để dựng: **Giao diện chọn gói rau gia đình, chọn ngày giao thứ 3 / thứ 6 trong tuần**.

* **Endpoint:** `POST /subscriptions`
* **Headers:** `Authorization: Bearer <customer_token>`
* **Request Body:**
```json
{
  "package_name": "Gói Rau Củ Tươi Gia Đình (4 Tuần)",
  "weight_per_delivery": 3.5,
  "delivery_days": ["Tuesday", "Friday"],
  "delivery_address": "Landmark 81, Bình Thạnh, TP.HCM",
  "distance_km": 22.0,
  "start_date": "2026-11-20",
  "total_price": 1200000
}
```
* **Mock Response (`201 Created`):**
```json
{
  "status": "success",
  "message": "Đăng ký gói định kỳ thành công. Hệ thống sẽ tự động sinh đơn hàng vào 01:00 sáng Thứ Ba & Thứ Sáu hàng tuần.",
  "data": {
    "subscription_id": 12,
    "status": "dang_hoat_dong",
    "schedule": "2 lần/tuần (Thứ 3 & Thứ 6)"
  }
}
```

---

### A5. Thanh toán trực tuyến MoMo
Người 4 dùng API này để: **Lấy URL cổng thanh toán MoMo mở WebView hoặc chuyển hướng người dùng**.

* **Endpoint:** `POST /payments/momo/create-payment`
* **Request Body:** `{ "order_id": 8921 }`
* **Mock Response (`200 OK`):**
```json
{
  "status": "success",
  "data": {
    "pay_url": "https://test-payment.momo.vn/v2/gateway/api/create?orderId=ORD-8921&token=xyz...",
    "qr_code_url": "https://momo.vn/qr/pay-sample",
    "message": "Mở ứng dụng MoMo để quét mã thanh toán."
  }
}
```

---

### A6. Gửi yêu cầu Khiếu nại & Đổi trả kèm ảnh/video
Người 4 dùng API này để dựng: **Form khiếu nại nông sản dập nát trực tiếp trên đơn hàng**.

* **Endpoint:** `POST /complaints`
* **Headers:** `Authorization: Bearer <customer_token>`
* **Request Body:**
```json
{
  "order_id": 8921,
  "reason": "Rau xà lách bị dập nát lá khoảng 40% trong quá trình vận chuyển.",
  "evidence_media_urls": [
    "https://res.cloudinary.com/organic-farm/image/upload/v1731500001/rau_dap.jpg",
    "https://res.cloudinary.com/organic-farm/video/upload/v1731500002/video_mo_hop.mp4"
  ]
}
```
* **Mock Response (`201 Created`):**
```json
{
  "status": "success",
  "message": "Đã gửi yêu cầu khiếu nại. Nhân viên CSKH sẽ xử lý trong vòng 2 giờ.",
  "data": {
    "complaint_id": 5,
    "status": "cho_tiep_nhan"
  }
}
```

---

### A7. Điểm thưởng Khách hàng thân thiết (Loyalty)
Người 4 dùng API này để hiển thị: **Màn hình Ví điểm thưởng của khách**.

* **Endpoint:** `GET /customer/loyalty-points`
* **Mock Response (`200 OK`):**
```json
{
  "status": "success",
  "data": {
    "current_points": 150,
    "equivalent_vnd": 150000,
    "history": [
      { "action": "Hoàn tất đơn hàng ORD-8901", "points": "+50", "date": "2026-11-12" },
      { "action": "Trừ tiền đơn hàng ORD-8921", "points": "-50", "date": "2026-11-16" }
    ]
  }
}
```

---

# PHẦN B: BỘ API DÀNH CHO NGƯỜI 5 (OPERATIONS DASHBOARD - 3 CẤP QUYỀN)

### B1. Phân hệ Kỹ sư canh tác (Farm Staff Dashboard)
Người 5 dùng các API này để dựng: **Bảng quản lý lô hàng FEFO, Form đăng bài nhật ký canh tác và Form ghi nhận hao hụt xuất hủy**.

#### 1. Lấy danh sách Lô hàng & Khởi tạo Lô mới (FEFO)
* **Endpoint:** `GET /farm/batches` | `POST /farm/batches`
* **Mock Response (`200 OK`):**
```json
{
  "status": "success",
  "data": [
    {
      "id": 1,
      "batch_code": "BATCH-CC-20261110-01",
      "product_name": "Cà Chua Hữu Cơ VietGAP",
      "harvest_date": "2026-11-10",
      "expiry_date": "2026-11-20",
      "initial_quantity": 100.0,
      "current_quantity": 45.5,
      "wasted_quantity": 2.0,
      "status": "con_hang",
      "qr_code_download_url": "https://api.qrserver.com/v1/create-qr-code/?data=BATCH-CC-20261110-01"
    }
  ]
}
```

#### 2. Thêm bài đăng Nhật ký canh tác (Timeline)
* **Endpoint:** `POST /farm/farming-logs`
* **Request Body:**
```json
{
  "batch_id": 1,
  "stage": "tuoi_tieu",
  "title": "Tưới nước nhỏ giọt kết hợp vi sinh",
  "description": "Tưới nước qua hệ thống lọc định kỳ 2 tiếng/lần.",
  "media_urls": ["https://res.cloudinary.com/organic-farm/image/upload/sample_log.jpg"],
  "logged_at": "2026-11-16 14:00:00"
}
```

#### 3. Ghi nhận Xuất hủy / Hao hụt nội bộ
* **Endpoint:** `POST /farm/waste-records`
* **Request Body:**
```json
{
  "batch_id": 1,
  "quantity": 3.5,
  "reason": "Rau úng lá do mưa lớn kéo dài, xuất hủy trừ kho.",
  "evidence_image_url": "https://res.cloudinary.com/organic-farm/image/upload/waste.jpg"
}
```

---

### B2. Phân hệ Bán hàng & CSKH (Sales Dashboard)
Người 5 dùng các API này để dựng: **Quản lý đơn hàng hỏa tốc, Xử lý khiếu nại đổi trả và Cảnh báo Flash Sale xả hàng tồn**.

#### 1. Danh sách đơn hàng & Điều phối giao vận
* **Endpoint:** `GET /sales/orders` | `PATCH /sales/orders/{id}/dispatch`
* **Mock Response (`200 OK`):**
```json
{
  "status": "success",
  "data": [
    {
      "order_id": 8921,
      "order_code": "ORD-20261116-8921",
      "customer_name": "Nguyễn Văn Khách",
      "customer_phone": "0909123456",
      "delivery_address": "227 Nguyễn Văn Cừ, Quận 5",
      "distance_km": 18.5,
      "total_amount": 82500,
      "payment_status": "da_thanh_toan",
      "order_status": "cho_xac_nhan"
    }
  ]
}
```

#### 2. Cảnh báo Lô hàng sắp hết hạn & Cấu hình Flash Sale
* **Endpoint:** `GET /sales/alerts/near-expiry`
* **Mock Response (`200 OK`):**
```json
{
  "status": "success",
  "data": [
    {
      "batch_id": 2,
      "batch_code": "BATCH-BX-20261112",
      "product_name": "Cải Bó Xôi Organic",
      "days_left": 2,
      "remaining_stock": 20.0,
      "alert_message": "Lô hàng còn 2 ngày hết hạn! Đề xuất bật Flash Sale giảm giá 30%."
    }
  ]
}
```

#### 3. Duyệt khiếu nại (Hoàn tiền hoặc Tạo đơn giao bù 0đ)
* **Endpoint:** `PUT /sales/complaints/{id}/approve`
* **Request Body:**
```json
{
  "resolution_type": "giao_bu_hang",
  "sales_note": "Đã gọi điện xin lỗi khách hàng. Tạo đơn giao bù 2kg rau tươi giá 0đ vào chiều nay."
}
```

---

### B3. Phân hệ Quản trị viên (Admin Dashboard & Analytics)
Người 5 dùng API này để dựng: **Biểu đồ thống kê doanh thu, tỷ lệ hao hụt xuất hủy và tỷ lệ khách hàng mua lại (Chart.js / Recharts)**.

* **Endpoint:** `GET /admin/dashboard-stats`
* **Mock Response (`200 OK`):**
```json
{
  "status": "success",
  "data": {
    "summary": {
      "total_revenue": 145000000,
      "total_orders": 850,
      "waste_rate_percent": 3.8,
      "repeat_customer_rate_percent": 68.5
    },
    "revenue_by_month": [
      { "month": "Tháng 8", "revenue": 35000000 },
      { "month": "Tháng 9", "revenue": 42000000 },
      { "month": "Tháng 10", "revenue": 68000000 }
    ],
    "waste_by_category": [
      { "category": "Rau ăn lá", "wasted_kg": 45.0 },
      { "category": "Rau ăn quả", "wasted_kg": 12.0 },
      { "category": "Trái cây", "wasted_kg": 8.5 }
    ]
  }
}
```

---

# PHẦN C: BỘ API XÁC THỰC AUTH & UPLOAD MEDIA CLOUDINARY (NGƯỜI 1)
*(Các API đã hoàn thiện thực tế trong tuần 1, có thể gọi trực tiếp từ Backend)*

1. `GET /auth/guest-session`: Thông tin quyền hạn Khách vãng lai (Public).
2. `POST /auth/register`: Đăng ký tài khoản Khách hàng (Bcrypt + Sanctum Token).
3. `POST /auth/login`: Đăng nhập chung cho 4 vai trò, trả về `redirect_to`.
4. `GET /auth/me`: Lấy thông tin user đang đăng nhập (Check Token khi F5).
5. `POST /admin/staff-accounts`: Admin tạo tài khoản cho Farm Staff hoặc Sales.
6. `POST /media/upload`: Tải lên 1-5 file ảnh/video lên Cloudinary (Tối đa 50MB).
7. `POST /auth/logout`: Đăng xuất và hủy token.

---
*Tài liệu này là căn cứ chính thức để Người 4 và Người 5 dựng giao diện React.js ngay từ Tuần 1 mà không bị nghẽn tiến độ!*
