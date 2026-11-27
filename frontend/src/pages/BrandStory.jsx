
import React, { useEffect, useRef, useState } from 'react';

import {
    Award,
    ShieldCheck,
    Truck,
    Sprout,
    HeartHandshake,
    ArrowRight,
    CheckCircle2,
    Leaf,
    Droplets,
    Sun,
    PackageCheck,
    MapPin,
    Recycle,
    Sparkles,
    ShoppingBasket,
    Flower2,
    TreeDeciduous
} from 'lucide-react';

const STORY_CHAPTERS = [
    { id: 'hero', label: 'Khởi nguồn Organic Farm' },
    { id: 'intro', label: 'Câu chuyện của chúng tôi' },
    { id: 'values', label: 'Giá trị cốt lõi' },
    { id: 'process', label: 'Từ hạt giống đến bàn ăn' },
    { id: 'quality', label: 'Quy trình & Kho FEFO' },
    { id: 'commitments', label: 'Cam kết khách hàng' },
    { id: 'cta', label: 'Bắt đầu mua sắm' },
];

export default function BrandStory() {
    const sectionRefs = useRef([]);
    const isAutoScrollingRef = useRef(false);
    const scrollRafRef = useRef(null);
    const cooldownUntilRef = useRef(0);
    const [activeSection, setActiveSection] = useState(0);
    const [revealedMap, setRevealedMap] = useState({ 0: true });

    const features = [
        {
            icon: Sprout,
            number: '01',
            title: 'Minh bạch nguồn gốc',
            description:
                'Mỗi lô nông sản đều được gắn mã QR, giúp khách hàng theo dõi thông tin gieo trồng, chăm sóc và thu hoạch.',
            color: 'bg-emerald-100 text-emerald-700'
        },
        {
            icon: ShieldCheck,
            number: '02',
            title: 'Chất lượng được ưu tiên',
            description:
                'Quy trình chăm sóc chú trọng kiểm soát đất, nước và chất lượng nông sản trong từng giai đoạn.',
            color: 'bg-lime-100 text-lime-700'
        },
        {
            icon: Truck,
            number: '03',
            title: 'Tươi ngon mỗi ngày',
            description:
                'Ưu tiên thu hoạch và vận chuyển nhanh chóng để nông sản giữ được độ tươi ngon khi đến tay khách hàng.',
            color: 'bg-teal-100 text-teal-700'
        }
    ];

    const process = [
        {
            icon: Sun,
            step: '01',
            title: 'Gieo trồng',
            description: 'Bắt đầu từ đất trồng và nguồn nước được kiểm soát.'
        },
        {
            icon: Droplets,
            step: '02',
            title: 'Chăm sóc',
            description: 'Theo dõi quá trình sinh trưởng và nhật ký canh tác.'
        },
        {
            icon: Flower2,
            step: '03',
            title: 'Thu hoạch',
            description: 'Lựa chọn nông sản đạt chất lượng để thu hoạch.'
        },
        {
            icon: PackageCheck,
            step: '04',
            title: 'Giao đến nhà',
            description: 'Đóng gói và giao nông sản đến tận tay khách hàng.'
        }
    ];

    const commitments = [
        {
            icon: ShieldCheck,
            title: 'Kiểm soát chất lượng',
            description:
                'Theo dõi chất lượng nông sản qua từng giai đoạn từ nông trại đến người tiêu dùng.'
        },
        {
            icon: Truck,
            title: 'Giao hàng tận tâm',
            description:
                'Đóng gói cẩn thận, vận chuyển phù hợp và hỗ trợ khách hàng khi có vấn đề phát sinh.'
        },
        {
            icon: HeartHandshake,
            title: 'Khách hàng là ưu tiên',
            description:
                'Lắng nghe phản hồi và không ngừng cải thiện trải nghiệm mua sắm.'
        }
    ];

    const getHeaderHeight = () => {
        const headerEl = document.querySelector('header');
        return headerEl ? headerEl.getBoundingClientRect().height : 68;
    };

    const getSectionTargetY = (index) => {
        if (index <= 0) return 0;
        const el = sectionRefs.current[index];
        if (!el) return 0;
        const headerHeight = getHeaderHeight();
        return Math.max(0, Math.round(window.scrollY + el.getBoundingClientRect().top - headerHeight));
    };

    const scrollToSection = (index, duration = 720) => {
        const clamped = Math.max(0, Math.min(STORY_CHAPTERS.length - 1, index));
        const targetY = getSectionTargetY(clamped);

        if (scrollRafRef.current !== null) {
            cancelAnimationFrame(scrollRafRef.current);
            scrollRafRef.current = null;
        }

        setActiveSection(clamped);
        setRevealedMap((prev) => ({ ...prev, [clamped]: true }));

        const startY = window.scrollY;
        const distance = targetY - startY;
        if (Math.abs(distance) < 4) {
            isAutoScrollingRef.current = false;
            return;
        }

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
                cooldownUntilRef.current = performance.now() + 180;
            }
        };

        scrollRafRef.current = requestAnimationFrame(step);
    };

    useEffect(() => {
        const detectActiveSection = () => {
            const headerHeight = getHeaderHeight();
            const probeY = window.scrollY + headerHeight + window.innerHeight * 0.35;

            let detected = 0;
            sectionRefs.current.forEach((el, idx) => {
                if (!el) return;
                const elTop = window.scrollY + el.getBoundingClientRect().top;
                if (elTop <= probeY) {
                    detected = idx;
                }
            });
            setActiveSection(detected);
            setRevealedMap((prev) => (prev[detected] ? prev : { ...prev, [detected]: true }));
        };

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        const idx = Number(entry.target.getAttribute('data-story-index'));
                        if (!Number.isNaN(idx)) {
                            setRevealedMap((prev) => (prev[idx] ? prev : { ...prev, [idx]: true }));
                        }
                    }
                });
            },
            { threshold: 0.15 }
        );

        sectionRefs.current.forEach((el) => {
            if (el) observer.observe(el);
        });

        const handleWheel = (e) => {
            if (window.innerWidth < 768 || e.deltaY === 0) return;

            if (isAutoScrollingRef.current || performance.now() < cooldownUntilRef.current) {
                e.preventDefault();
                return;
            }

            const headerHeight = getHeaderHeight();
            const lastIndex = STORY_CHAPTERS.length - 1;
            const lastTargetY = getSectionTargetY(lastIndex);

            // Đang ở vùng cuối trang (gần Footer) và lăn xuống tiếp -> cuộn tự nhiên tới Footer
            if (e.deltaY > 0 && window.scrollY >= lastTargetY - 24) {
                return;
            }

            // Đang ở dưới Footer và lăn lên -> quay lại đúng đầu phần cuối
            if (e.deltaY < 0 && window.scrollY > lastTargetY + 60) {
                e.preventDefault();
                scrollToSection(lastIndex);
                return;
            }

            // Đang ở đầu trang và lăn lên -> giữ nguyên tự nhiên
            if (e.deltaY < 0 && window.scrollY <= 8) {
                return;
            }

            // Tìm phần hiện tại dựa vào mép trên sau Header
            let currentIdx = 0;
            for (let i = 0; i < sectionRefs.current.length; i++) {
                const el = sectionRefs.current[i];
                if (!el) continue;
                const rect = el.getBoundingClientRect();
                if (rect.top <= headerHeight + 80) {
                    currentIdx = i;
                }
            }

            const currentEl = sectionRefs.current[currentIdx];
            if (!currentEl) return;
            const currentRect = currentEl.getBoundingClientRect();

            if (e.deltaY > 0) {
                // Nếu phần hiện tại quá cao vượt khỏi đáy màn hình nhiều, cho cuộn đọc nốt phần đó trước
                if (currentRect.bottom > window.innerHeight + 120) {
                    return;
                }
                if (currentIdx < lastIndex) {
                    e.preventDefault();
                    scrollToSection(currentIdx + 1);
                }
            } else {
                // Nếu đã cuộn xuống sâu bên trong 1 phần cao, lăn lên sẽ về đầu chính phần đó trước
                if (currentRect.top < headerHeight - 100) {
                    e.preventDefault();
                    scrollToSection(currentIdx);
                } else if (currentIdx > 0) {
                    e.preventDefault();
                    scrollToSection(currentIdx - 1);
                } else {
                    e.preventDefault();
                    scrollToSection(0);
                }
            }
        };

        window.addEventListener('scroll', detectActiveSection, { passive: true });
        window.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            observer.disconnect();
            window.removeEventListener('scroll', detectActiveSection);
            window.removeEventListener('wheel', handleWheel);
            if (scrollRafRef.current !== null) {
                cancelAnimationFrame(scrollRafRef.current);
                scrollRafRef.current = null;
            }
            isAutoScrollingRef.current = false;
        };
    }, []);

    const getSectionMotionClass = (index) =>
        `transition-all duration-700 ${
            revealedMap[index]
                ? 'opacity-100 translate-y-0'
                : 'opacity-0 translate-y-6'
        }`;

    const handleShopNow = () => {
        window.dispatchEvent(new CustomEvent('organic:navigate', {
            detail: { page: 'home' }
        }));

        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };

    return (
        <div className="relative w-full overflow-hidden bg-white text-slate-800">

            {/* THANH CHUYỂN TỪNG PHẦN BÊN PHẢI */}

            <div className="fixed right-4 top-1/2 z-20 hidden -translate-y-1/2 flex-col items-end gap-2.5 md:flex">
                {STORY_CHAPTERS.map((chapter, index) => {
                    const isActive = activeSection === index;
                    return (
                        <button
                            key={chapter.id}
                            type="button"
                            onClick={() => scrollToSection(index)}
                            className="group flex items-center gap-2 focus:outline-none"
                            aria-label={`Đi tới phần ${index + 1}: ${chapter.label}`}
                        >
                            <span
                                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm transition-all ${
                                    isActive
                                        ? 'bg-emerald-700 text-white opacity-100 translate-x-0'
                                        : 'bg-white/95 text-slate-700 opacity-0 translate-x-2 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0'
                                }`}
                            >
                                {index + 1}. {chapter.label}
                            </span>
                            <span
                                className={`block rounded-full border transition-all ${
                                    isActive
                                        ? 'h-3.5 w-3.5 border-emerald-200 bg-emerald-600 ring-4 ring-emerald-500/20'
                                        : 'h-2.5 w-2.5 border-slate-400 bg-white/80 group-hover:scale-125 group-hover:border-emerald-600'
                                }`}
                            />
                        </button>
                    );
                })}
            </div>

            {/* ================= HERO ================= */}

            <section
                data-story-index={0}
                ref={(el) => { sectionRefs.current[0] = el; }}
                className={`relative isolate overflow-hidden bg-[#064e35] text-white ${getSectionMotionClass(0)}`}
            >

                <div className="absolute inset-0 -z-10">
                    <div className="absolute -right-32 -top-32 h-[550px] w-[550px] rounded-full border-[80px] border-white/5" />
                    <div className="absolute -bottom-60 -left-32 h-[550px] w-[550px] rounded-full bg-emerald-400/10 blur-3xl" />
                    <div className="absolute right-1/4 top-1/3 h-64 w-64 rounded-full bg-lime-300/10 blur-3xl" />
                </div>

                <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-20 md:px-8 md:py-28 lg:grid-cols-2 lg:py-32">

                    <div className="relative z-10">

                        <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-white/10 px-5 py-2.5 text-sm font-semibold text-emerald-100 backdrop-blur">
                            <Sprout size={18} />
                            ORGANIC FARM · GROWING WITH NATURE
                        </div>

                        <h1 className="text-4xl font-black leading-[1.15] tracking-tight sm:text-5xl lg:text-7xl">
                            Từ Nông Trại
                            <br />
                            <span className="text-lime-300">
                                Đến Bàn Ăn
                            </span>
                            <br />
                            Gia Đình Bạn
                        </h1>

                        <p className="mt-7 max-w-xl text-base leading-8 text-emerald-100 md:text-lg">
                            Chúng tôi tin rằng thực phẩm tốt bắt đầu từ
                            một nền nông nghiệp có trách nhiệm. Organic Farm
                            kết nối nông trại với gia đình bằng sự tươi ngon,
                            minh bạch và tận tâm.
                        </p>

                        <div className="mt-9 flex flex-wrap gap-4">

                            <button
                                onClick={handleShopNow}
                                className="group flex items-center gap-3 rounded-xl bg-lime-400 px-7 py-4 font-bold text-green-950 shadow-lg shadow-black/10 transition hover:-translate-y-1 hover:bg-lime-300"
                            >
                                Khám phá sản phẩm
                                <ArrowRight
                                    size={19}
                                    className="transition group-hover:translate-x-1"
                                />
                            </button>

                            <div className="flex items-center gap-2 rounded-xl border border-white/20 px-5 py-4 text-sm font-semibold text-white">
                                <CheckCircle2 size={19} className="text-lime-300" />
                                Hướng đến nông nghiệp bền vững
                            </div>

                        </div>

                        <div className="mt-12 grid max-w-lg grid-cols-3 gap-5 border-t border-white/15 pt-8">

                            <div>
                                <p className="text-2xl font-black text-lime-300 md:text-3xl">
                                    100%
                                </p>
                                <p className="mt-2 text-xs text-emerald-100 md:text-sm">
                                    Minh bạch thông tin
                                </p>
                            </div>

                            <div>
                                <p className="text-2xl font-black text-lime-300 md:text-3xl">
                                    QR
                                </p>
                                <p className="mt-2 text-xs text-emerald-100 md:text-sm">
                                    Truy xuất nguồn gốc
                                </p>
                            </div>

                            <div>
                                <p className="text-2xl font-black text-lime-300 md:text-3xl">
                                    FEFO
                                </p>
                                <p className="mt-2 text-xs text-emerald-100 md:text-sm">
                                    Quản lý hạn sử dụng
                                </p>
                            </div>

                        </div>

                    </div>

                    {/* HERO VISUAL */}

                    <div className="relative mx-auto w-full max-w-xl">

                        <div className="absolute -inset-5 rounded-[3rem] bg-lime-300/10 blur-2xl" />

                        <div className="relative overflow-hidden rounded-[2rem] border border-white/20 bg-gradient-to-br from-emerald-700 to-green-950 p-3 shadow-2xl">

                            <div className="relative flex min-h-[420px] flex-col justify-between overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-lime-200 via-emerald-300 to-green-700 p-7 md:min-h-[510px] md:p-10">

                                <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full border-[35px] border-white/20" />

                                <div className="absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-green-950/20 blur-xl" />

                                <div className="relative z-10 flex items-center justify-between">

                                    <span className="rounded-full bg-white/80 px-4 py-2 text-xs font-black tracking-widest text-green-900">
                                        FRESH FROM FARM
                                    </span>

                                    <Sprout size={32} className="text-green-950" />

                                </div>

                                <div className="relative z-10 py-12 text-center">

                                    <div className="mx-auto flex h-44 w-44 items-center justify-center rounded-full border border-white/40 bg-white/20 shadow-2xl backdrop-blur-sm md:h-56 md:w-56">

                                        <div className="flex h-36 w-36 items-center justify-center rounded-full bg-white/80 shadow-inner md:h-48 md:w-48">
                                            <TreeDeciduous
                                                size={115}
                                                strokeWidth={1.2}
                                                className="text-green-700"
                                            />
                                        </div>

                                    </div>

                                    <h2 className="mt-8 text-3xl font-black tracking-tight text-green-950 md:text-4xl">
                                        Grown With Love
                                    </h2>

                                    <p className="mt-3 font-semibold text-green-950/75">
                                        Tươi xanh từ thiên nhiên
                                    </p>

                                </div>

                                <div className="relative z-10 flex items-center justify-between rounded-2xl border border-white/40 bg-white/30 p-4 backdrop-blur-md">

                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-wider text-green-950/60">
                                            Our philosophy
                                        </p>
                                        <p className="mt-1 font-black text-green-950">
                                            Eat Fresh. Live Green.
                                        </p>
                                    </div>

                                    <Leaf size={35} className="text-green-900" />

                                </div>

                            </div>

                        </div>

                        <div className="absolute -bottom-7 -left-5 hidden items-center gap-3 rounded-2xl bg-white p-4 text-slate-800 shadow-xl sm:flex">

                            <div className="rounded-xl bg-green-100 p-3 text-green-700">
                                <CheckCircle2 size={26} />
                            </div>

                            <div>
                                <p className="font-bold">
                                    Tươi ngon mỗi ngày
                                </p>
                                <p className="text-xs text-slate-500">
                                    Từ nông trại đến gia đình
                                </p>
                            </div>

                        </div>

                    </div>

                </div>

                <div className="absolute bottom-0 left-0 h-2 w-full bg-gradient-to-r from-lime-300 via-emerald-400 to-green-700" />

            </section>

            {/* ================= INTRODUCTION ================= */}

            <section
                data-story-index={1}
                ref={(el) => { sectionRefs.current[1] = el; }}
                className={`px-5 py-24 md:flex md:min-h-[calc(100vh-4rem)] md:items-center md:px-8 md:py-32 ${getSectionMotionClass(1)}`}
            >

                <div className="mx-auto grid w-full max-w-7xl items-center gap-14 lg:grid-cols-2">

                    <div className="relative">

                        <div className="rounded-[2rem] bg-gradient-to-br from-green-100 via-emerald-50 to-lime-100 p-8 md:p-12">

                            <div className="relative flex min-h-[330px] flex-col items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-800 to-green-950 p-8 text-center text-white">

                                <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full border-[35px] border-white/10" />

                                <Sprout size={90} className="relative mb-5 text-lime-300" />

                                <p className="relative text-3xl font-black">
                                    Organic Farm
                                </p>

                                <p className="relative mt-3 text-sm tracking-widest text-emerald-200">
                                    TỪ NÔNG TRẠI ĐẾN BÀN ĂN
                                </p>

                            </div>

                        </div>

                        <div className="absolute -bottom-6 -right-3 rounded-2xl border border-green-100 bg-white p-5 shadow-xl md:-right-6">

                            <p className="text-sm font-bold text-green-700">
                                <HeartHandshake size={18} className="mr-2 inline" />
                                Tận tâm trong từng sản phẩm
                            </p>

                        </div>

                    </div>

                    <div>

                        <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-sm font-bold uppercase tracking-wider text-green-700">
                            <Sparkles size={16} />
                            Câu chuyện của chúng tôi
                        </span>

                        <h2 className="mt-6 text-3xl font-black leading-tight text-slate-900 md:text-5xl">
                            Một hành trình
                            <span className="text-green-700"> xanh </span>
                            bắt đầu từ những điều giản dị
                        </h2>

                        <p className="mt-7 leading-8 text-slate-600">
                            Organic Farm được xây dựng với mong muốn
                            kết nối trực tiếp nguồn nông sản từ nông trại
                            đến bàn ăn của mỗi gia đình.
                        </p>

                        <p className="mt-4 leading-8 text-slate-600">
                            Chúng tôi chú trọng từng khâu trong chuỗi cung ứng:
                            từ gieo trồng, chăm sóc, thu hoạch, bảo quản
                            đến vận chuyển. Mỗi công đoạn đều hướng đến
                            sự minh bạch và trách nhiệm.
                        </p>

                        <p className="mt-4 leading-8 text-slate-600">
                            Không chỉ bán nông sản, chúng tôi mong muốn
                            mang đến một trải nghiệm mua sắm đáng tin cậy,
                            nơi khách hàng có thể hiểu rõ hơn về nguồn gốc
                            thực phẩm mà gia đình mình sử dụng mỗi ngày.
                        </p>

                        <div className="mt-8 flex items-center gap-3 border-l-4 border-green-600 bg-green-50 p-5">

                            <Leaf size={30} className="shrink-0 text-green-700" />

                            <p className="font-bold italic leading-7 text-green-900">
                                "Sống xanh không chỉ là lựa chọn,
                                mà còn là cách chúng ta chăm sóc tương lai."
                            </p>

                        </div>

                    </div>

                </div>

            </section>

            {/* ================= CORE VALUES ================= */}

            <section
                data-story-index={2}
                ref={(el) => { sectionRefs.current[2] = el; }}
                className={`bg-slate-50 px-5 py-28 md:flex md:min-h-[calc(100vh-4rem)] md:items-center md:px-8 md:py-36 ${getSectionMotionClass(2)}`}
            >

                <div className="mx-auto w-full max-w-7xl">

                    <div className="mx-auto mb-14 max-w-2xl text-center">

                        <span className="font-bold uppercase tracking-[0.2em] text-green-700">
                            Our Core Values
                        </span>

                        <h2 className="mt-4 text-3xl font-black text-slate-900 md:text-5xl">
                            Giá trị tạo nên
                            <span className="text-green-700"> Organic Farm</span>
                        </h2>

                        <p className="mt-5 leading-8 text-slate-500">
                            Ba nền tảng quan trọng định hướng mọi hoạt động
                            và trải nghiệm mà chúng tôi mang đến khách hàng.
                        </p>

                    </div>

                    <div className="grid gap-7 md:grid-cols-3">

                        {features.map((feature) => {

                            const Icon = feature.icon;

                            return (

                                <div
                                    key={feature.number}
                                    className="group relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-8 shadow-sm transition duration-300 hover:-translate-y-2 hover:shadow-xl md:p-10"
                                >

                                    <span className="absolute right-6 top-4 text-7xl font-black text-slate-100 transition group-hover:text-green-50">
                                        {feature.number}
                                    </span>

                                    <div className={`relative mb-8 flex h-16 w-16 items-center justify-center rounded-2xl ${feature.color}`}>
                                        <Icon size={32} />
                                    </div>

                                    <h3 className="relative mb-4 text-xl font-black text-slate-900">
                                        {feature.title}
                                    </h3>

                                    <p className="relative leading-8 text-slate-500">
                                        {feature.description}
                                    </p>

                                    <div className="mt-8 h-1 w-12 rounded-full bg-green-600 transition-all duration-300 group-hover:w-24" />

                                </div>

                            );

                        })}

                    </div>

                </div>

            </section>

            {/* ================= FARM PROCESS ================= */}

            <section
                data-story-index={3}
                ref={(el) => { sectionRefs.current[3] = el; }}
                className={`relative overflow-hidden bg-[#073d2b] px-5 py-28 text-white md:flex md:min-h-[calc(100vh-4rem)] md:items-center md:px-8 md:py-36 ${getSectionMotionClass(3)}`}
            >

                <div className="absolute -right-40 top-0 h-96 w-96 rounded-full bg-emerald-400/10 blur-3xl" />

                <div className="relative mx-auto w-full max-w-7xl">

                    <div className="mx-auto mb-16 max-w-2xl text-center">

                        <span className="font-bold uppercase tracking-[0.2em] text-lime-300">
                            Our Journey
                        </span>

                        <h2 className="mt-4 text-3xl font-black md:text-5xl">
                            Từ hạt giống
                            <span className="text-lime-300"> đến bàn ăn</span>
                        </h2>

                        <p className="mt-5 leading-8 text-emerald-100">
                            Mỗi sản phẩm là kết quả của một hành trình
                            được theo dõi và chăm chút qua từng công đoạn.
                        </p>

                    </div>

                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">

                        {process.map((item, index) => {

                            const Icon = item.icon;

                            return (

                                <div
                                    key={item.step}
                                    className="relative rounded-3xl border border-white/10 bg-white/5 p-7 backdrop-blur-sm transition hover:-translate-y-2 hover:bg-white/10"
                                >

                                    <div className="mb-7 flex items-center justify-between">

                                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-lime-300 text-green-950">
                                            <Icon size={29} />
                                        </div>

                                        <span className="text-4xl font-black text-white/15">
                                            {item.step}
                                        </span>

                                    </div>

                                    <h3 className="mb-3 text-xl font-black text-lime-200">
                                        {item.title}
                                    </h3>

                                    <p className="text-sm leading-7 text-emerald-100">
                                        {item.description}
                                    </p>

                                    {index !== 3 && (
                                        <div className="absolute -right-3 top-12 z-10 hidden text-lime-300 lg:block">
                                            <ArrowRight size={22} />
                                        </div>
                                    )}

                                </div>

                            );

                        })}

                    </div>

                </div>

            </section>

            {/* ================= QUALITY COMMITMENT ================= */}

            <section
                data-story-index={4}
                ref={(el) => { sectionRefs.current[4] = el; }}
                className={`px-5 py-24 md:flex md:min-h-[calc(100vh-4rem)] md:items-center md:px-8 md:py-32 ${getSectionMotionClass(4)}`}
            >

                <div className="mx-auto grid w-full max-w-7xl items-center gap-14 lg:grid-cols-2">

                    <div>

                        <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-2 text-sm font-bold text-green-700">
                            <Award size={17} />
                            Quality Commitment
                        </span>

                        <h2 className="mt-6 text-3xl font-black leading-tight text-slate-900 md:text-5xl">
                            Chất lượng không chỉ là lời hứa, mà là một quy trình
                        </h2>

                        <p className="mt-6 leading-8 text-slate-600">
                            Organic Farm chú trọng kiểm soát chất lượng
                            trong toàn bộ quá trình vận hành, từ khâu
                            tiếp nhận nông sản đến khi sản phẩm được
                            giao đến khách hàng.
                        </p>

                        <div className="mt-8 space-y-5">

                            {[
                                'Theo dõi nhật ký canh tác và thông tin lô hàng.',
                                'Hỗ trợ khách hàng truy xuất nguồn gốc bằng QR.',
                                'Áp dụng nguyên tắc FEFO trong quản lý tồn kho.',
                                'Tiếp nhận và xử lý phản hồi khách hàng.'
                            ].map((item, index) => (

                                <div key={index} className="flex items-start gap-3">

                                    <CheckCircle2
                                        size={21}
                                        className="mt-1 shrink-0 text-green-600"
                                    />

                                    <p className="leading-7 text-slate-700">
                                        {item}
                                    </p>

                                </div>

                            ))}

                        </div>

                    </div>

                    <div className="relative">

                        <div className="rounded-[2rem] bg-gradient-to-br from-green-100 to-emerald-50 p-6 md:p-10">

                            <div className="rounded-3xl bg-[#064e35] p-8 text-white shadow-xl md:p-10">

                                <div className="mb-8 flex items-center justify-between">

                                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-lime-300 text-green-950">
                                        <PackageCheck size={30} />
                                    </div>

                                    <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-bold text-lime-200">
                                        SMART INVENTORY
                                    </span>

                                </div>

                                <h3 className="text-3xl font-black">
                                    Quản lý kho FEFO
                                </h3>

                                <p className="mt-4 leading-7 text-emerald-100">
                                    First Expired, First Out – ưu tiên xuất
                                    trước những lô hàng có hạn sử dụng gần nhất.
                                </p>

                                <div className="mt-8 space-y-4">

                                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">

                                        <div className="flex items-center gap-3">

                                            <ShieldCheck className="text-lime-300" size={23} />

                                            <span className="font-bold">
                                                Theo dõi hạn sử dụng
                                            </span>

                                        </div>

                                        <p className="mt-2 text-sm text-emerald-100">
                                            Hỗ trợ kiểm soát thời hạn của từng lô hàng.
                                        </p>

                                    </div>

                                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">

                                        <div className="flex items-center gap-3">

                                            <Recycle className="text-lime-300" size={23} />

                                            <span className="font-bold">
                                                Hạn chế lãng phí
                                            </span>

                                        </div>

                                        <p className="mt-2 text-sm text-emerald-100">
                                            Tối ưu quá trình luân chuyển hàng hóa.
                                        </p>

                                    </div>

                                    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">

                                        <div className="flex items-center gap-3">

                                            <ShoppingBasket className="text-lime-300" size={23} />

                                            <span className="font-bold">
                                                Phục vụ khách hàng
                                            </span>

                                        </div>

                                        <p className="mt-2 text-sm text-emerald-100">
                                            Hướng đến chất lượng sản phẩm tốt hơn.
                                        </p>

                                    </div>

                                </div>

                            </div>

                        </div>

                    </div>

                </div>

            </section>

            {/* ================= CUSTOMER COMMITMENTS ================= */}

            <section
                data-story-index={5}
                ref={(el) => { sectionRefs.current[5] = el; }}
                className={`bg-green-50 px-5 py-28 md:flex md:min-h-[calc(100vh-4rem)] md:items-center md:px-8 md:py-36 ${getSectionMotionClass(5)}`}
            >

                <div className="mx-auto w-full max-w-7xl">

                    <div className="mb-14 text-center">

                        <span className="font-bold uppercase tracking-[0.2em] text-green-700">
                            Our Promise
                        </span>

                        <h2 className="mt-4 text-3xl font-black text-slate-900 md:text-5xl">
                            Những điều chúng tôi cam kết
                        </h2>

                        <p className="mt-5 text-slate-500">
                            Đồng hành cùng khách hàng bằng sự minh bạch
                            và trách nhiệm.
                        </p>

                    </div>

                    <div className="grid gap-6 md:grid-cols-3">

                        {commitments.map((item, index) => {

                            const Icon = item.icon;

                            return (

                                <div
                                    key={index}
                                    className="rounded-3xl border border-green-100 bg-white p-8 transition hover:-translate-y-2 hover:shadow-xl"
                                >

                                    <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100 text-green-700">
                                        <Icon size={32} />
                                    </div>

                                    <h3 className="mb-4 text-xl font-black text-slate-900">
                                        {item.title}
                                    </h3>

                                    <p className="leading-8 text-slate-500">
                                        {item.description}
                                    </p>

                                </div>

                            );

                        })}

                    </div>

                </div>

            </section>

            {/* ================= FINAL CTA ================= */}

            <section
                data-story-index={6}
                ref={(el) => { sectionRefs.current[6] = el; }}
                className={`px-5 py-24 md:flex md:min-h-[calc(100vh-4rem)] md:items-center md:px-8 md:py-32 ${getSectionMotionClass(6)}`}
            >

                <div className="relative mx-auto w-full max-w-7xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-green-800 via-emerald-800 to-green-950 px-7 py-16 text-center text-white shadow-2xl md:px-16 md:py-24">

                    <div className="absolute -right-20 -top-24 h-80 w-80 rounded-full border-[50px] border-white/5" />

                    <div className="absolute -bottom-40 -left-20 h-96 w-96 rounded-full bg-lime-300/10 blur-3xl" />

                    <div className="relative mx-auto max-w-3xl">

                        <div className="mx-auto mb-7 flex h-20 w-20 items-center justify-center rounded-3xl bg-lime-300 text-green-950 shadow-lg">

                            <Sprout size={43} />

                        </div>

                        <span className="font-bold uppercase tracking-[0.2em] text-lime-300">
                            Organic Farm Ecommerce
                        </span>

                        <h2 className="mt-5 text-3xl font-black leading-tight md:text-5xl">
                            Chọn thực phẩm xanh,
                            <br />
                            <span className="text-lime-300">
                                sống khỏe mỗi ngày!
                            </span>
                        </h2>

                        <p className="mx-auto mt-6 max-w-2xl leading-8 text-emerald-100">
                            Hãy cùng Organic Farm xây dựng thói quen
                            tiêu dùng xanh và lựa chọn những sản phẩm
                            nông sản phù hợp cho gia đình bạn.
                        </p>

                        <button
                            onClick={handleShopNow}
                            className="group mt-9 inline-flex items-center gap-3 rounded-xl bg-lime-300 px-8 py-4 font-black text-green-950 shadow-lg transition hover:-translate-y-1 hover:bg-lime-200"
                        >
                            Bắt đầu mua sắm
                            <ArrowRight
                                size={20}
                                className="transition group-hover:translate-x-1"
                            />
                        </button>

                        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-emerald-200">
                            <MapPin size={17} />
                            Từ nông trại đến bàn ăn
                        </div>

                    </div>

                </div>

            </section>

        </div>
    );
}
