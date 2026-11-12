-- DATABASE SCHEMA: Website Thuong mai dien tu Nong san sach (Organic Farm)

CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) UNIQUE NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(20) NULL,
  `address` VARCHAR(500) NULL,
  `role` ENUM('guest', 'customer', 'farm_staff', 'sales', 'admin') DEFAULT 'customer',
  `loyalty_points` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `products` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(255) UNIQUE NOT NULL,
  `description` TEXT NULL,
  `price` DECIMAL(12,2) NOT NULL,
  `unit` VARCHAR(50) NOT NULL,
  `certification` VARCHAR(100) DEFAULT 'VietGAP',
  `image_url` VARCHAR(500) NULL,
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `batches` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `batch_code` VARCHAR(100) UNIQUE NOT NULL,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `harvest_date` DATE NOT NULL,
  `expiration_date` DATE NOT NULL,
  `initial_quantity` INT NOT NULL,
  `current_quantity` INT NOT NULL,
  `farmer_name` VARCHAR(255) NULL,
  `qr_code_path` VARCHAR(500) NULL,
  `is_flash_sale` BOOLEAN DEFAULT FALSE,
  `discount_percent` INT DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `farming_logs` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `batch_id` BIGINT UNSIGNED NOT NULL,
  `stage` ENUM('gieo_hat', 'cham_soc', 'phun_phan_huu_co', 'thu_hoach', 'kiem_dinh') NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `media_urls` JSON NULL,
  `logged_by` BIGINT UNSIGNED NOT NULL,
  `logged_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`logged_by`) REFERENCES `users`(`id`)
);

CREATE TABLE IF NOT EXISTS `orders` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `order_code` VARCHAR(100) UNIQUE NOT NULL,
  `customer_id` BIGINT UNSIGNED NOT NULL,
  `shipping_address` VARCHAR(500) NOT NULL,
  `distance_km` DECIMAL(8,2) DEFAULT 0,
  `shipping_fee` DECIMAL(12,2) DEFAULT 0,
  `total_amount` DECIMAL(12,2) NOT NULL,
  `payment_method` ENUM('cod', 'momo', 'vnpay') DEFAULT 'cod',
  `payment_status` ENUM('pending', 'paid', 'failed') DEFAULT 'pending',
  `order_status` ENUM('pending', 'confirmed', 'shipping', 'delivered', 'cancelled') DEFAULT 'pending',
  `order_type` ENUM('single', 'subscription') DEFAULT 'single',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`customer_id`) REFERENCES `users`(`id`)
);

CREATE TABLE IF NOT EXISTS `order_items` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `order_id` BIGINT UNSIGNED NOT NULL,
  `product_id` BIGINT UNSIGNED NOT NULL,
  `batch_id` BIGINT UNSIGNED NOT NULL,
  `quantity` INT NOT NULL,
  `price` DECIMAL(12,2) NOT NULL,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`),
  FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`)
);

CREATE TABLE IF NOT EXISTS `subscriptions` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `customer_id` BIGINT UNSIGNED NOT NULL,
  `package_name` VARCHAR(255) NOT NULL,
  `delivery_days` VARCHAR(100) NOT NULL,
  `monthly_price` DECIMAL(12,2) NOT NULL,
  `status` ENUM('active', 'paused', 'cancelled') DEFAULT 'active',
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`customer_id`) REFERENCES `users`(`id`)
);

CREATE TABLE IF NOT EXISTS `complaints` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `order_id` BIGINT UNSIGNED NOT NULL,
  `customer_id` BIGINT UNSIGNED NOT NULL,
  `reason` TEXT NOT NULL,
  `proof_images` JSON NOT NULL,
  `status` ENUM('pending', 'approved_refund', 'approved_resend', 'rejected') DEFAULT 'pending',
  `sales_note` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`),
  FOREIGN KEY (`customer_id`) REFERENCES `users`(`id`)
);

CREATE TABLE IF NOT EXISTS `internal_losses` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `batch_id` BIGINT UNSIGNED NOT NULL,
  `quantity_lost` INT NOT NULL,
  `reason` ENUM('dap_nat', 'hu_hong', 'qua_han', 'hao_hut_giao_nhan') NOT NULL,
  `reported_by` BIGINT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`batch_id`) REFERENCES `batches`(`id`),
  FOREIGN KEY (`reported_by`) REFERENCES `users`(`id`)
);
