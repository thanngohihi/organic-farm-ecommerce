
import React from 'react';
import {
    Award,
    ShieldCheck,
    Truck,
    Sprout,
    HeartHandshake
} from 'lucide-react';

export default function BrandStory() {
    const features = [
        {
            icon: Sprout,
            title: '100% Minh Bạch Nguồn Gốc',
            description:
                'Mỗi lô nông sản đều có mã QR truy xuất từng mốc canh tác: ngày gieo hạt, loại phân bón vi sinh và ngày thu hoạch thực tế.'
        },
        {
            icon: ShieldCheck,
            title: 'Tiêu Chuẩn VietGAP & USDA',
            description:
                'Quy trình chăm sóc hướng đến tiêu chuẩn kiểm định đất và nước định kỳ. Không hóa chất độc hại, không chất bảo quản thực phẩm.'
        },
        {
            icon: Truck,
            title: 'Thu Hoạch & Giao Trong Ngày',
            description:
                'Rau củ được thu hoạch vào buổi sáng và giao đến khách hàng trong ngày nhằm giữ độ tươi ngon của sản phẩm.'
        }
    ];

    return (
        <section className="overflow-hidden bg-white">

            {/* Hero Section */}
            <div className="relative bg-green-50 px-4 py-20 md:py-28">
                <div className="mx-auto max-w-5xl text-center">

                    <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-green-100 px-5 py-2 text-sm font-semibold text-green-700">
                        <Sprout size={18} />
                        Single Farm Model
                    </div>

                    <h1 className="mb-6 text-3xl font-extrabold leading-tight text-gray-800 md:text-5xl">
                        Từ Nông Trại Đến Bàn Ăn Gia Đình Bạn
                    </h1>

                    <p className="mx-auto max-w-3xl text-base leading-8 text-gray-600 md:text-lg">
                        Chúng tôi xây dựng mô hình nông trại khép kín,
                        hướng đến sản xuất nông sản hữu cơ và giảm thiểu
                        các khâu trung gian để mang lại những bó rau
                        tươi ngon nhất đến gia đình bạn.
                    </p>

                    <div className="mt-8 flex justify-center">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-md">
                            <Sprout
                                size={42}
                                className="text-green-600"
                            />
                        </div>
                    </div>

                </div>
            </div>

            {/* 3 Trụ Cột Triết Lý */}
            <div className="mx-auto max-w-7xl px-4 py-20">

                <div className="mb-12 text-center">
                    <span className="font-semibold uppercase tracking-widest text-green-600">
                        Giá trị cốt lõi
                    </span>

                    <h2 className="mt-3 text-3xl font-bold text-gray-800">
                        Triết Lý OrganicFarm
                    </h2>

                    <p className="mt-3 text-gray-500">
                        Chất lượng, minh bạch và trách nhiệm với khách hàng.
                    </p>
                </div>

                <div className="grid grid-cols-1 gap-8 md:grid-cols-3">

                    {features.map((feature, index) => {
                        const Icon = feature.icon;

                        return (
                            <div
                                key={index}
                                className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm transition hover:-translate-y-2 hover:shadow-lg"
                            >
                                <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100">
                                    <Icon
                                        size={32}
                                        className="text-green-600"
                                    />
                                </div>

                                <h3 className="mb-4 text-xl font-bold text-gray-800">
                                    {feature.title}
                                </h3>

                                <p className="leading-7 text-gray-600">
                                    {feature.description}
                                </p>
                            </div>
                        );
                    })}

                </div>
            </div>

            {/* Hồ sơ năng lực & Cam kết */}
            <div className="bg-green-50 px-4 py-20">

                <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 md:grid-cols-2">

                    {/* Left Content */}
                    <div>
                        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-green-600 text-white">
                            <Award size={30} />
                        </div>

                        <span className="font-semibold uppercase tracking-widest text-green-600">
                            Cam kết chất lượng
                        </span>

                        <h2 className="mb-6 mt-3 text-3xl font-bold leading-tight text-gray-800">
                            Nói Không Với Hàng Tồn Lưu Kho
                        </h2>

                        <p className="mb-5 leading-8 text-gray-600">
                            Nhờ quy trình quản lý kho theo nguyên tắc
                            FEFO (Hết hạn trước - Xuất trước), chúng tôi
                            ưu tiên xuất những sản phẩm có hạn sử dụng
                            gần nhất, góp phần giảm lãng phí và đảm bảo
                            chất lượng hàng hóa.
                        </p>

                        <p className="leading-8 text-gray-600">
                            Nếu nông sản bị dập nát do vận chuyển,
                            chúng tôi cam kết hỗ trợ đổi trả hoặc hoàn
                            tiền theo chính sách của cửa hàng.
                        </p>
                    </div>

                    {/* Right Commitment Cards */}
                    <div className="space-y-5">

                        <div className="flex items-start gap-4 rounded-2xl bg-white p-6 shadow-sm">
                            <div className="rounded-xl bg-green-100 p-3">
                                <ShieldCheck
                                    size={28}
                                    className="text-green-600"
                                />
                            </div>

                            <div>
                                <h3 className="mb-2 font-bold text-gray-800">
                                    Kiểm Soát Chất Lượng
                                </h3>

                                <p className="text-sm leading-6 text-gray-600">
                                    Theo dõi chất lượng sản phẩm trong
                                    từng giai đoạn từ nông trại đến
                                    khách hàng.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 rounded-2xl bg-white p-6 shadow-sm">
                            <div className="rounded-xl bg-green-100 p-3">
                                <Truck
                                    size={28}
                                    className="text-green-600"
                                />
                            </div>

                            <div>
                                <h3 className="mb-2 font-bold text-gray-800">
                                    Giao Hàng Tận Tâm
                                </h3>

                                <p className="text-sm leading-6 text-gray-600">
                                    Đóng gói cẩn thận và hỗ trợ khách
                                    hàng khi sản phẩm gặp vấn đề trong
                                    quá trình vận chuyển.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 rounded-2xl bg-white p-6 shadow-sm">
                            <div className="rounded-xl bg-green-100 p-3">
                                <HeartHandshake
                                    size={28}
                                    className="text-green-600"
                                />
                            </div>

                            <div>
                                <h3 className="mb-2 font-bold text-gray-800">
                                    Khách Hàng Là Ưu Tiên
                                </h3>

                                <p className="text-sm leading-6 text-gray-600">
                                    Luôn lắng nghe ý kiến và cải thiện
                                    dịch vụ để mang lại trải nghiệm
                                    mua sắm tốt hơn.
                                </p>
                            </div>
                        </div>

                    </div>

                </div>
            </div>

        </section>
    );
}
