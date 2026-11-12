# 🌱 Organic Farm E-Commerce - Website Thương Mại Điện Tử Nông Sản Sạch

## 📖 1. Giới Thiệu Dự Án

**Organic Farm E-Commerce** là nền tảng thương mại điện tử khép kín (Single-Farm) kết nối trực tiếp từ nông trại đến bàn ăn. Dự án được thiết kế để giải quyết các bài toán đặc thù trong chuỗi cung ứng nông sản tươi sống:

* **Minh bạch nguồn gốc:** Khách hàng dễ dàng kiểm chứng quy trình trồng trọt, giấy kiểm định chất lượng và nhật ký chăm sóc thông qua mã QR trên từng lô hàng.

* **Tối ưu vòng đời sản phẩm:** Quản lý kho nghiêm ngặt theo từng Lô thu hoạch (Batch) và tự động xuất kho theo nguyên tắc **FEFO** (*First Expired, First Out* - Hết hạn trước, xuất trước) nhằm giảm thiểu tỷ lệ hư hỏng, dập nát.

* **Tiện lợi & Giao nhận hỏa tốc:** Hỗ trợ mua lẻ hoặc đăng ký gói rau củ định kỳ (Subscription) tự động lên đơn, kết hợp tính phí vận chuyển động theo khoảng cách thực tế.

## 🛠 2. Công Nghệ Sử Dụng (Tech Stack)

| Phân hệ | Công nghệ / Thư viện | Mục đích sử dụng | 
| ----- | ----- | ----- | 
| **Backend** | **Laravel (PHP)**, Laravel Sanctum, Spatie Permission | Xây dựng RESTful API, xác thực Token, phân quyền 5 roles, xử lý Cron-job (FEFO, Flash Sale, Subscription). | 
| **Frontend** | **React.js (Vite)**, Tailwind CSS, Shadcn UI / Flowbite, Lucide Icons | Giao diện tối giản chuẩn **Mobile-first** cho khách hàng và Dashboard quản trị nội bộ. | 
| **Database** | **MySQL** | Lưu trữ dữ liệu quan hệ (Sản phẩm, Lô hàng, Nhật ký, Đơn hàng, Khiếu nại...). | 
| **Media Storage** | **Cloudinary API** | Lưu trữ hình ảnh, video độ phân giải cao cho nhật ký canh tác, chứng nhận và bằng chứng khiếu nại. | 
| **Third-Party APIs** | **MoMo Payment Sandbox**, **Google Distance Matrix API** | Cổng thanh toán trực tuyến (Webhook IPN) và tính phí vận chuyển động theo số km thực tế. | 
| **QR & Charts** | `simple-qrcode`, `html5-qrcode`, `Recharts` / `Chart.js` | Tạo mã QR tự động từ Backend, quét mã bằng camera trên Web và vẽ biểu đồ thống kê doanh thu/hao hụt. | 

## 👥 3. Phân Quyền Hệ Thống (5 User Roles)

Hệ thống phân tách chặt chẽ quyền truy cập và luồng nghiệp vụ cho 5 nhóm đối tượng:

1. **Khách vãng lai (Guest):** Xem danh mục sản phẩm, câu chuyện thương hiệu, quét mã QR xem thông tin minh bạch kiểm định.

2. **Khách hàng (Customer):** Mua hàng lẻ, đăng ký gói rau củ định kỳ, thanh toán trực tuyến, tích điểm thân thiết (Loyalty) và gửi yêu cầu khiếu nại/đổi trả kèm hình ảnh/video.

3. **Nhân viên Nông trại (Farm Staff):** Quản lý mùa vụ, cập nhật nhật ký canh tác (Timeline), khởi tạo lô thu hoạch (Batch) và in mã QR truy xuất nguồn gốc. *(Không có quyền xem dữ liệu doanh thu/khách hàng)*.

4. **Nhân viên Bán hàng / CSKH (Sales):** Duyệt và điều phối đơn giao hỏa tốc, xử lý khiếu nại (duyệt hoàn tiền hoặc tạo đơn giao bù $0\text{đ}$).

5. **Quản trị viên (Admin):** Toàn quyền quản trị hệ thống, cấu hình phân quyền, theo dõi báo cáo thống kê (doanh thu, tỷ lệ hao hụt xuất hủy, tỷ lệ khách quay lại).

## ✨ 4. Các Tính Năng Nổi Bật (Phạm Vi MoSCoW)

### 🔴 Must-Have (Chức năng cốt lõi)

* **Quản lý kho theo Lô (Batch) & Nguyên tắc FEFO:** Mỗi sản phẩm được quản lý theo từng lô có `ngày_thu_hoạch` và `ngày_hết_hạn`. Khi phát sinh đơn hàng, hệ thống tự động trừ tồn kho ở lô có hạn sử dụng gần nhất.

* **Truy xuất nguồn gốc qua QR Code:** Tự động sinh mã QR cho từng lô hàng. Khi quét mã, hệ thống hiển thị chi tiết người phụ trách, ngày thu hoạch, hạn sử dụng và các chứng nhận (VietGAP, USDA).

* **Ghi nhận Xuất hủy / Hao hụt:** Cho phép ghi nhận số lượng nông sản hư hỏng trong quá trình bảo quản để trừ kho chính xác và phục vụ thống kê.

* **Luồng mua sắm cơ bản:** Tìm kiếm, lọc theo chứng nhận, giỏ hàng, đặt hàng và thanh toán.

### 🟡 Should-Have (Chức năng nâng cao)

* **Gói Nông sản Định kỳ (Subscription Box):** Khách hàng đăng ký gói rau củ theo tháng (VD: giao vào Thứ 3 & Thứ 6 hàng tuần). Hệ thống chạy **Cron-Job** tự động khởi tạo đơn hàng theo lịch hẹn.

* **Nhật ký canh tác (Farming Log):** Dòng thời gian trực quan (gieo hạt, bón phân, tưới tiêu, thu hoạch) đính kèm ảnh/video thực tế từ nông trại.

* **CSKH & Xử lý Khiếu nại:** Khách hàng gửi yêu cầu hoàn tiền/đổi trả bắt buộc kèm ảnh/video thực tế; Sales kiểm duyệt và xử lý trực tiếp trên Dashboard.

* **Chương trình Khách hàng thân thiết (Loyalty):** Tự động tích lũy điểm thưởng sau mỗi đơn hàng hoàn tất.

### 🟢 Could-Have (Tính năng mở rộng)

* **Tự động cảnh báo Xả hàng (Flash Sale):** Job chạy ngầm lúc `00:00` mỗi ngày để quét các lô hàng còn dưới 3 ngày sử dụng, tự động gắn cờ giảm giá nhanh.

* **Phí vận chuyển động (Dynamic Shipping):** Tích hợp Google Maps API tính khoảng cách thực tế ($\text{km}$) từ nông trại đến địa chỉ nhận hàng để tính phí giao hỏa tốc nội thành.

* **Thanh toán trực tuyến MoMo:** Tích hợp cổng thanh toán MoMo và xử lý trạng thái đơn hàng tự động qua Webhook IPN.

## 🚀 5. Hướng Dẫn Cài Đặt & Chạy Dự Án (Local Development)

### Yêu cầu môi trường

* PHP $\ge 8.1$, Composer

* Node.js $\ge 18.x$, NPM / Yarn

* MySQL $\ge 8.0$

### Bước 1: Clone dự án

```bash
git clone https://github.com/your-username/organic-farm-ecommerce.git
cd organic-farm-ecommerce
```

### Bước 2: Cài đặt Backend (Laravel)

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
```

*Cấu hình các biến môi trường trong file `.env`:*

```env
DB_DATABASE=organic_farm_db
DB_USERNAME=root
DB_PASSWORD=

CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME
GOOGLE_MAPS_API_KEY=your_google_maps_key
MOMO_PARTNER_CODE=your_momo_partner_code
MOMO_ACCESS_KEY=your_momo_access_key
MOMO_SECRET_KEY=your_momo_secret_key
```

*Khởi tạo cơ sở dữ liệu và dữ liệu mẫu:*

```bash
php artisan migrate --seed
php artisan serve
```

### Bước 3: Chạy Task Scheduler (Cron-job cho FEFO, Flash Sale & Subscription)

Mở một terminal mới tại thư mục `backend` và chạy lệnh:

```bash
php artisan schedule:work
```

### Bước 4: Cài đặt Frontend (React + Vite)

```bash
cd ../frontend
npm install
cp .env.example .env
```

*Cấu hình URL API trong `.env`:*

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

*Khởi chạy ứng dụng:*

```bash
npm run dev
```

## 🔀 6. Quy Trình Làm Việc Với Git (Dành Cho Thành Viên Nhóm)

Để tránh xung đột mã nguồn (Conflict) khi 5 thành viên cùng phát triển song song, nhóm áp dụng quy trình Git chuẩn sau đây:

### 6.1. Quy tắc đặt tên nhánh (Branch Naming Convention)

Tuyệt đối **không** code trực tiếp trên nhánh `main` hoặc `develop`. Mỗi tính năng/sửa lỗi phải tạo một nhánh riêng từ nhánh `develop` theo cú pháp:

* **Tính năng mới:** `feature/<ten-thanh-vien>-<ten-tinh-nang>`
  * *Ví dụ:* `feature/tv1-auth-momo`, `feature/tv2-fefo-qrcode`, `feature/tv4-customer-ui`
* **Sửa lỗi (Bugfix):** `fix/<ten-thanh-vien>-<mo-ta-loi>`
  * *Ví dụ:* `fix/tv3-shipping-fee-api`

### 6.2. Các bước thực hiện hàng ngày

#### Bước 1: Lấy dự án về máy (Chỉ làm 1 lần đầu tiên)

```bash
git clone https://github.com/your-username/organic-farm-ecommerce.git
cd organic-farm-ecommerce
```

#### Bước 2: Cập nhật code mới nhất từ nhánh chung (`develop`)

Trước khi bắt đầu code một tính năng mới, luôn kéo code mới nhất từ nhánh `develop` về máy:

```bash
git checkout develop
git pull origin develop
```

#### Bước 3: Tạo nhánh mới và chuyển sang nhánh đó

```bash
git checkout -b feature/ten-cua-ban-ten-tinh-nang
```
*(Kiểm tra xem mình đã đứng đúng nhánh chưa bằng lệnh `git branch`)*

#### Bước 4: Lưu thay đổi (Commit) và Đẩy code lên GitHub (Push)

Sau khi hoàn thành công việc hoặc cuối ngày làm việc:

```bash
# 1. Kiểm tra các file đã thay đổi
git status

# 2. Thêm tất cả file thay đổi vào vùng chờ
git add .

# 3. Lưu lại lịch sử thay đổi với thông điệp rõ ràng
git commit -m "feat: hoàn thành API xuất kho FEFO"

# 4. Đẩy nhánh của bạn lên GitHub
git push -u origin feature/ten-cua-ban-ten-tinh-nang
```

#### Bước 5: Tạo Pull Request (PR) để gộp code

1. Truy cập vào repository dự án trên **GitHub**.
2. Chọn tab **Pull requests** $\rightarrow$ Bấm **New pull request**.
3. Chọn nhánh đích (`base`) là **`develop`** và nhánh nguồn (`compare`) là **nhánh bạn vừa push**.
4. Nhập tiêu đề, mô tả ngắn gọn các chức năng đã làm và bấm **Create pull request**.
5. Thông báo cho nhóm trưởng (hoặc thành viên phụ trách review) kiểm tra và bấm **Merge pull request**.

> ⚠️ **Lưu ý quan trọng:** Nếu trong lúc làm việc có người khác vừa merge code mới vào `develop`, hãy chạy lệnh `git pull origin develop` ngay tại nhánh của bạn để đồng bộ và xử lý conflict (nếu có) trước khi tạo Pull Request.

## 📅 7. Lộ Trình Phát Triển & Phân Công Nhóm (5 Thành Viên)

Dự án được triển khai trong **4 Tuần** với cơ cấu **3 Backend** và **2 Frontend**:

* **Tuần 1 - Chuẩn hóa Schema CSDL & Base UI:** Thiết kế ERD, dựng khung Backend/Frontend, thống nhất tài liệu API Specification (Swagger/Postman) và hoàn thiện hệ thống Auth phân quyền 5 roles.

* **Tuần 2 - Core Features (Kho FEFO, QR Code & Đơn lẻ):** Hoàn thiện API & UI Nhật ký canh tác, tạo/quét mã QR, thuật toán xuất kho FEFO, ghi nhận hao hụt và tính phí ship động qua Google Maps.

* **Tuần 3 - Nghiệp vụ Nâng cao & Thanh toán:** Tích hợp cổng thanh toán MoMo (IPN), Cron-job sinh đơn định kỳ (Subscription), cảnh báo Flash Sale, luồng khiếu nại CSKH và biểu đồ thống kê Admin.

* **Tuần 4 - Kiểm thử End-to-End & Nghiệm thu:** Chạy kiểm thử liên thông toàn bộ quy trình từ Nông trại $\rightarrow$ Khách hàng $\rightarrow$ Sales $\rightarrow$ Admin, tối ưu tốc độ tải trang và triển khai (Deploy).

### Phân công chi tiết:

| Thành viên | Vai trò | Phạm vi phụ trách chính | 
| ----- | ----- | ----- | 
| **Thành viên 1** | Backend Lead | Thiết kế Schema CSDL, Auth & Phân quyền 5 roles, tích hợp Cloudinary & Cổng thanh toán MoMo. | 
| **Thành viên 2** | Backend Dev 1 | API Nhật ký canh tác, sinh mã QR, thuật toán kho FEFO, cảnh báo Flash Sale & API Thống kê Admin. | 
| **Thành viên 3** | Backend Dev 2 | API Giỏ hàng, Đơn lẻ, Gói định kỳ (Cron-job), Loyalty, Google Maps API & Xử lý khiếu nại. | 
| **Thành viên 4** | Frontend Dev 1 | Giao diện Mobile-first cho Khách hàng (Trang chủ, Quét QR, Giỏ hàng, Thanh toán, Khiếu nại). | 
| **Thành viên 5** | Frontend Dev 2 | Hệ thống Dashboard nội bộ cho Farm Staff (Nhập lô/In QR), Sales (Duyệt đơn/Khiếu nại) & Admin (Báo cáo). | 

## 📄 8. Tài Liệu Tham Khảo & Kiểm Thử API

* Tài liệu đặc tả API (Postman Collection / Swagger JSON): `/docs/api-specification.json`

* Sơ đồ thiết kế Cơ sở dữ liệu (ERD & SQL Dump): `/docs/database_schema.sql`