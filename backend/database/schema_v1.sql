-- Organic Farm E-Commerce Database Schema
CREATE DATABASE IF NOT EXISTS organic_farm_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE organic_farm_db;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('guest', 'customer', 'farm_staff', 'sales', 'admin') DEFAULT 'customer',
    phone VARCHAR(20),
    address TEXT,
    loyalty_points INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Products Table
CREATE TABLE IF NOT EXISTS products (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(100) NOT NULL,
    price DECIMAL(12, 2) NOT NULL,
    unit VARCHAR(50) NOT NULL DEFAULT 'kg',
    certification VARCHAR(100) DEFAULT 'VietGAP',
    description TEXT,
    image_url VARCHAR(500),
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Batches Table (FEFO Inventory)
CREATE TABLE IF NOT EXISTS batches (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    batch_code VARCHAR(100) NOT NULL UNIQUE,
    product_id BIGINT NOT NULL,
    initial_quantity INT NOT NULL,
    current_quantity INT NOT NULL,
    harvest_date DATE NOT NULL,
    expiration_date DATE NOT NULL,
    farm_location VARCHAR(255) DEFAULT 'Khu A - Nong trai Huu co',
    status ENUM('active', 'near_expiration', 'expired', 'disposed') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- 4. QR Codes Table
CREATE TABLE IF NOT EXISTS qr_codes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    batch_id BIGINT NOT NULL,
    qr_code_hash VARCHAR(255) NOT NULL UNIQUE,
    qr_image_url VARCHAR(500),
    scan_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE
);

-- 5. Farming Logs Table
CREATE TABLE IF NOT EXISTS farming_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    batch_id BIGINT NOT NULL,
    staff_id BIGINT NOT NULL,
    action_date DATE NOT NULL,
    stage VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    media_url VARCHAR(500),
    certification_doc VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE,
    FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 6. Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_code VARCHAR(100) NOT NULL UNIQUE,
    customer_id BIGINT NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL,
    shipping_fee DECIMAL(12, 2) DEFAULT 0.00,
    shipping_distance_km DECIMAL(8, 2) DEFAULT 0.00,
    shipping_address TEXT NOT NULL,
    payment_method ENUM('cod', 'momo', 'vnpay') DEFAULT 'momo',
    payment_status ENUM('pending', 'paid', 'failed') DEFAULT 'pending',
    order_status ENUM('pending', 'confirmed', 'shipping', 'completed', 'cancelled') DEFAULT 'pending',
    order_type ENUM('single', 'subscription') DEFAULT 'single',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 7. Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    batch_id BIGINT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE
);

-- 8. Subscriptions Table
CREATE TABLE IF NOT EXISTS subscriptions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    subscription_code VARCHAR(100) NOT NULL UNIQUE,
    customer_id BIGINT NOT NULL,
    package_name VARCHAR(255) NOT NULL,
    monthly_price DECIMAL(12, 2) NOT NULL,
    delivery_days VARCHAR(100) DEFAULT 'Tuesday,Friday',
    shipping_address TEXT NOT NULL,
    status ENUM('active', 'paused', 'cancelled') DEFAULT 'active',
    next_delivery_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 9. Loss Records Table
CREATE TABLE IF NOT EXISTS loss_records (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    batch_id BIGINT NOT NULL,
    staff_id BIGINT NOT NULL,
    quantity INT NOT NULL,
    reason VARCHAR(255) NOT NULL,
    disposed_at DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE,
    FOREIGN KEY (staff_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 10. Complaints Table
CREATE TABLE IF NOT EXISTS complaints (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT NOT NULL,
    customer_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    reason TEXT NOT NULL,
    evidence_image VARCHAR(500),
    status ENUM('pending', 'approved', 'rejected', 'refunded') DEFAULT 'pending',
    resolution_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 11. Flash Sales Table
CREATE TABLE IF NOT EXISTS flash_sales (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    batch_id BIGINT NOT NULL,
    discount_percent INT NOT NULL DEFAULT 30,
    original_price DECIMAL(12, 2) NOT NULL,
    sale_price DECIMAL(12, 2) NOT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE
);
