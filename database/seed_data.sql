-- Organic Farm Seed Data
USE organic_farm_db;

INSERT INTO users (name, email, password, role, phone, address, loyalty_points) VALUES
('Admin User', 'admin@farm.vn', 'secret_hash_here', 'admin', '0901111111', 'Cu Chi, TP.HCM', 1000),
('Sales Agent', 'sales@farm.vn', 'secret_hash_here', 'sales', '0902222222', 'Quan 1, TP.HCM', 500),
('Farm Staff', 'staff@farm.vn', 'secret_hash_here', 'farm_staff', '0903333333', 'Cu Chi, TP.HCM', 200),
('Customer User', 'customer@farm.vn', 'secret_hash_here', 'customer', '0904444444', 'Quan 3, TP.HCM', 150),
('Guest User', 'guest@farm.vn', 'secret_hash_here', 'guest', '0905555555', 'TP.HCM', 0);

INSERT INTO products (id, name, sku, category, price, unit, certification, description) VALUES
(1, 'Ca Chua Huu Co VietGAP', 'PROD-CA-CHUA-01', 'Rau Cu An Qua', 35000, 'kg', 'VietGAP', 'Ca chua mong nuoc trong theo tieu chuan VietGAP'),
(2, 'Cai Bo Xoi Organic USDA', 'PROD-BO-XOI-02', 'Rau Xanh', 48000, 'kg', 'USDA Organic', 'Cai bo xoi rau chan vit giau sat va chat xo'),
(3, 'Dau Tay Da Lat VietGAP', 'PROD-DAU-TAY-03', 'Trai Cay Tuoi', 120000, 'hop 500g', 'VietGAP', 'Dau tay do mong chin tu nhien tai Da Lat'),
(4, 'Cu Cai Do Huu Co', 'PROD-CU-CAI-04', 'Cu Qua', 42000, 'kg', 'GlobalGAP', 'Cu cai do gion ngot thich hop lam salad');

INSERT INTO batches (id, batch_code, product_id, initial_quantity, current_quantity, harvest_date, expiration_date, farm_location, status) VALUES
(1, 'BATCH-CC-20261110', 1, 100, 45, '2026-11-10', '2026-11-16', 'Khu A - Luong Ca Chua 01', 'active'),
(2, 'BATCH-BX-20261112', 2, 80, 20, '2026-11-12', '2026-11-15', 'Khu B - Phan Khu Nha Mang 02', 'near_expiration'),
(3, 'BATCH-DT-20261111', 3, 50, 15, '2026-11-11', '2026-11-17', 'Khu C - Nong trai Da Lat', 'active');

INSERT INTO qr_codes (batch_id, qr_code_hash, scan_count) VALUES
(1, 'QR-BATCH-CC-20261110', 42),
(2, 'QR-BATCH-BX-20261112', 18),
(3, 'QR-BATCH-DT-20261111', 89);
