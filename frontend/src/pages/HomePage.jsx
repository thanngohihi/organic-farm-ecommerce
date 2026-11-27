
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
    RefreshCw,
    X,
    ArrowRight,
    Copy,
    Check,
    BookOpen,
    Sprout
} from 'lucide-react';

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';

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

    // Trạng thái thêm vào giỏ (AJAX checking tồn kho + Loading Spinner)
    const [addingProductId, setAddingProductId] = useState(null);

    // Popup QR & Popup Chi tiết sản phẩm (kèm Nhật ký canh tác)
    const [qrProduct, setQrProduct] = useState(null);
    const [copied, setCopied] = useState(false);
    const [detailProduct, setDetailProduct] = useState(null);
    const [detailLogs, setDetailLogs] = useState([]);
    const [detailLoading, setDetailLoading] = useState(false);

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

                const basePrice = Number(product.price || 0);
                const isFlashSale = Boolean(product.is_flash_sale);
                const discountPercent = Number(product.discount_percent || 0);
                const effectivePrice =
                    isFlashSale && Number(product.sale_price) > 0
                        ? Number(product.sale_price)
                        : basePrice;

                return {
                    ...product,
                    id: product.id,
                    name: product.name,
                    price: effectivePrice,
                    base_price: basePrice,
                    sale_price: effectivePrice,
                    is_flash_sale: isFlashSale,
                    discount_percent: discountPercent,
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
    // DANH MỤC
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
    // TÌM KIẾM
    // =====================================

    const handleSearch = () => {
        document.getElementById('products')?.scrollIntoView({
            behavior: 'smooth'
        });
    };

    // =====================================
    // THÊM VÀO GIỎ HÀNG (AJAX + SPINNER)
    // =====================================

    const handleAddToCart = async (product) => {

        if (!addToCart) {
            alert('Chức năng giỏ hàng chưa được kết nối!');
            return;
        }

        if (addingProductId === product.id) return;

        setAddingProductId(product.id);
        try {
            const result = await addToCart(product);
            if (result && typeof result.available_stock === 'number') {
                setProducts((prev) =>
                    prev.map((item) =>
                        Number(item.id) === Number(product.id)
                            ? { ...item, current_quantity: result.available_stock }
                            : item
                    )
                );
            }
        } finally {
            setAddingProductId(null);
        }
    };

    // =====================================
    // MỞ CHI TIẾT SẢN PHẨM & NHẬT KÝ CANH TÁC
    // =====================================

    const handleOpenDetail = async (product) => {
        setDetailProduct(product);
        setDetailLogs([]);

        if (!product?.batch || product.batch === 'N/A') return;

        setDetailLoading(true);
        try {
            const res = await axios.get(
                `${API_URL}/batches/qr/${encodeURIComponent(product.batch)}`
            );
            const data = res.data?.data ?? res.data;
            const logs = Array.isArray(data?.farming_logs)
                ? data.farming_logs
                : [];
            setDetailLogs(logs);
        } catch {
            setDetailLogs([]);
        } finally {
            setDetailLoading(false);
        }
    };

    // =====================================
    // MỞ POPUP QR
    // =====================================

    const handleOpenQr = (product) => {

        if (
            !product.batch ||
            product.batch === 'N/A'
        ) {
            alert('Sản phẩm chưa có mã lô để truy xuất.');
            return;
        }

        setCopied(false);
        setQrProduct(product);
    };

    // =====================================
    // CHUYỂN SANG TRUY XUẤT NGUỒN GỐC
    // =====================================

    const handleTraceability = (product) => {

        if (
            !product?.batch ||
            product.batch === 'N/A'
        ) {
            alert('Sản phẩm chưa có lô hàng để truy xuất.');
            return;
        }

        setQrProduct(null);

        if (onNavigateQr) {
            onNavigateQr(product.batch);
        } else {
            alert('Chức năng truy xuất chưa được kết nối!');
        }
    };

    // =====================================
    // COPY MÃ LÔ
    // =====================================

    const handleCopyBatch = async () => {
        if (!qrProduct?.batch) return;

        try {
            await navigator.clipboard.writeText(qrProduct.batch);
            setCopied(true);

            setTimeout(() => {
                setCopied(false);
            }, 2000);

        } catch {
            alert('Không thể sao chép mã lô trên trình duyệt này.');
        }
    };

    // =====================================
    // TỔNG GIỎ HÀNG
    // =====================================

    const cartCount = cartItems.reduce(
        (total, item) => total + Number(item.quantity || 0),
        0
    );

    // =====================================
    // ĐI ĐẾN GIỎ HÀNG
    // =====================================

    const handleGoToCart = () => {

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

            {/* BANNER */}

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

            {/* TÌM KIẾM */}

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
                            if (e.key === 'Enter') handleSearch();
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

            {/* DANH SÁCH SẢN PHẨM */}

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
                            Nông sản tươi ngon được lấy trực tiếp từ nông trại.
                        </p>

                    </div>

                </div>

                {/* DANH MỤC */}

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

                {/* ĐANG TẢI */}

                {loading && (

                    <div className="flex flex-col items-center py-20 text-green-700">

                        <Loader2 size={40} className="animate-spin" />

                        <p className="mt-4 font-semibold">
                            Đang tải sản phẩm...
                        </p>

                    </div>

                )}

                {/* LỖI API */}

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

                {/* SẢN PHẨM */}

                {!loading && !error && filteredProducts.length > 0 && (

                    <div className="grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3">

                        {filteredProducts.map((p) => (

                            <div
                                key={p.id}
                                className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                            >

                                {/* ẢNH */}

                                <div
                                    onClick={() => handleOpenDetail(p)}
                                    className="relative h-64 cursor-pointer overflow-hidden bg-gray-100"
                                >

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

                                    {/* CHỨNG NHẬN & FLASH SALE */}

                                    {p.cert && (

                                        <span className="absolute left-4 top-4 flex items-center gap-1 rounded-full bg-green-600 px-3 py-1.5 text-xs font-bold text-white shadow">
                                            <CheckCircle2 size={14} />
                                            {p.cert}
                                        </span>

                                    )}

                                    {p.is_flash_sale && p.discount_percent > 0 && (
                                        <span className="absolute right-4 top-4 rounded-full bg-rose-600 px-3 py-1.5 text-xs font-bold text-white shadow">
                                            🔥 Flash Sale -{p.discount_percent}%
                                        </span>
                                    )}

                                    {/* NÚT QR NHỎ */}

                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenQr(p);
                                        }}
                                        disabled={!p.batch || p.batch === 'N/A'}
                                        title="Xem mã QR và mã lô"
                                        aria-label={`Xem mã QR ${p.name}`}
                                        className="absolute bottom-4 right-4 flex items-center justify-center rounded-xl bg-white p-3 text-green-700 shadow-lg transition hover:scale-110 hover:bg-green-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <QrCode size={22} />
                                    </button>

                                </div>

                                {/* THÔNG TIN */}

                                <div className="p-5">

                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs font-semibold uppercase tracking-wide text-green-600">
                                            {p.category}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleOpenDetail(p)}
                                            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:underline"
                                        >
                                            <BookOpen size={13} />
                                            Chi tiết &amp; Nhật ký
                                        </button>
                                    </div>

                                    <h3
                                        onClick={() => handleOpenDetail(p)}
                                        className="mb-3 mt-2 cursor-pointer text-xl font-bold text-gray-800 transition hover:text-emerald-700"
                                    >
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
                                            <span className={`text-xl font-bold ${p.is_flash_sale ? 'text-rose-600' : 'text-green-700'}`}>
                                                {p.price.toLocaleString('vi-VN')}đ
                                            </span>

                                            <span className="ml-1 text-sm text-gray-500">
                                                / {p.unit}
                                            </span>

                                            {p.is_flash_sale && p.base_price > p.price && (
                                                <span className="ml-2 text-xs text-gray-400 line-through">
                                                    {p.base_price.toLocaleString('vi-VN')}đ
                                                </span>
                                            )}
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

                                    {/* THÊM GIỎ */}

                                    <button
                                        type="button"
                                        onClick={() => handleAddToCart(p)}
                                        disabled={
                                            addingProductId === p.id ||
                                            !p.batch ||
                                            p.batch === 'N/A' ||
                                            p.current_quantity <= 0 ||
                                            (p.expDays !== null && p.expDays < 0)
                                        }
                                        className={`flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 py-3 font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed ${
                                            addingProductId === p.id
                                                ? 'opacity-70 bg-green-600'
                                                : 'disabled:bg-gray-400'
                                        }`}
                                    >

                                        {addingProductId === p.id ? (
                                            <>
                                                <Loader2 size={19} className="animate-spin" />
                                                Đang kiểm tra kho...
                                            </>
                                        ) : (
                                            <>
                                                <ShoppingCart size={19} />
                                                {!p.batch ||
                                                p.batch === 'N/A' ||
                                                p.current_quantity <= 0
                                                    ? 'Tạm hết hàng'
                                                    : (p.expDays !== null && p.expDays < 0)
                                                        ? 'Sản phẩm hết hạn'
                                                        : 'Thêm vào giỏ hàng'}
                                            </>
                                        )}

                                    </button>

                                </div>

                            </div>

                        ))}

                    </div>

                )}

                {/* KHÔNG CÓ SẢN PHẨM */}

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

            {/* POPUP CHI TIẾT SẢN PHẨM & NHẬT KÝ CANH TÁC */}

            {detailProduct && (
                <div
                    className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setDetailProduct(null);
                        }
                    }}
                >
                    <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-6">
                        <button
                            type="button"
                            onClick={() => setDetailProduct(null)}
                            className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                            aria-label="Đóng chi tiết sản phẩm"
                        >
                            <X size={20} />
                        </button>

                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                            <div className="overflow-hidden rounded-2xl bg-gray-100 h-56 sm:h-64">
                                {detailProduct.image ? (
                                    <img
                                        src={detailProduct.image}
                                        alt={detailProduct.name}
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <div className="flex h-full items-center justify-center">
                                        <Leaf size={48} className="text-green-400" />
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col justify-between">
                                <div>
                                    <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                                        {detailProduct.category} {detailProduct.cert ? `• ${detailProduct.cert}` : ''}
                                    </span>

                                    <h2 className="mt-2.5 text-xl font-extrabold text-gray-900">
                                        {detailProduct.name}
                                    </h2>

                                    <p className="mt-2 text-2xl font-extrabold text-emerald-700">
                                        {Number(detailProduct.price || 0).toLocaleString('vi-VN')}đ
                                        <span className="ml-1 text-sm font-normal text-gray-500">
                                            / {detailProduct.unit}
                                        </span>
                                    </p>

                                    <div className="mt-3 space-y-1 text-xs text-gray-600">
                                        <p>Lô FEFO đang bán: <strong className="font-mono text-emerald-700">{detailProduct.batch || 'N/A'}</strong></p>
                                        <p>Tồn kho khả dụng: <strong>{detailProduct.current_quantity} {detailProduct.unit}</strong></p>
                                        <p>Hạn sử dụng: <strong>{detailProduct.expiry_date || '—'}</strong></p>
                                    </div>

                                    {detailProduct.description && (
                                        <p className="mt-3 text-xs leading-relaxed text-gray-500">
                                            {detailProduct.description}
                                        </p>
                                    )}
                                </div>

                                <div className="mt-4 flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleAddToCart(detailProduct)}
                                        disabled={
                                            addingProductId === detailProduct.id ||
                                            !detailProduct.batch ||
                                            detailProduct.batch === 'N/A' ||
                                            detailProduct.current_quantity <= 0
                                        }
                                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                                    >
                                        {addingProductId === detailProduct.id ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <ShoppingCart size={16} />
                                        )}
                                        Thêm vào giỏ
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const batchCode = detailProduct.batch;
                                            setDetailProduct(null);
                                            if (batchCode && onNavigateQr) onNavigateQr(batchCode);
                                        }}
                                        disabled={!detailProduct.batch || detailProduct.batch === 'N/A'}
                                        className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                                    >
                                        <QrCode size={16} />
                                        Truy xuất QR
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* NHẬT KÝ CANH TÁC & QR TRONG CHI TIẾT */}
                        <div className="mt-5 grid grid-cols-1 gap-4 border-t border-gray-100 pt-4 sm:grid-cols-3">
                            <div className="sm:col-span-2">
                                <h3 className="mb-2.5 flex items-center gap-1.5 text-sm font-bold text-gray-800">
                                    <Sprout size={16} className="text-emerald-600" />
                                    Nhật ký canh tác lô {detailProduct.batch || 'N/A'}
                                </h3>
                                {detailLoading ? (
                                    <div className="flex items-center gap-2 py-4 text-xs text-gray-500">
                                        <Loader2 size={15} className="animate-spin text-emerald-600" />
                                        Đang tải nhật ký canh tác...
                                    </div>
                                ) : detailLogs.length === 0 ? (
                                    <p className="rounded-xl bg-gray-50 p-3 text-xs text-gray-500">
                                        Chưa có nhật ký canh tác nào cho lô này.
                                    </p>
                                ) : (
                                    <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                                        {detailLogs.map((log, i) => (
                                            <div key={log.id || i} className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-2.5 text-xs">
                                                <div className="flex items-center justify-between gap-2 font-bold text-emerald-900">
                                                    <span>{log.title || log.stage || 'Hoạt động canh tác'}</span>
                                                    <span className="font-normal text-gray-500">
                                                        {log.logged_at ? String(log.logged_at).slice(0, 10) : ''}
                                                    </span>
                                                </div>
                                                {log.description && (
                                                    <p className="mt-1 text-gray-600">{log.description}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {detailProduct.batch && detailProduct.batch !== 'N/A' && (
                                <div className="flex flex-col items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3 text-center">
                                    <img
                                        src={
                                            detailProduct.qr_code_url ||
                                            `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encodeURIComponent(
                                                `${window.location.origin}/traceability/${encodeURIComponent(detailProduct.batch)}`
                                            )}`
                                        }
                                        alt={`QR ${detailProduct.batch}`}
                                        className="h-28 w-28 rounded-xl border bg-white p-1 object-contain"
                                    />
                                    <p className="mt-2 text-[11px] text-gray-600">
                                        Quét QR để mở trang truy xuất nguồn gốc
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* POPUP QR */}

            {qrProduct && (

                <div
                    className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setQrProduct(null);
                        }
                    }}
                >

                    <div className="relative w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl sm:p-6">

                        {/* ĐÓNG */}

                        <button
                            type="button"
                            onClick={() => setQrProduct(null)}
                            className="absolute right-3.5 top-3.5 rounded-full p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                            aria-label="Đóng popup QR"
                        >
                            <X size={20} />
                        </button>

                        {/* TIÊU ĐỀ */}

                        <div className="text-center">

                            <div className="mx-auto mb-2.5 flex h-11 w-11 items-center justify-center rounded-2xl bg-green-100 text-green-700">
                                <QrCode size={24} />
                            </div>

                            <h2 className="text-xl font-bold text-gray-800">
                                Truy xuất nguồn gốc
                            </h2>

                            <p className="mt-1 text-xs text-gray-500">
                                Quét mã QR hoặc xem thông tin nguồn gốc sản phẩm.
                            </p>

                        </div>

                        {/* TÊN SẢN PHẨM */}

                        <div className="mt-3.5 rounded-2xl bg-green-50 px-4 py-2.5 text-center">

                            <h3 className="text-base font-bold text-green-800">
                                {qrProduct.name}
                            </h3>

                            <p className="mt-0.5 text-xs text-green-700">
                                {qrProduct.category}
                            </p>

                        </div>

                        {/* QR */}

                        <div className="mt-3.5 flex justify-center">

                            <div className="rounded-2xl border border-gray-200 bg-white p-2.5 shadow-sm">

                                <img
                                    src={
                                        qrProduct.qr_code_url ||
                                        `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=10&data=${encodeURIComponent(
                                            `${window.location.origin}/traceability/${encodeURIComponent(qrProduct.batch)}`
                                        )}`
                                    }
                                    alt={`QR truy xuất ${qrProduct.batch}`}
                                    className="h-36 w-36 object-contain"
                                />

                            </div>

                        </div>

                        {/* MÃ LÔ */}

                        <div className="mt-3.5 rounded-2xl border border-green-200 bg-green-50 px-4 py-2.5">

                            <p className="text-center text-[11px] font-semibold uppercase tracking-wider text-green-600">
                                Mã lô sản phẩm
                            </p>

                            <div className="mt-1 flex items-center justify-center gap-2">

                                <p className="break-all text-center text-base font-bold text-green-800">
                                    {qrProduct.batch}
                                </p>

                                <button
                                    type="button"
                                    onClick={handleCopyBatch}
                                    title="Sao chép mã lô"
                                    className="shrink-0 rounded-lg p-1.5 text-green-700 transition hover:bg-green-100"
                                >
                                    {copied
                                        ? <Check size={16} />
                                        : <Copy size={16} />
                                    }
                                </button>

                            </div>

                            {copied && (
                                <p className="mt-1 text-center text-xs font-medium text-green-700">
                                    Đã sao chép mã lô!
                                </p>
                            )}

                        </div>

                        {/* HƯỚNG DẪN */}

                        <p className="mt-3 text-center text-xs leading-relaxed text-gray-500">
                            Nhấn nút bên dưới để xem toàn bộ nhật ký
                            canh tác và thông tin nguồn gốc sản phẩm.
                        </p>

                        {/* CHUYỂN TRANG */}

                        <button
                            type="button"
                            onClick={() => handleTraceability(qrProduct)}
                            className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 py-2.5 text-sm font-bold text-white shadow-lg shadow-green-600/20 transition hover:bg-green-700"
                        >
                            Truy xuất nguồn gốc
                            <ArrowRight size={18} />
                        </button>

                        {/* ĐÓNG */}

                        <button
                            type="button"
                            onClick={() => setQrProduct(null)}
                            className="mt-2 w-full rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
                        >
                            Đóng
                        </button>

                    </div>

                </div>

            )}

        </div>
    );
}
