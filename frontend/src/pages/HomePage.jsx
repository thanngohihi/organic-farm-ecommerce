
import React, { useState } from 'react';
import {
    Search,
    Filter,
    QrCode,
    ShoppingCart,
    CheckCircle2,
    Leaf,
    Clock
} from 'lucide-react';

const MOCK_PRODUCTS = [
    {
        id: 1,
        name: "Cà Chua Cherry Hữu Cơ",
        category: "Rau củ quả",
        price: 45000,
        unit: "Hộp 500g",
        cert: "VietGAP",
        image: "https://images.unsplash.com/photo-1546094096-0df4bcaaa337?w=600",
        batch: "LOT-20261115-01",
        expDays: 4
    },
    {
        id: 2,
        name: "Cải Kale Thu Hoạch Sáng",
        category: "Rau xanh",
        price: 38000,
        unit: "Bó 300g",
        cert: "USDA Organic",
        image: "https://images.unsplash.com/photo-1515543904379-3d757afe72e4?w=600",
        batch: "LOT-20261116-02",
        expDays: 3
    },
    {
        id: 3,
        name: "Dâu Tây Đà Lạt Thượng Hạng",
        category: "Trái cây tươi",
        price: 120000,
        unit: "Hộp 250g",
        cert: "VietGAP",
        image: "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=600",
        batch: "LOT-20261116-05",
        expDays: 2
    }
];

export default function HomePage() {
    const [selectedCategory, setSelectedCategory] = useState('Tất cả');
    const [searchTerm, setSearchTerm] = useState('');
    const [cart, setCart] = useState([]);

    const categories = [
        'Tất cả',
        'Rau xanh',
        'Rau củ quả',
        'Trái cây tươi'
    ];

    // Lọc sản phẩm theo danh mục và từ khóa
    const filteredProducts = MOCK_PRODUCTS.filter((product) => {
        const matchCategory =
            selectedCategory === 'Tất cả' ||
            product.category === selectedCategory;

        const matchSearch =
            product.name.toLowerCase().includes(searchTerm.toLowerCase());

        return matchCategory && matchSearch;
    });

    // Thêm sản phẩm vào giỏ hàng
    const handleAddToCart = (product) => {
        setCart((prevCart) => {
            const existingProduct = prevCart.find(
                (item) => item.id === product.id
            );

            if (existingProduct) {
                return prevCart.map((item) =>
                    item.id === product.id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }

            return [
                ...prevCart,
                { ...product, quantity: 1 }
            ];
        });

        alert(`Đã thêm ${product.name} vào giỏ hàng!`);
    };

    // Xem thông tin truy xuất nguồn gốc
    const handleTraceability = (product) => {
        alert(
            `Thông tin truy xuất nguồn gốc:\n\n` +
            `Sản phẩm: ${product.name}\n` +
            `Mã lô: ${product.batch}\n` +
            `Chứng nhận: ${product.cert}\n` +
            `Hạn sử dụng còn: ${product.expDays} ngày`
        );
    };

    return (
        <div className="min-h-screen bg-gray-50">

            {/* Banner */}
            <section className="relative overflow-hidden bg-green-700 px-4 py-20 text-white md:py-28">

                <div className="absolute inset-0 opacity-10">
                    <Leaf
                        size={300}
                        className="absolute -right-10 -top-10"
                    />
                </div>

                <div className="relative mx-auto max-w-7xl">

                    <div className="max-w-2xl">

                        <span className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/20 px-5 py-2 text-sm font-semibold">
                            <CheckCircle2 size={18} />
                            Nông trại sạch 100%
                        </span>

                        <h1 className="mb-6 text-4xl font-extrabold leading-tight md:text-6xl">
                            Nông Sản Tươi Xanh
                            <br />
                            Thu Hoạch Mỗi Sáng
                        </h1>

                        <p className="mb-8 text-base leading-8 text-green-50 md:text-lg">
                            Đặt hàng ngay hôm nay để nhận giao hàng tận nhà.
                            Tự do quét mã QR kiểm tra nhật ký gieo trồng
                            và nguồn gốc sản phẩm!
                        </p>

                        <button
                            onClick={() => {
                                document.getElementById('products')
                                    ?.scrollIntoView({
                                        behavior: 'smooth'
                                    });
                            }}
                            className="rounded-lg bg-white px-7 py-3 font-bold text-green-700 transition hover:bg-green-50"
                        >
                            Mua sắm ngay
                        </button>

                    </div>
                </div>
            </section>

            {/* Box Tìm Kiếm Nhanh */}
            <section className="relative z-10 mx-auto -mt-8 max-w-4xl px-4">

                <div className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-lg">

                    <Search
                        size={23}
                        className="ml-3 text-gray-400"
                    />

                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Tìm kiếm rau củ, trái cây..."
                        className="w-full border-none bg-transparent py-3 text-gray-700 outline-none"
                    />

                    <button
                        onClick={() => setSearchTerm('')}
                        className="rounded-lg bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700"
                    >
                        Xóa
                    </button>

                </div>
            </section>

            {/* Main Content & Products */}
            <section
                id="products"
                className="mx-auto max-w-7xl px-4 py-16"
            >

                {/* Section Header */}
                <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">

                    <div>
                        <span className="font-semibold uppercase tracking-widest text-green-600">
                            OrganicFarm
                        </span>

                        <h2 className="mt-2 text-3xl font-bold text-gray-800">
                            Sản Phẩm Nổi Bật
                        </h2>

                        <p className="mt-2 text-gray-500">
                            Nông sản tươi ngon được tuyển chọn mỗi ngày.
                        </p>
                    </div>

                    <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-green-700">
                        <ShoppingCart size={20} />
                        <span className="font-semibold">
                            Giỏ hàng: {cart.reduce(
                                (total, item) => total + item.quantity,
                                0
                            )} sản phẩm
                        </span>
                    </div>

                </div>

                {/* Bộ Lọc Danh Mục */}
                <div className="mb-8">

                    <div className="mb-4 flex items-center gap-2 text-gray-700">
                        <Filter size={20} />
                        <span className="font-semibold">
                            Danh mục sản phẩm
                        </span>
                    </div>

                    <div className="flex flex-wrap gap-3">

                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                                    selectedCategory === cat
                                        ? 'bg-green-600 text-white shadow-md'
                                        : 'border border-gray-200 bg-white text-gray-600 hover:border-green-500 hover:text-green-600'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}

                    </div>
                </div>

                {/* Danh Sách Sản Phẩm */}
                {filteredProducts.length > 0 ? (

                    <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">

                        {filteredProducts.map((p) => (

                            <div
                                key={p.id}
                                className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                            >

                                {/* Product Image */}
                                <div className="relative h-64 overflow-hidden bg-gray-100">

                                    <img
                                        src={p.image}
                                        alt={p.name}
                                        className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                                    />

                                    <span className="absolute left-4 top-4 flex items-center gap-1 rounded-full bg-green-600 px-3 py-1.5 text-xs font-bold text-white shadow">
                                        <CheckCircle2 size={14} />
                                        {p.cert}
                                    </span>

                                    <button
                                        onClick={() => handleTraceability(p)}
                                        className="absolute bottom-4 right-4 flex items-center gap-2 rounded-lg bg-white/95 px-3 py-2 text-sm font-semibold text-green-700 shadow transition hover:bg-green-600 hover:text-white"
                                    >
                                        <QrCode size={18} />
                                        Truy xuất
                                    </button>

                                </div>

                                {/* Product Information */}
                                <div className="p-5">

                                    <span className="text-xs font-semibold uppercase tracking-wide text-green-600">
                                        {p.category}
                                    </span>

                                    <h3 className="mb-3 mt-2 text-xl font-bold text-gray-800">
                                        {p.name}
                                    </h3>

                                    <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
                                        <Clock size={16} />
                                        Hạn sử dụng còn: {p.expDays} ngày
                                    </div>

                                    <div className="mb-4 flex items-center justify-between">

                                        <div>
                                            <span className="text-xl font-bold text-green-700">
                                                {p.price.toLocaleString('vi-VN')}đ
                                            </span>

                                            <span className="ml-1 text-sm text-gray-500">
                                                / {p.unit}
                                            </span>
                                        </div>

                                    </div>

                                    <div className="mb-4 text-xs text-gray-400">
                                        Mã lô: {p.batch}
                                    </div>

                                    <button
                                        onClick={() => handleAddToCart(p)}
                                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 py-3 font-semibold text-white transition hover:bg-green-700"
                                    >
                                        <ShoppingCart size={19} />
                                        Thêm vào giỏ hàng
                                    </button>

                                </div>

                            </div>

                        ))}

                    </div>

                ) : (

                    <div className="rounded-2xl bg-white py-16 text-center shadow-sm">

                        <Search
                            size={45}
                            className="mx-auto mb-4 text-gray-300"
                        />

                        <h3 className="text-xl font-bold text-gray-700">
                            Không tìm thấy sản phẩm
                        </h3>

                        <p className="mt-2 text-gray-500">
                            Vui lòng thử từ khóa hoặc danh mục khác.
                        </p>

                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setSelectedCategory('Tất cả');
                            }}
                            className="mt-5 font-semibold text-green-600 hover:underline"
                        >
                            Xem tất cả sản phẩm
                        </button>

                    </div>

                )}

            </section>

        </div>
    );
}
