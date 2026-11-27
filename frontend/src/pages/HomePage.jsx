
import React, { useEffect, useRef, useState } from 'react';

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
    Check
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

    // Giỏ hàng nổi
    const [showFloatingCart, setShowFloatingCart] = useState(false);

    // Popup QR
    const [qrProduct, setQrProduct] = useState(null);
    const [copied, setCopied] = useState(false);

    // Ref cho thanh tìm kiếm để lăn chuột xuống/lên tự dừng mượt mà
    const searchSectionRef = useRef(null);
    const isAutoScrollingRef = useRef(false);
    const scrollRafRef = useRef(null);

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
    // HIỆN GIỎ HÀNG KHI CUỘN ĐẾN SẢN PHẨM
    // =====================================

    useEffect(() => {

        const handleScroll = () => {
            const productsSection = document.getElementById('products');

            if (!productsSection) return;

            const rect = productsSection.getBoundingClientRect();

            setShowFloatingCart(
                rect.top < window.innerHeight * 0.7
            );
        };

        window.addEventListener('scroll', handleScroll);

        handleScroll();

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };

    }, []);

    // =====================================
    // LĂN CHUỘT 1 LẦN TỰ CUỘN CHẬM XUỐNG THANH TÌM KIẾM & LÊN ĐẦU TRANG
    // =====================================

    useEffect(() => {
        const stopScrollAnimation = () => {
            if (scrollRafRef.current !== null) {
                cancelAnimationFrame(scrollRafRef.current);
                scrollRafRef.current = null;
            }
            isAutoScrollingRef.current = false;
        };

        const animateScrollTo = (targetY, duration = 1200) => {
            stopScrollAnimation();
            const startY = window.scrollY;
            const distance = targetY - startY;
            if (Math.abs(distance) < 2) return;

            isAutoScrollingRef.current = true;
            const startTime = performance.now();

            const easeInOutCubic = (t) =>
                t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

            const step = (now) => {
                const elapsed = now - startTime;
                const progress = Math.min(elapsed / duration, 1);
                const eased = easeInOutCubic(progress);

                window.scrollTo({
                    top: Math.round(startY + distance * eased),
                    behavior: 'auto',
                });

                if (progress < 1) {
                    scrollRafRef.current = requestAnimationFrame(step);
                } else {
                    window.scrollTo({ top: targetY, behavior: 'auto' });
                    scrollRafRef.current = null;
                    isAutoScrollingRef.current = false;
                }
            };

            scrollRafRef.current = requestAnimationFrame(step);
        };

        const handleWheel = (e) => {
            if (qrProduct) {
                stopScrollAnimation();
                return;
            }
            if (e.deltaY === 0) return;

            const searchEl = searchSectionRef.current;
            if (!searchEl) return;

            const headerEl = document.querySelector('header');
            const headerHeight = headerEl ? headerEl.getBoundingClientRect().height : 72;
            const searchTop = window.scrollY + searchEl.getBoundingClientRect().top;
            // Dừng ngay phía trên thanh tìm kiếm một khoảng thoáng (~24px dưới header)
            const targetTop = Math.max(0, Math.round(searchTop - headerHeight - 24));

            if (isAutoScrollingRef.current) {
                e.preventDefault();
                return;
            }

            // Lăn xuống khi đang ở vùng banner đầu trang -> cuộn chậm tới ngay trên thanh tìm kiếm
            if (e.deltaY > 0 && window.scrollY < targetTop - 16) {
                e.preventDefault();
                animateScrollTo(targetTop, 1200);
                return;
            }

            // Lăn lên khi đang ở vùng quanh thanh tìm kiếm trở lên -> cuộn chậm về đầu trang (0)
            if (e.deltaY < 0 && window.scrollY > 8 && window.scrollY <= targetTop + 140) {
                e.preventDefault();
                animateScrollTo(0, 1200);
            }
        };

        window.addEventListener('wheel', handleWheel, { passive: false });
        return () => {
            window.removeEventListener('wheel', handleWheel);
            stopScrollAnimation();
        };
    }, [qrProduct]);

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
    // THÊM VÀO GIỎ HÀNG
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

            <section ref={searchSectionRef} className="relative z-10 mx-auto -mt-8 max-w-4xl px-4">

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
                                        onClick={() => handleOpenQr(p)}
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

            {/* GIỎ HÀNG NỔI */}

            {showFloatingCart && (

                <button
                    onClick={handleGoToCart}
                    className="fixed bottom-6 right-6 z-40 flex items-center gap-3 rounded-full bg-green-600 px-5 py-4 text-white shadow-2xl transition-all duration-300 hover:scale-110 hover:bg-green-700 animate-in fade-in slide-in-from-bottom-4"
                    title="Đi đến giỏ hàng"
                    aria-label={`Đi đến giỏ hàng, có ${cartCount} sản phẩm`}
                >

                    <div className="relative">
                        <ShoppingCart size={28} />

                        <span className="absolute -right-3 -top-3 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white ring-2 ring-white">
                            {cartCount}
                        </span>
                    </div>

                    <span className="font-bold">
                        Giỏ hàng
                    </span>

                </button>

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
                                    src={qrProduct.qr_code_url || `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=10&data=${encodeURIComponent(qrProduct.batch)}`}
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
