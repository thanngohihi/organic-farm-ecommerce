
import React, { useEffect, useState } from 'react';

import {
    Search,
    Filter,
    QrCode,
    ShoppingCart,
    CheckCircle2,
    Leaf,
    Clock,
    Loader2,
    RefreshCw
} from 'lucide-react';

import axios from 'axios';

const API_URL = 'http://localhost:8000/api/v1';

export default function HomePage({
    addToCart,
    cartItems = [],
    onNavigateQr,
    onGoToCart
}) {

    const [selectedCategory, setSelectedCategory] = useState('Tất cả');
    const [searchTerm, setSearchTerm] = useState('');

    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // =====================================
    // LẤY SẢN PHẨM TỪ LARAVEL API
    // =====================================

    const fetchProducts = async () => {
        try {
            setLoading(true);
            setError('');

            const response = await axios.get(`${API_URL}/products`);

            if (response.data?.status !== 'success') {
                throw new Error(
                    response.data?.message ||
                    'Không thể lấy danh sách sản phẩm.'
                );
            }

            const data = response.data?.data;

            if (!Array.isArray(data)) {
                throw new Error('Dữ liệu sản phẩm không hợp lệ.');
            }

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const formattedProducts = data.map((product) => {

                const expiryDate = product.exp_date
                    ? new Date(`${product.exp_date}T00:00:00`)
                    : null;

                const expDays =
                    expiryDate && !isNaN(expiryDate.getTime())
                        ? Math.ceil(
                            (expiryDate - today) /
                            (1000 * 60 * 60 * 24)
                        )
                        : null;

                return {
                    ...product,
                    id: product.id,
                    name: product.name,
                    price: Number(product.price || 0),
                    unit: product.unit || 'kg',
                    category: product.category_name || 'Khác',
                    cert: product.certification || '',
                    image: product.image || '',
                    batch: product.batch_code || '',
                    current_quantity: Number(product.stock || 0),
                    expiry_date: product.exp_date || null,
                    expDays
                };
            });

            setProducts(formattedProducts);

        } catch (err) {

            console.error('Lỗi lấy sản phẩm:', err);

            setError(
                err.response?.data?.message ||
                err.message ||
                'Không thể tải danh sách sản phẩm.'
            );

        } finally {
            setLoading(false);
        }
    };

    // =====================================
    // TỰ ĐỘNG LẤY SẢN PHẨM KHI MỞ TRANG
    // =====================================

    useEffect(() => {
        fetchProducts();
    }, []);

    // =====================================
    // DANH MỤC SẢN PHẨM
    // =====================================

    const categories = [
        'Tất cả',
        ...new Set(
            products
                .map(product => product.category)
                .filter(Boolean)
        )
    ];

    // =====================================
    // LỌC SẢN PHẨM
    // =====================================

    const filteredProducts = products.filter((product) => {

        const matchCategory =
            selectedCategory === 'Tất cả' ||
            product.category === selectedCategory;

        const matchSearch =
            product.name
                ?.toLowerCase()
                .includes(searchTerm.toLowerCase().trim());

        return matchCategory && matchSearch;
    });

    // =====================================
    // NÚT TÌM KIẾM
    // =====================================

    const handleSearch = () => {
        document.getElementById('products')?.scrollIntoView({
            behavior: 'smooth'
        });
    };

    // =====================================
    // THÊM SẢN PHẨM VÀO GIỎ HÀNG
    // =====================================

    const handleAddToCart = (product) => {

        if (!addToCart) {
            alert('Chức năng giỏ hàng chưa được kết nối!');
            return;
        }

        if (
            !product.batch ||
            product.batch === 'N/A' ||
            product.current_quantity <= 0
        ) {
            alert('Sản phẩm hiện chưa có lô hàng còn tồn kho.');
            return;
        }

        if (
            product.expDays !== null &&
            product.expDays < 0
        ) {
            alert('Sản phẩm đã hết hạn sử dụng.');
            return;
        }

        const existing = cartItems.find(
            item => Number(item.id) === Number(product.id)
        );

        const currentQuantity = existing
            ? Number(existing.quantity || 0)
            : 0;

        if (currentQuantity + 1 > product.current_quantity) {
            alert('Số lượng tồn kho không đủ!');
            return;
        }

        addToCart(product);
    };

    // =====================================
    // TRUY XUẤT NGUỒN GỐC
    // =====================================

    const handleTraceability = (product) => {

        if (
            !product.batch ||
            product.batch === 'N/A'
        ) {
            alert('Sản phẩm chưa có lô hàng để truy xuất.');
            return;
        }

        // Điều hướng thông qua App.jsx
        if (onNavigateQr) {
            onNavigateQr(product.batch);
        } else {
            alert('Chức năng truy xuất chưa được kết nối!');
        }
    };

    // =====================================
    // TỔNG SẢN PHẨM TRONG GIỎ
    // =====================================

    const cartCount = cartItems.reduce(
        (total, item) => total + Number(item.quantity || 0),
        0
    );

    // =====================================
    // ĐI ĐẾN TRANG GIỎ HÀNG
    // =====================================

    const handleGoToCart = () => {

        // Điều hướng thông qua App.jsx
        if (onGoToCart) {
            onGoToCart();
        } else {
            alert('Chức năng giỏ hàng chưa được kết nối!');
        }
    };

    // =====================================
    // GIAO DIỆN
    // =====================================

    return (

        <div id="home" className="min-h-screen bg-gray-50">

            {/* ==============================
                BANNER
            ============================== */}

            <section className="relative overflow-hidden bg-green-700 px-4 py-20 text-white md:py-28">

                <div className="absolute inset-0 pointer-events-none opacity-10">

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
                            onClick={handleSearch}
                            className="rounded-lg bg-white px-7 py-3 font-bold text-green-700 transition hover:bg-green-50 hover:shadow-lg"
                        >
                            Mua sắm ngay
                        </button>

                    </div>

                </div>

            </section>

            {/* ==============================
                TÌM KIẾM SẢN PHẨM
            ============================== */}

            <section className="relative z-10 mx-auto -mt-8 max-w-4xl px-4">

                <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3 shadow-lg">

                    <Search
                        size={23}
                        className="ml-3 shrink-0 text-gray-400"
                    />

                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                handleSearch();
                            }
                        }}
                        placeholder="Tìm kiếm rau củ, trái cây..."
                        className="w-full border-none bg-transparent py-3 text-gray-700 outline-none"
                    />

                    <button
                        onClick={handleSearch}
                        className="shrink-0 rounded-lg bg-green-600 px-5 py-3 font-semibold text-white transition hover:bg-green-700"
                    >
                        Tìm kiếm
                    </button>

                </div>

            </section>

            {/* ==============================
                DANH SÁCH SẢN PHẨM
            ============================== */}

            <section
                id="products"
                className="mx-auto max-w-7xl px-4 pb-24 pt-8"
            >

                {/* TIÊU ĐỀ */}

                <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-center">

                    <div>

                        <span className="font-semibold uppercase tracking-widest text-green-600">
                            OrganicFarm
                        </span>

                        <h2 className="mt-2 text-3xl font-bold text-gray-800">
                            Sản Phẩm Nổi Bật
                        </h2>

                        <p className="mt-2 text-gray-500">
                            Nông sản tươi ngon được lấy trực tiếp từ cơ sở dữ liệu.
                        </p>

                    </div>

                </div>

                {/* ==============================
                    DANH MỤC
                ============================== */}

                <div className="mb-5">

                    <div className="mb-3 flex items-center gap-2 text-gray-700">

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

                {/* ==============================
                    ĐANG TẢI
                ============================== */}

                {loading && (

                    <div className="flex flex-col items-center py-20 text-green-700">

                        <Loader2
                            size={40}
                            className="animate-spin"
                        />

                        <p className="mt-4 font-semibold">
                            Đang tải sản phẩm...
                        </p>

                    </div>

                )}

                {/* ==============================
                    LỖI API
                ============================== */}

                {!loading && error && (

                    <div className="rounded-2xl bg-red-50 px-6 py-12 text-center">

                        <h3 className="text-xl font-bold text-red-700">
                            Không thể tải sản phẩm
                        </h3>

                        <p className="mt-2 text-red-600">
                            {error}
                        </p>

                        <p className="mt-2 text-sm text-gray-500">
                            Hãy kiểm tra Backend Laravel và API /api/v1/products.
                        </p>

                        <button
                            onClick={fetchProducts}
                            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2 text-white transition hover:bg-green-700"
                        >

                            <RefreshCw size={18} />

                            Thử lại

                        </button>

                    </div>

                )}

                {/* ==============================
                    DANH SÁCH SẢN PHẨM
                ============================== */}

                {!loading && !error && filteredProducts.length > 0 && (

                    <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">

                        {filteredProducts.map((p) => (

                            <div
                                key={p.id}
                                className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                            >

                                {/* ẢNH SẢN PHẨM */}

                                <div className="relative h-64 overflow-hidden bg-gray-100">

                                    {p.image ? (

                                        <img
                                            src={p.image}
                                            alt={p.name}
                                            loading="lazy"
                                            className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                                            onError={(e) => {
                                                e.currentTarget.style.display = 'none';
                                            }}
                                        />

                                    ) : (

                                        <div className="flex h-full items-center justify-center">

                                            <Leaf
                                                size={60}
                                                className="text-green-300"
                                            />

                                        </div>

                                    )}

                                    {/* CHỨNG NHẬN */}

                                    {p.cert && (

                                        <span className="absolute left-4 top-4 flex items-center gap-1 rounded-full bg-green-600 px-3 py-1.5 text-xs font-bold text-white shadow">

                                            <CheckCircle2 size={14} />

                                            {p.cert}

                                        </span>

                                    )}

                                    {/* TRUY XUẤT */}

                                    <button
                                        onClick={() => handleTraceability(p)}
                                        disabled={!p.batch || p.batch === 'N/A'}
                                        className="absolute bottom-4 right-4 flex items-center gap-2 rounded-lg bg-white/95 px-3 py-2 text-sm font-semibold text-green-700 shadow transition hover:bg-green-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                                    >

                                        <QrCode size={18} />

                                        Truy xuất

                                    </button>

                                </div>

                                {/* THÔNG TIN SẢN PHẨM */}

                                <div className="p-5">

                                    <span className="text-xs font-semibold uppercase tracking-wide text-green-600">
                                        {p.category}
                                    </span>

                                    <h3 className="mb-3 mt-2 text-xl font-bold text-gray-800">
                                        {p.name}
                                    </h3>

                                    {/* HẠN SỬ DỤNG */}

                                    <div className={`mb-4 flex items-center gap-2 text-sm ${
                                        p.expDays !== null && p.expDays < 0
                                            ? 'text-red-600'
                                            : 'text-gray-500'
                                    }`}>

                                        <Clock size={16} />

                                        {p.expDays !== null
                                            ? p.expDays >= 0
                                                ? `Hạn sử dụng còn: ${p.expDays} ngày`
                                                : 'Sản phẩm đã hết hạn'
                                            : 'Chưa có thông tin hạn sử dụng'}

                                    </div>

                                    {/* GIÁ */}

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

                                    {/* MÃ LÔ */}

                                    <div className="mb-2 text-xs text-gray-400">
                                        Mã lô: {p.batch || 'Chưa có lô hàng'}
                                    </div>

                                    {/* TỒN KHO */}

                                    <div className="mb-4 text-xs text-gray-400">
                                        Tồn kho: {p.current_quantity} {p.unit}
                                    </div>

                                    {/* THÊM GIỎ HÀNG */}

                                    <button
                                        onClick={() => handleAddToCart(p)}
                                        disabled={
                                            !p.batch ||
                                            p.batch === 'N/A' ||
                                            p.current_quantity <= 0 ||
                                            (p.expDays !== null && p.expDays < 0)
                                        }
                                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 py-3 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                                    >

                                        <ShoppingCart size={19} />

                                        {!p.batch ||
                                        p.batch === 'N/A' ||
                                        p.current_quantity <= 0
                                            ? 'Tạm hết hàng'
                                            : (p.expDays !== null && p.expDays < 0)
                                                ? 'Sản phẩm hết hạn'
                                                : 'Thêm vào giỏ hàng'}

                                    </button>

                                </div>

                            </div>

                        ))}

                    </div>

                )}

                {/* ==============================
                    KHÔNG CÓ SẢN PHẨM
                ============================== */}

                {!loading && !error && filteredProducts.length === 0 && (

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

            {/* ==============================
                BONG BÓNG GIỎ HÀNG CỐ ĐỊNH
            ============================== */}

            <button
                onClick={handleGoToCart}
                className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-full bg-green-600 px-5 py-4 text-white shadow-2xl transition-all duration-300 hover:scale-110 hover:bg-green-700"
                title="Đi đến giỏ hàng"
                aria-label={`Đi đến giỏ hàng, có ${cartCount} sản phẩm`}
            >

                <div className="relative">

                    <ShoppingCart size={28} />

                    {/* BADGE SỐ LƯỢNG */}

                    <span className="absolute -right-3 -top-3 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white ring-2 ring-white">

                        {cartCount}

                    </span>

                </div>

                <span className="font-bold">
                    Giỏ hàng
                </span>

            </button>

        </div>
    );
}
