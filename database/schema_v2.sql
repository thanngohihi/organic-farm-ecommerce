--CREATE DATABASE IF NOT EXISTS organic_farm_ecommerce CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
--USE organic_farm_ecommerce;

-- 1. Bảng Roles: Phân tách rõ 5 vai trò để phù hợp với quy trình vận hành thực tế của nông trại
CREATE TABLE roles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE, -- guest, customer, farm_staff, sales, admin
    display_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL
);

-- 2. Bảng Users: Chứa thông tin tài khoản và tọa độ để hỗ trợ tính phí ship
CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    role_id BIGINT UNSIGNED NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    address TEXT NULL,
    latitude DECIMAL(10, 8) NULL, -- Tọa độ tính phí ship Google Maps
    longitude DECIMAL(11, 8) NULL,
    loyalty_points INT UNSIGNED DEFAULT 0, -- Tích lũy điểm thưởng sau mỗi đơn hàng thành công
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL
);

-- 3. Bảng Categories: Phân loại danh mục nông sản (Rau ăn lá, củ quả, trái cây...)
CREATE TABLE categories (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(150) NOT NULL UNIQUE, -- Tạo đường Link dẫn URL (vd đặt tên là rau-cu thì nó tạo là website.com/san-pham/rau-cu)
    description TEXT NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL
);

-- 4. Bảng Products: Thông tin sản phẩm chung (Không lưu tồn kho ở đây, tồn kho sẽ tính từ Lô/Batch)
CREATE TABLE products (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    category_id BIGINT UNSIGNED NOT NULL,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) NOT NULL UNIQUE,
    sku VARCHAR(50) NOT NULL UNIQUE, -- Đơn vị lưu kho, được sử dụng như 1 loại đóng gói/hộp có gram hoặc ký
    unit VARCHAR(50) NOT NULL, -- kg, bó, hộp, túi
    base_price DECIMAL(12, 2) NOT NULL,
    certification VARCHAR(100) NULL, -- VietGAP, USDA, GlobalGAP, Organic
    certification_doc_url VARCHAR(500) NULL, -- Link ảnh scan giấy kiểm định trên Cloudinary
    thumbnail_url VARCHAR(500) NULL,
    description TEXT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL
);

-- 5. Bảng Batches (CRUCIAL): Quản lý Tồn kho theo Lô thu hoạch & Hạn sử dụng, phục vụ nguyên tắc FEFO
CREATE TABLE batches (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    batch_code VARCHAR(50) NOT NULL UNIQUE, -- Mã lô in lên QR, VD: BATCH-RAU-20261113-01
    product_id BIGINT UNSIGNED NOT NULL,
    farm_staff_id BIGINT UNSIGNED NOT NULL, -- Nhân viên nông trại phụ trách canh tác
    harvest_date DATE NOT NULL, -- Ngày thu hoạch
    expiry_date DATE NOT NULL, -- Ngày hết hạn (cơ sở chạy thuật toán FEFO)
    initial_quantity DECIMAL(10, 2) NOT NULL, -- Sản lượng thu hoạch ban đầu
    current_quantity DECIMAL(10, 2) NOT NULL, -- Số lượng tồn kho thực tế hiện tại của lô
    wasted_quantity DECIMAL(10, 2) DEFAULT 0, -- Số lượng dập nát/xuất hủy
    is_flash_sale BOOLEAN DEFAULT FALSE, -- Cờ tự động bật khi lô hàng sắp hết hạn
    discount_percent INT UNSIGNED DEFAULT 0, -- % giảm giá xả hàng nhanh
    qr_code_url VARCHAR(500) NULL, -- Khách quét mã QR trên bao bì để xem thông tin Lô hàng
    status ENUM('con_hang', 'sap_het_han', 'qua_han', 'het_hang') DEFAULT 'con_hang',
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    INDEX idx_fefo (product_id, status, expiry_date, current_quantity)
);

-- 6. Bảng Farming Logs: Nhật ký canh tác lưu trữ dòng thời gian chăm sóc
CREATE TABLE farming_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    batch_id BIGINT UNSIGNED NOT NULL,
    farm_staff_id BIGINT UNSIGNED NOT NULL,
    stage ENUM('gieo_hat', 'bon_phan', 'tuoi_tieu', 'phong_tru_sau_benh', 'kiem_dinh', 'thu_hoach') NOT NULL, -- Gieo hạt, bón phân, tưới tiêu, thu hoạch...
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    media_urls JSON NULL, -- Mảng chứa các URL hình ảnh/video cập nhật từ nông trại (Cloudinary)
    soil_water_test_url VARCHAR(500) NULL, -- Bản scan kết quả test mẫu đất/nước định kỳ
    logged_at DATETIME NOT NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL
);

-- 7. Bảng Waste Records: Ghi nhận số lượng dập nát, hỏng hóc để trừ kho chính xác
CREATE TABLE waste_records (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    batch_id BIGINT UNSIGNED NOT NULL,
    recorded_by BIGINT UNSIGNED NOT NULL, -- Farm Staff hoặc Sales ghi nhận
    quantity DECIMAL(10, 2) NOT NULL,
    reason VARCHAR(255) NOT NULL, -- Héo, dập nát khi vận chuyển, quá hạn sử dụng
    evidence_image_url VARCHAR(500) NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL
);

-- 8. Bảng Subscriptions: Đăng ký “Gói rau củ theo tháng" tự động sinh đơn hàng theo lịch
CREATE TABLE subscriptions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id BIGINT UNSIGNED NOT NULL,
    package_name VARCHAR(150) NOT NULL, -- VD: Gói Rau Củ Gia Đình 4 Người - 3kg/lần
    weight_per_delivery DECIMAL(8, 2) NOT NULL, -- Khối lượng mỗi lần giao (kg)
    delivery_days JSON NOT NULL, -- Mảng ngày giao trong tuần, VD: ["Tuesday", "Friday"]
    delivery_address TEXT NOT NULL,
    distance_km DECIMAL(8, 2) NOT NULL,
    total_price DECIMAL(12, 2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status ENUM('dang_hoat_dong', 'tam_dung', 'da_huy', 'het_han') DEFAULT 'dang_hoat_dong',
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL
);

-- 9. Bảng Orders: Xử lý Đơn hàng lẻ & Đơn hàng tự sinh từ Subscription
CREATE TABLE orders (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_code VARCHAR(50) NOT NULL UNIQUE,
    customer_id BIGINT UNSIGNED NOT NULL,
    subscription_id BIGINT UNSIGNED NULL, -- NULL nếu mua lẻ, có ID nếu tự sinh từ gói định kỳ
    delivery_address TEXT NOT NULL, -- Địa chỉ giao hàng
    distance_km DECIMAL(8, 2) NOT NULL, -- Khoảng cách (km) thực tế từ Farm đến địa chỉ giao
    subtotal DECIMAL(12, 2) NOT NULL, -- Tạm tính
    shipping_fee DECIMAL(12, 2) NOT NULL, -- Tính phí vận chuyển dựa trên khoảng cách km (phí ship động)
    loyalty_discount DECIMAL(12, 2) DEFAULT 0, -- Trừ tiền bằng điểm tích lũy
    total_amount DECIMAL(12, 2) NOT NULL, -- Số tiền thực tế phải trả
    payment_method ENUM('cod', 'momo', 'vnpay') NOT NULL DEFAULT 'momo', -- Tích hợp thanh toán online
    payment_status ENUM('cho_thanh_toan', 'da_thanh_toan', 'that_bai', 'da_hoan_tien') DEFAULT 'cho_thanh_toan',
    momo_trans_id VARCHAR(100) NULL, -- Mã giao dịch trả về từ Webhook IPN MoMo
    order_status ENUM('cho_xac_nhan', 'da_xac_nhan', 'dang_giao_hang', 'hoan_thanh', 'da_huy', 'da_giao_bu') DEFAULT 'cho_xac_nhan',
    delivery_partner VARCHAR(50) NULL, -- Tích hợp API giao hàng hỏa tốc (Ahamove, Lalamove, GrabExpress...)
    delivery_tracking_url VARCHAR(500) NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL
);

-- 10. Bảng Order Items: Chi tiết đơn hàng bắt buộc liên kết với Lô (Batch) để xuất kho FEFO
CREATE TABLE order_items (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT UNSIGNED NOT NULL,
    product_id BIGINT UNSIGNED NOT NULL,
    batch_id BIGINT UNSIGNED NOT NULL, -- Xuất từ lô nào (áp dụng tự động xuất kho theo FEFO)
    quantity DECIMAL(10, 2) NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    total_price DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL
);

-- 11. Bảng Complaints: Khách hàng gửi yêu cầu xử lý/Hoàn tiền do nông sản dễ dập nát
CREATE TABLE complaints (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT UNSIGNED NOT NULL,
    customer_id BIGINT UNSIGNED NOT NULL,
    handled_by_sales_id BIGINT UNSIGNED NULL, -- Nhân viên Sales/CSKH duyệt khiếu nại
    reason TEXT NOT NULL, -- Lý do viết
    evidence_media_urls JSON NOT NULL, -- Bắt buộc đính kèm hình ảnh/video bằng chứng
    resolution_type ENUM('cho_xu_ly', 'hoan_tien', 'giao_bu_hang', 'tu_choi') DEFAULT 'cho_xu_ly', -- Duyệt hoàn tiền hoặc tạo đơn giao bù
    refund_amount DECIMAL(12, 2) DEFAULT 0,
    compensation_order_id BIGINT UNSIGNED NULL, -- ID đơn hàng giao bù giá 0đ
    sales_note TEXT NULL,
    status ENUM('cho_tiep_nhan', 'dang_xu_ly', 'da_hoan_tat', 'tu_choi') DEFAULT 'cho_tiep_nhan',
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL
);



-- Khóa ngoại bảng Users
ALTER TABLE users ADD CONSTRAINT fk_users_roles FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT;

-- Khóa ngoại bảng Products
ALTER TABLE products ADD CONSTRAINT fk_products_categories FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE;

-- Khóa ngoại bảng Batches
ALTER TABLE batches 
    ADD CONSTRAINT fk_batches_products FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_batches_users FOREIGN KEY (farm_staff_id) REFERENCES users(id) ON DELETE RESTRICT;

-- Khóa ngoại bảng Farming Logs
ALTER TABLE farming_logs 
    ADD CONSTRAINT fk_farminglogs_batches FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_farminglogs_users FOREIGN KEY (farm_staff_id) REFERENCES users(id) ON DELETE RESTRICT;

-- Khóa ngoại bảng Waste Records
ALTER TABLE waste_records 
    ADD CONSTRAINT fk_wasterecords_batches FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_wasterecords_users FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE RESTRICT;

-- Khóa ngoại bảng Subscriptions
ALTER TABLE subscriptions ADD CONSTRAINT fk_subscriptions_users FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE;

-- Khóa ngoại bảng Orders
ALTER TABLE orders 
    ADD CONSTRAINT fk_orders_users FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_orders_subscriptions FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL;

-- Khóa ngoại bảng Order Items
ALTER TABLE order_items 
    ADD CONSTRAINT fk_orderitems_orders FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_orderitems_products FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_orderitems_batches FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE RESTRICT;

-- Khóa ngoại bảng Complaints
ALTER TABLE complaints 
    ADD CONSTRAINT fk_complaints_orders FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_complaints_users FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_complaints_handledby FOREIGN KEY (handled_by_sales_id) REFERENCES users(id) ON DELETE SET NULL;