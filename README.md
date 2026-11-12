### 📄 Toàn bộ nội dung file `README.md` (Bấm Copy ô dưới đây):

```
# 🌾 Website Thương Mại Điện Tử Nông Sản Sạch (Organic Farm Ecommerce)

&gt; **Mô hình:** Nền tảng Thương mại điện tử chuyên biệt dành riêng cho 1 Nông trại (Single Farm Model) kết nối trực tiếp Nông trại đến bàn ăn.  
&gt; **Trọng tâm đề tài:** Quản lý tồn kho theo Lô (Batch), tự động xuất kho theo nguyên tắc **FEFO**, truy xuất nguồn gốc bằng **Mã QR &amp; Nhật ký canh tác**, đặt hàng định kỳ (**Subscription**) và tính phí vận chuyển động theo kilomet.

---

## 📌 1. Giới Thiệu Dự Án &amp; Bài Toán Cốt Lõi

Dự án giải quyết bài toán vận hành thực tế của nông sản tươi sống từ gieo trồng đến tận tay người tiêu dùng:
* **Tầng vĩ mô (Thị trường):** Đáp ứng nhu cầu thực phẩm sạch ngày càng tăng, giải quyết tình trạng mập mờ nguồn gốc và hàng kém chất lượng.
* **Tầng trung gian (Chuỗi cung ứng):** Cắt giảm các khâu trung gian giúp tối ưu chi phí và rút ngắn thời gian lưu kho.
* **Tầng vi mô (Nông trại):** Giúp nông trại minh bạch quy trình trồng trọt; tự động hóa cảnh báo hạn sử dụng và xuất kho FEFO nhằm giảm thiểu tối đa tỷ lệ hàng hỏng/dập nát và hao hụt nội bộ.
* **Giải pháp:** Nền tảng TMĐT khép kín tích hợp **Nhật ký canh tác**, **Quản lý kho theo Lô (Batch)**, xuất kho **FEFO**, **QR Code truy xuất nguồn gốc**, **Gói nông sản định kỳ (Subscription)** và **Cảnh báo Flash Sale xả hàng sắp hết hạn**.

---

## 🛠️ 2. Công Nghệ Sử Dụng (Tech Stack)

* **Backend Framework:** Laravel (PHP)
* **Frontend Framework:** React.js + Tailwind CSS (Vite, Shadcn UI / Flowbite React, Lucide-react)
* **Database &amp; Storage:** MySQL (DBeaver / MySQL Workbench), Cloudinary API (Lưu trữ ảnh/video chất lượng cao)
* **Thư viện chuyên dụng:**
  * **Backend:** Laravel Sanctum (Token Auth), Spatie Laravel-Permission (Phân quyền 5 roles), simplesoftwareio/simple-qrcode (Sinh mã QR), L5-Swagger / Postman.
  * **Frontend:** html5-qrcode / react-qr-reader (Quét QR trực tiếp), Chart.js (react-chartjs-2) / Recharts (Biểu đồ Thống kê).
* **Tích hợp bên thứ ba (Third-party Integrations):**
  * Cổng thanh toán trực tuyến MoMo API (Sandbox + Webhook IPN).
  * Google Distance Matrix API (Tính khoảng cách km &amp; phí ship động).
* **Triển khai (Deployment):**
  * Backend &amp; Database: [suspicious link removed] / Railway.app
  * Frontend React: Vercel / Netlify

---

## 👥 3. Phân Công Khối Lượng Công Việc Cho 5 Thành Viên

Khối lượng công việc được chia đều gồm **3 người làm Backend** và **2 người làm Frontend** nhằm tránh chồng chéo:

| STT | Thành Viên | Vai Trò Chính | Nhiệm Vụ &amp; Module Chức Năng Cụ Thể |
| :---: | :--- | :--- | :--- |
| **1** | **[Thành viên 1]** | **Backend Lead**<br />*(Core System, Auth &amp; Payment)* | - Thiết kế Schema CSDL (`schema_v1.sql`), Migration &amp; kết nối Cloudinary API.<br />- Viết API Đăng ký, Đăng nhập, phân quyền 5 Roles (`Sanctum` + `Spatie Permission`).<br />- Viết API Specification (`swagger.json` / Postman Collection) cho Frontend làm Mock Data.<br />- Tích hợp Service Thanh toán MoMo API (Tạo link thanh toán, xử lý Webhook IPN). |
| **2** | **[Thành viên 2]** | **Backend Dev 1**<br />*(Nguồn gốc, FEFO &amp; Thống kê)* | - Viết API Nhật ký canh tác (Farming Logs) &amp; Minh bạch giấy tờ kiểm định.<br />- Viết API sinh và quét Mã QR truy xuất nguồn gốc (`simple-qrcode`).<br />- Lập trình thuật toán Quản lý kho theo Lô (Batch) &amp; xuất kho tự động **FEFO** (`ngay_het_han` gần nhất).<br />- Viết API ghi nhận Xuất hủy/Hao hụt nội bộ.<br />- Cấu hình Cron-job tự động phát cảnh báo Flash Sale cho lô cận hạn (dưới 3 ngày) và API Admin Dashboard Thống kê. |
| **3** | **[Thành viên 3]** | **Backend Dev 2**<br />*(Đơn hàng, Subscription &amp; Maps API)* | - Viết API Giỏ hàng, Đặt hàng lẻ và Tích điểm thành viên (Loyalty).<br />- Lập trình logic Gói nông sản định kỳ (**Subscription**) + Cron-job tự động sinh đơn hàng theo lịch (01:00 Thứ 3 &amp; Thứ 6).<br />- Tích hợp Google Distance Matrix API tính khoảng cách km và phí ship động thực tế.<br />- Viết API tiếp nhận và xử lý Khiếu nại / Hoàn tiền. |
| **4** | **[Thành viên 4]** | **Frontend Dev 1**<br />*(Customer App)* | - Xây dựng giao diện Responsive chuẩn Mobile-first cho Khách hàng (`React.js` + `Tailwind CSS`).<br />- Trang chủ, Trang Câu chuyện thương hiệu, Form Đăng ký/Đăng nhập.<br />- Giao diện Danh mục &amp; Lọc sản phẩm theo chứng nhận (VietGAP/USDA).<br />- Giao diện Chi tiết sản phẩm &amp; Quét mã QR xem Nhật ký canh tác.<br />- Giỏ hàng, Đặt hàng lẻ (tính ship động), Đăng ký Gói rau củ định kỳ, Thanh toán MoMo &amp; Form gửi Khiếu nại đính kèm ảnh/video. |
| **5** | **[Thành viên 5]** | **Frontend Dev 2**<br />*(Admin &amp; Operations UI)* | - Xây dựng giao diện Dashboard nội bộ phân cấp 3 quyền (Sidebar Menu).<br />- **Dashboard Farm Staff:** Form đăng nhật ký canh tác (ảnh/video), Form khởi tạo Lô FEFO, In mã QR trực tiếp, Form ghi nhận hao hụt.<br />- **Dashboard Sales:** Quản lý/xác nhận đơn hỏa tốc, Duyệt khiếu nại (hoàn tiền / giao bù 0đ).<br />- **Dashboard Admin:** Biểu đồ thống kê doanh thu, tỷ lệ hao hụt, tỷ lệ khách mua lại (`Chart.js`). |

---

## 🔑 4. Phân Quyền 5 Vai Trò Người Dùng (User Roles)

1. **Khách vãng lai (Guest):** Xem sản phẩm, lọc theo chứng nhận (VietGAP, USDA...), xem câu chuyện thương hiệu nông trại.
2. **Khách hàng (Customer):** Mua lẻ / Đăng ký Gói định kỳ (Subscription), tích điểm thành viên, quét QR truy xuất, thanh toán MoMo và gửi khiếu nại đính kèm bằng chứng.
3. **Nhân viên Nông trại (Farm Staff):** Cập nhật nhật ký canh tác (ảnh/video), nhập thông tin lô hàng FEFO, in mã QR và ghi nhận xuất hủy hao hụt.
4. **Nhân viên Bán hàng (Sales):** Xác nhận &amp; điều phối đơn hỏa tốc, xử lý khiếu nại (hoàn tiền / đổi trả), cấu hình Flash Sale cho lô cận hạn.
5. **Quản trị viên (Admin):** Toàn quyền hệ thống, quản lý tài khoản 5 roles, xem báo cáo thống kê doanh thu và tỷ lệ hao hụt.

---

## 📅 5. Tiến Độ Triển Khai Chi Tiết Theo 4 Tuần

* **TUẦN 1: CHUẨN HÓA SCHEMA CSDL VÀ BASE FRONTEND**
  * Backend: Thiết kế CSDL (`schema_v1.sql`), Migration, Auth 5 roles, xuất API Spec (`swagger.json`/Postman), kết nối Cloudinary.
  * Frontend: Dựng khung project React.js + Tailwind CSS, kết nối Auth UI, dựng Mock Data.
* **TUẦN 2: GHÉP NỐI MODULE KHO, NGUỒN GỐC VÀ ĐƠN HÀNG LẺ**
  * Backend: API Nhật ký canh tác, sinh mã QR, xuất kho FEFO, báo xuất hủy; API Đơn hàng lẻ &amp; Google Maps API tính ship.
  * Frontend: UI Lọc sản phẩm VietGAP/USDA, Chi tiết &amp; Quét QR nguồn gốc, Giỏ hàng &amp; Ship động; Dashboard Farm Staff (nhập lô FEFO, in QR, xuất hủy).
* **TUẦN 3: SUBSCRIPTION, CSKH, THANH TOÁN VÀ THỐNG KÊ**
  * Backend: Tích hợp MoMo Payment (IPN); Cron-job Flash Sale &amp; Subscription (Thứ 3 &amp; Thứ 6); API khiếu nại &amp; Admin Stats.
  * Frontend: UI Đăng ký Gói định kỳ theo tháng, Thanh toán MoMo, Form khiếu nại đính kèm ảnh/video; Dashboard Sales (duyệt khiếu nại) &amp; Dashboard Admin (Chart.js).
* **TUẦN 4: KIỂM THỬ LIÊN THÔNG END-TO-END VÀ TỐI ƯU NGHIỆM THU**
  * Cả nhóm: Kiểm thử luồng liên thông thực tế (Farm Staff nhập lô -&gt; Khách quét QR -&gt; Đặt Subscription -&gt; Thanh toán MoMo -&gt; Sales duyệt -&gt; Khách khiếu nại -&gt; Admin xem thống kê).
  * Deploy: Backend/MySQL lên Render/Railway, Frontend lên Vercel/Netlify. Hoàn thiện Báo cáo Word và Slide.

---

## 🚀 6. Hướng Dẫn Khởi Chạy Dự Án (Local Setup)

### Yêu cầu môi trường
* PHP (&gt;= 8.1) &amp; Composer (cho Laravel)
* Node.js (&gt;= 18.x) &amp; npm (cho React.js)
* MySQL Server (XAMPP / Laragon / Docker)

### Các bước cài đặt

#### 1. Clone repository về máy cá nhân
git clone https://github.com/thanngohihi/organic-farm-ecommerce

cd organic-farm-ecommerce

\#### 2\. Cấu hình Backend (Laravel)

cd backend

composer install

cp .env.example .env

php artisan key:generate

php artisan migrate --seed

php artisan serve

\#### 3\. Cấu hình Frontend (React.js)

cd ../frontend

npm install

npm run dev

#### **1\. Quy Trình Tạo Nhánh, Commit và Push Code Lên GitHub**

Khi các thành viên làm việc, hãy làm theo đúng 5 câu lệnh Git sau:

* **Bước 1: Cập nhật code mới nhất từ nhánh** **main** **về máy**

```
git checkout main
git pull origin main

```

* **Bước 2: Tạo nhánh riêng cho tính năng bạn làm**

```
git checkout -b feature/fefo-inventory

```

*(Thay* *feature/fefo-inventory* *bằng tên tính năng của bạn, ví dụ:* *feature/customer-cart* *)*.

* **Bước 3: Lưu lại thay đổi sau khi viết code xong**

```
git add .
git commit -m "Add: Thuat toan xuat kho FEFO"

```

* **Bước 4: Đẩy nhánh của bạn lên GitHub**

```
git push origin feature/fefo-inventory

```

* **Bước 5: Gộp code vào nhánh** **main** **(Pull Request)**
  1. Vào địa chỉ trang Web GitHub dự án.
  2. Bấm nút màu vàng **Compare &amp; pull request** xuất hiện trên màn hình.
  3. Nhấn **Create pull request** \-&gt; Trưởng nhóm duyệt và bấm **Merge pull request** để hoàn tất.

---

#### **2\. Cách Chạy Thử Chương Trình Trên Máy Cá Nhân (Local)**

Mở **2 cửa sổ Terminal** trong VS Code để chạy đồng thời cả Backend và Frontend:

* **Terminal 1 (Backend - Laravel):**

```
cd backend
composer install
php artisan migrate --seed
php artisan serve

```

👉 Server Backend sẽ chạy tại địa chỉ: `[suspicious link removed]`

* **Terminal 2 (Frontend - React.js):**

```
cd frontend
npm install
npm run dev

```

👉 Web Frontend sẽ chạy tại địa chỉ: `http://localhost:5173` (Giữ Ctrl và click vào link để mở trang web trên trình duyệt).

