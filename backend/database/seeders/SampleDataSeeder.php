<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class SampleDataSeeder extends Seeder
{
    public function run(): void
    {
        $now = Carbon::now();

        // 1. Seed Categories
        $categories = [
            [
                'id' => 1,
                'name' => 'Rau Củ Quả Ăn Trái',
                'slug' => 'rau-cu-qua-an-trai',
                'description' => 'Các loại cà chua, dưa leo, củ cải trồng theo tiêu chuẩn hữu cơ VietGAP và GlobalGAP.',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'id' => 2,
                'name' => 'Rau Ăn Lá',
                'slug' => 'rau-an-la',
                'description' => 'Rau xanh ăn lá tươi thu hoạch trong ngày: cải bó xôi, xà lách, rau muống hữu cơ.',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'id' => 3,
                'name' => 'Trái Cây Tươi Hữu Cơ',
                'slug' => 'trai-cay-tuoi-huu-co',
                'description' => 'Dâu tây Đà Lạt, dưa lưới nhà màng chín tự nhiên không hóa chất.',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'id' => 4,
                'name' => 'Nấm & Thảo Mộc',
                'slug' => 'nam-va-thao-moc',
                'description' => 'Nấm bào ngư, nấm đùi gà và các loại gia vị rau thơm canh tác sạch.',
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ];
        DB::table('categories')->insertOrIgnore($categories);

        // 2. Seed Products
        $products = [
            [
                'id' => 1,
                'category_id' => 1,
                'name' => 'Cà Chua Hữu Cơ VietGAP',
                'slug' => 'ca-chua-huu-co-vietgap',
                'sku' => 'PROD-CA-CHUA-01',
                'unit' => 'kg',
                'base_price' => 35000.00,
                'certification' => 'VietGAP',
                'certification_doc_url' => 'https://res.cloudinary.com/organic-farm/image/upload/v1731500001/cert_vietgap.pdf',
                'thumbnail_url' => 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500',
                'description' => 'Cà chua chín mọng nước được thụ phấn tự nhiên bởi ong trong nhà màng Củ Chi.',
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'id' => 2,
                'category_id' => 2,
                'name' => 'Cải Bó Xôi Organic USDA',
                'slug' => 'cai-bo-xoi-organic-usda',
                'sku' => 'PROD-BO-XOI-02',
                'unit' => 'kg',
                'base_price' => 48000.00,
                'certification' => 'USDA Organic',
                'certification_doc_url' => 'https://res.cloudinary.com/organic-farm/image/upload/v1731500001/cert_usda.pdf',
                'thumbnail_url' => 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=500',
                'description' => 'Cải bó xôi (rau chân vịt) giàu sắt và vitamin, thu hái lúc sáng sớm.',
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'id' => 3,
                'category_id' => 3,
                'name' => 'Dâu Tây Đà Lạt VietGAP',
                'slug' => 'dau-tay-da-lat-vietgap',
                'sku' => 'PROD-DAU-TAY-03',
                'unit' => 'hộp 500g',
                'base_price' => 120000.00,
                'certification' => 'VietGAP',
                'certification_doc_url' => 'https://res.cloudinary.com/organic-farm/image/upload/v1731500001/cert_vietgap.pdf',
                'thumbnail_url' => 'https://images.unsplash.com/photo-1518635017498-87f514b751ba?w=500',
                'description' => 'Dâu tây giống Nhật trồng giá thể xơ dừa tại trang trại Đà Lạt, ngọt thanh tự nhiên.',
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'id' => 4,
                'category_id' => 1,
                'name' => 'Củ Cải Đỏ Hữu Cơ',
                'slug' => 'cu-cai-do-huu-co',
                'sku' => 'PROD-CU-CAI-04',
                'unit' => 'kg',
                'base_price' => 42000.00,
                'certification' => 'GlobalGAP',
                'certification_doc_url' => 'https://res.cloudinary.com/organic-farm/image/upload/v1731500001/cert_globalgap.pdf',
                'thumbnail_url' => 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=500',
                'description' => 'Củ cải đỏ củ tròn giòn ngọt, thích hợp ép nước detox hoặc làm salad.',
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'id' => 5,
                'category_id' => 1,
                'name' => 'Dưa Leo Baby GlobalGAP',
                'slug' => 'dua-leo-baby-globalgap',
                'sku' => 'PROD-DUA-LEO-05',
                'unit' => 'kg',
                'base_price' => 38000.00,
                'certification' => 'GlobalGAP',
                'certification_doc_url' => 'https://res.cloudinary.com/organic-farm/image/upload/v1731500001/cert_globalgap.pdf',
                'thumbnail_url' => 'https://images.unsplash.com/photo-1604977042946-1eecc30f269e?w=500',
                'description' => 'Dưa leo baby giòn mát, không hạt, thu hái tươi mỗi ngày.',
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'id' => 6,
                'category_id' => 2,
                'name' => 'Xà Lách Mỡ Thủy Canh',
                'slug' => 'xa-lach-mo-thuy-canh',
                'sku' => 'PROD-XA-LACH-06',
                'unit' => 'kg',
                'base_price' => 45000.00,
                'certification' => 'VietGAP',
                'certification_doc_url' => 'https://res.cloudinary.com/organic-farm/image/upload/v1731500001/cert_vietgap.pdf',
                'thumbnail_url' => 'https://images.unsplash.com/photo-1556801712-76c8eb07bbc9?w=500',
                'description' => 'Xà lách mỡ canh tác thủy canh hồi lưu khép kín, lá xanh mềm ngọt.',
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]
        ];
        DB::table('products')->insertOrIgnore($products);

        // 3. Seed Batches (Lô hàng thực tế phục vụ nguyên tắc FEFO & Flash Sale)
        // Tìm id của kỹ sư canh tác (Role 3)
        $farmStaffId = DB::table('users')->where('role_id', 3)->value('id') ?? 2;

        $batches = [
            // Lô 1: Cà chua - Còn hạn dài
            [
                'id' => 1,
                'batch_code' => 'BATCH-CC-20261110-01',
                'product_id' => 1,
                'farm_staff_id' => $farmStaffId,
                'harvest_date' => Carbon::now()->subDays(2)->format('Y-m-d'),
                'expiry_date' => Carbon::now()->addDays(8)->format('Y-m-d'),
                'initial_quantity' => 100.00,
                'current_quantity' => 45.50,
                'wasted_quantity' => 2.00,
                'is_flash_sale' => false,
                'discount_percent' => 0,
                'qr_code_url' => 'https://api.qrserver.com/v1/create-qr-code/?data=BATCH-CC-20261110-01',
                'status' => 'con_hang',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            // Lô 2: Cải bó xôi - CẬN HẠN (Còn 2 ngày) -> TỰ ĐỘNG BẬT FLASH SALE (FEFO xuất trước)
            [
                'id' => 2,
                'batch_code' => 'BATCH-BX-20261112-02',
                'product_id' => 2,
                'farm_staff_id' => $farmStaffId,
                'harvest_date' => Carbon::now()->subDays(4)->format('Y-m-d'),
                'expiry_date' => Carbon::now()->addDays(2)->format('Y-m-d'),
                'initial_quantity' => 80.00,
                'current_quantity' => 20.00,
                'wasted_quantity' => 5.00,
                'is_flash_sale' => true,
                'discount_percent' => 30, // Giảm 30% xả kho
                'qr_code_url' => 'https://api.qrserver.com/v1/create-qr-code/?data=BATCH-BX-20261112-02',
                'status' => 'sap_het_han',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            // Lô 3: Dâu tây Đà Lạt - Thu hoạch hôm qua, tươi mới
            [
                'id' => 3,
                'batch_code' => 'BATCH-DT-20261115-01',
                'product_id' => 3,
                'farm_staff_id' => $farmStaffId,
                'harvest_date' => Carbon::now()->subDays(1)->format('Y-m-d'),
                'expiry_date' => Carbon::now()->addDays(5)->format('Y-m-d'),
                'initial_quantity' => 60.00,
                'current_quantity' => 38.00,
                'wasted_quantity' => 1.00,
                'is_flash_sale' => false,
                'discount_percent' => 0,
                'qr_code_url' => 'https://api.qrserver.com/v1/create-qr-code/?data=BATCH-DT-20261115-01',
                'status' => 'con_hang',
                'created_at' => $now,
                'updated_at' => $now,
            ],
            // Lô 4: Củ cải đỏ - Hạn sử dụng dài (15 ngày)
            [
                'id' => 4,
                'batch_code' => 'BATCH-CD-20261114-01',
                'product_id' => 4,
                'farm_staff_id' => $farmStaffId,
                'harvest_date' => Carbon::now()->subDays(2)->format('Y-m-d'),
                'expiry_date' => Carbon::now()->addDays(15)->format('Y-m-d'),
                'initial_quantity' => 150.00,
                'current_quantity' => 110.00,
                'wasted_quantity' => 0.00,
                'is_flash_sale' => false,
                'discount_percent' => 0,
                'qr_code_url' => 'https://api.qrserver.com/v1/create-qr-code/?data=BATCH-CD-20261114-01',
                'status' => 'con_hang',
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ];
        DB::table('batches')->insertOrIgnore($batches);

        // 4. Seed Farming Logs (Nhật ký canh tác minh bạch)
        $logs = [
            [
                'batch_id' => 1,
                'farm_staff_id' => $farmStaffId,
                'stage' => 'gieo_hat',
                'title' => 'Gieo hạt giống cà chua F1 hữu cơ',
                'description' => 'Ươm 500 hạt giống trong khay xơ dừa đã xử lý vi sinh trichoderma khử nấm bệnh.',
                'media_urls' => json_encode(['https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500']),
                'soil_water_test_url' => 'https://res.cloudinary.com/organic-farm/image/upload/v1731500001/test_dat_nuoc.pdf',
                'logged_at' => Carbon::now()->subDays(60),
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'batch_id' => 1,
                'farm_staff_id' => $farmStaffId,
                'stage' => 'tuoi_tieu',
                'title' => 'Tưới nước nhỏ giọt kết hợp vi sinh IMO',
                'description' => 'Vận hành hệ thống tưới nước tự động 3 chu kỳ/ngày với nước giếng khoan đã qua lọc RO.',
                'media_urls' => json_encode(['https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=500']),
                'soil_water_test_url' => null,
                'logged_at' => Carbon::now()->subDays(25),
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'batch_id' => 1,
                'farm_staff_id' => $farmStaffId,
                'stage' => 'thu_hoach',
                'title' => 'Thu hoạch quả chín tự nhiên đợt 1',
                'description' => 'Thu hái thủ công vào sáng sớm (05:30 - 08:00), đóng khay thoáng khí chuyển về kho mát 15 độ C.',
                'media_urls' => json_encode(['https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=500']),
                'soil_water_test_url' => null,
                'logged_at' => Carbon::now()->subDays(2),
                'created_at' => $now,
                'updated_at' => $now,
            ]
        ];
        DB::table('farming_logs')->insertOrIgnore($logs);
    }
}
