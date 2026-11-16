<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class RoleUserSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            ['id' => 1, 'name' => 'guest', 'display_name' => 'Khách vãng lai'],
            ['id' => 2, 'name' => 'customer', 'display_name' => 'Khách hàng'],
            ['id' => 3, 'name' => 'farm_staff', 'display_name' => 'Nhân viên Nông trại (Kỹ sư canh tác)'],
            ['id' => 4, 'name' => 'sales', 'display_name' => 'Nhân viên Bán hàng / CSKH'],
            ['id' => 5, 'name' => 'admin', 'display_name' => 'Quản trị viên (Chủ nông trại)'],
        ];
        DB::table('roles')->insertOrIgnore($roles);

        $users = [
            [
                'role_id' => 5,
                'full_name' => 'Chủ Nông Trại Admin',
                'email' => 'admin@organicfarm.vn',
                'phone' => '0901000001',
                'password' => Hash::make('Password@123'),
                'address' => 'Nông trại Organic, Củ Chi, TP.HCM',
                'loyalty_points' => 0,
            ],
            [
                'role_id' => 3,
                'full_name' => 'Kỹ Sư Canh Tác (Farm Staff)',
                'email' => 'staff@organicfarm.vn',
                'phone' => '0901000002',
                'password' => Hash::make('Password@123'),
                'address' => 'Khu nhà kính A1, Nông trại Củ Chi',
                'loyalty_points' => 0,
            ],
            [
                'role_id' => 4,
                'full_name' => 'Nhân Viên CSKH & Điều Phối (Sales)',
                'email' => 'sales@organicfarm.vn',
                'phone' => '0901000003',
                'password' => Hash::make('Password@123'),
                'address' => 'Trạm điều phối Quận 1, TP.HCM',
                'loyalty_points' => 0,
            ]
        ];
        DB::table('users')->insertOrIgnore($users);
    }
}