import React from 'react';

import {
    Sprout,
    Facebook,
    Mail,
    ShoppingCart,
    QrCode,
    Truck,
    ShieldCheck,
    Heart,
    ArrowUp
} from 'lucide-react';

export default function Footer() {
    return (
        <footer className="bg-green-950 text-white">

            <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">

                {/* THƯƠNG HIỆU */}
                <div>
                    <div className="mb-5 flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-600">
                            <Sprout size={29} />
                        </div>

                        <div>
                            <h3 className="text-xl font-extrabold">
                                Organic Farm
                            </h3>
                            <p className="text-xs text-green-300">
                                Ecommerce
                            </p>
                        </div>
                    </div>

                    <p className="text-sm leading-7 text-green-100">
                        Mang đến những sản phẩm nông sản tươi sạch,
                        an toàn và chất lượng. Kết nối trực tiếp
                        từ nông trại đến bàn ăn của mọi gia đình.
                    </p>

                    <div className="mt-5 flex gap-3">
                        <a
                            href="https://www.facebook.com/profile.php?id=61590644424019"
                            aria-label="Facebook"
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-green-800 hover:bg-green-600"
                        >
                            <Facebook size={19} />
                        </a>

                        <a
                            href="mailto:"
                            aria-label="Email"
                            className="flex h-10 w-10 items-center justify-center rounded-full bg-green-800 hover:bg-green-600"
                        >
                            <Mail size={19} />
                        </a>
                    </div>
                </div>

                {/* LIÊN KẾT */}
                <div>
                    <h3 className="mb-5 text-lg font-bold">
                        Liên kết nhanh
                    </h3>

                    <ul className="space-y-4 text-sm text-green-100">
                        <li><a href="/" className="hover:text-green-400">Trang chủ</a></li>
                        <li><a href="#products" className="hover:text-green-400">Sản phẩm</a></li>
                        <li><a href="#products" className="hover:text-green-400">Danh mục sản phẩm</a></li>
                        <li><a href="#footer" className="hover:text-green-400">Về chúng tôi</a></li>
                    </ul>
                </div>

                {/* DỊCH VỤ */}
                <div>
                    <h3 className="mb-5 text-lg font-bold">
                        Dịch vụ
                    </h3>

                    <ul className="space-y-4 text-sm text-green-100">
                        <li className="flex items-center gap-2">
                            <ShoppingCart size={17} className="text-green-400" />
                            Mua sắm nông sản
                        </li>

                        <li className="flex items-center gap-2">
                            <QrCode size={17} className="text-green-400" />
                            Truy xuất nguồn gốc
                        </li>

                        <li className="flex items-center gap-2">
                            <Truck size={17} className="text-green-400" />
                            Giao hàng tận nhà
                        </li>

                        <li className="flex items-center gap-2">
                            <ShieldCheck size={17} className="text-green-400" />
                            Cam kết chất lượng
                        </li>
                    </ul>
                </div>

                {/* THÔNG ĐIỆP */}
                <div>
                    <h3 className="mb-5 text-lg font-bold">
                        Vì sức khỏe gia đình
                    </h3>

                    <p className="text-sm leading-7 text-green-100">
                        Chúng tôi luôn hướng đến nguồn thực phẩm
                        xanh, sạch và minh bạch. Mỗi sản phẩm đều
                        hướng tới sự an tâm cho người tiêu dùng.
                    </p>

                    <div className="mt-5 rounded-xl border border-green-800 bg-green-900/60 p-4">
                        <div className="flex items-center gap-2 text-green-300">
                            <Heart size={20} />
                            <span className="font-bold">
                                Sống xanh mỗi ngày
                            </span>
                        </div>

                        <p className="mt-2 text-xs leading-6 text-green-100">
                            Lựa chọn nông sản sạch hôm nay,
                            bảo vệ sức khỏe ngày mai.
                        </p>
                    </div>
                </div>

            </div>

            {/* COPYRIGHT */}
            <div className="border-t border-green-800">
                <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 sm:flex-row">

                    <p className="text-sm text-green-200">
                        © {new Date().getFullYear()} Organic Farm Ecommerce.
                        All rights reserved.
                    </p>

                    <p className="text-sm text-green-300">
                        Không làm mà đòi có ăn
                    </p>

                    <button
                        onClick={() => window.scrollTo({
                            top: 0,
                            behavior: 'smooth'
                        })}
                        className="flex items-center gap-2 rounded-lg bg-green-800 px-4 py-2 text-sm font-semibold hover:bg-green-600"
                    >
                        <ArrowUp size={17} />
                        Lên đầu trang
                    </button>

                </div>
            </div>

        </footer>
    );
}
