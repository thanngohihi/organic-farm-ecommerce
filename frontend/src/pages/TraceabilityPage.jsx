
import React, { useState, useEffect } from 'react';

import {
    QrCode,
    Calendar,
    UserCheck,
    ShieldCheck,
    CheckCircle2,
    Search,
    FileText,
    Loader2,
    AlertCircle,
    Sprout,
    RefreshCw,
    Package,
    MapPin
} from 'lucide-react';

import axios from 'axios';
import MediaLightbox, { isVideoMediaUrl } from '../components/MediaLightbox';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';

// =====================================
// NHÃN CÁC GIAI ĐOẠN CANH TÁC
// =====================================

const STAGE_LABELS = {
    gieo_hat: {
        label: 'Gieo hạt giống',
        color: 'bg-blue-600'
    },
    bon_phan: {
        label: 'Bón phân vi sinh',
        color: 'bg-amber-600'
    },
    tuoi_tieu: {
        label: 'Tưới nước định kỳ',
        color: 'bg-cyan-600'
    },
    phong_tru_sau_benh: {
        label: 'Phòng trừ sâu bệnh',
        color: 'bg-purple-600'
    },
    kiem_dinh: {
        label: 'Kiểm định chất lượng',
        color: 'bg-indigo-600'
    },
    thu_hoach: {
        label: 'Thu hoạch & đóng gói',
        color: 'bg-emerald-600'
    }
};

// =====================================
// COMPONENT TRUY XUẤT NGUỒN GỐC
// =====================================

export default function TraceabilityPage({ initialBatchCode }) {

    const [batchInput, setBatchInput] = useState(
        initialBatchCode || ''
    );

    const [loading, setLoading] = useState(false);

    const [traceData, setTraceData] = useState(null);

    const [error, setError] = useState('');
    const [previewMedia, setPreviewMedia] = useState(null);

    // =====================================
    // TRA CỨU MÃ LÔ
    // =====================================

    const fetchTraceData = async (batchCode) => {

        const code = String(batchCode || '').trim();

        if (!code) {
            setError('Vui lòng nhập mã lô sản phẩm!');
            setTraceData(null);
            return;
        }

        setLoading(true);
        setError('');
        setTraceData(null);
        setBatchInput(code);

        try {

            const res = await axios.get(
                `${API_URL}/batches/qr/${encodeURIComponent(code)}`
            );

            const result = res.data?.data ?? res.data;

            if (!result || !result.batch) {
                throw new Error(
                    'API không trả về thông tin lô sản phẩm.'
                );
            }

            setTraceData(result);

        } catch (err) {

            console.error('Lỗi truy xuất nguồn gốc:', err);

            setTraceData(null);

            setError(
                err.response?.data?.message ||
                err.message ||
                'Không thể tìm thấy thông tin truy xuất của lô sản phẩm.'
            );

        } finally {
            setLoading(false);
        }
    };

    // =====================================
    // TRA CỨU THỦ CÔNG
    // =====================================

    const handleSearch = (e) => {
        if (e) e.preventDefault();

        fetchTraceData(batchInput);
    };

    // =====================================
    // TỰ ĐỘNG TRA CỨU KHI NHẬN MÃ LÔ TỪ APP
    // =====================================

    useEffect(() => {

        if (!initialBatchCode) return;

        setBatchInput(initialBatchCode);

        fetchTraceData(initialBatchCode);

    }, [initialBatchCode]);

    // =====================================
    // LẤY DANH SÁCH NHẬT KÝ
    // =====================================

    const farmingLogs =
        traceData?.farming_logs ??
        traceData?.farmingLogs ??
        traceData?.logs ??
        [];

    // =====================================
    // LẤY THÔNG TIN LÔ
    // =====================================

    const batch = traceData?.batch || {};

    // =====================================
    // GIAO DIỆN
    // =====================================

    return (

        <div className="min-h-screen bg-gray-50 px-4 py-10">

            <div className="mx-auto max-w-5xl">

                {/* TIÊU ĐỀ */}

                <div className="mb-10 text-center">

                    <div className="mb-4 flex justify-center">

                        <div className="rounded-full bg-green-100 p-4">

                            <QrCode className="h-10 w-10 text-green-700" />

                        </div>

                    </div>

                    <h1 className="mb-3 text-3xl font-bold text-green-800">

                        Truy Xuất Nguồn Gốc Sản Phẩm

                    </h1>

                    <p className="text-gray-600">

                        Kiểm tra nguồn gốc, quá trình canh tác,
                        thu hoạch và thông tin chất lượng nông sản.

                    </p>

                </div>

                {/* FORM TRA CỨU */}

                <form
                    onSubmit={handleSearch}
                    className="mb-8 rounded-2xl bg-white p-6 shadow-md"
                >

                    <label className="mb-3 block font-semibold text-gray-700">

                        Mã lô sản phẩm

                    </label>

                    <div className="flex flex-col gap-3 sm:flex-row">

                        <input
                            type="text"
                            value={batchInput}
                            onChange={(e) => setBatchInput(e.target.value)}
                            placeholder="Nhập mã lô sản phẩm..."
                            className="flex-1 rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100"
                        />

                        <button
                            type="submit"
                            disabled={loading}
                            className="flex items-center justify-center gap-2 rounded-xl bg-green-700 px-6 py-3 font-semibold text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >

                            {loading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <Search className="h-5 w-5" />
                            )}

                            {loading
                                ? 'Đang tra cứu...'
                                : 'Tra cứu'}

                        </button>

                    </div>

                </form>

                {/* ĐANG TẢI */}

                {loading && (

                    <div className="flex flex-col items-center rounded-2xl bg-white py-16 shadow-md">

                        <Loader2
                            className="animate-spin text-green-700"
                            size={45}
                        />

                        <p className="mt-4 font-semibold text-green-700">

                            Đang tải thông tin truy xuất...

                        </p>

                        <p className="mt-2 text-sm text-gray-500">

                            Vui lòng chờ trong giây lát.

                        </p>

                    </div>

                )}

                {/* LỖI */}

                {!loading && error && (

                    <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">

                        <AlertCircle
                            className="mx-auto mb-4 text-red-500"
                            size={40}
                        />

                        <h2 className="text-xl font-bold text-red-700">

                            Không thể truy xuất sản phẩm

                        </h2>

                        <p className="mt-3 text-red-600">

                            {error}

                        </p>

                        <button
                            type="button"
                            onClick={() => fetchTraceData(batchInput)}
                            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-green-700 px-5 py-3 font-semibold text-white transition hover:bg-green-800"
                        >

                            <RefreshCw size={18} />

                            Thử lại

                        </button>

                    </div>

                )}

                {/* KẾT QUẢ */}

                {!loading && !error && traceData && (

                    <div className="space-y-8">

                        {/* THÔNG TIN LÔ */}

                        <div className="rounded-2xl bg-white p-6 shadow-md">

                            <div className="mb-5 flex items-center gap-2">

                                <ShieldCheck className="h-6 w-6 text-green-700" />

                                <h2 className="text-xl font-bold text-gray-800">

                                    Thông Tin Lô Sản Phẩm

                                </h2>

                            </div>

                            {/* TÊN SẢN PHẨM */}

                            <h3 className="mb-3 text-2xl font-bold text-green-800">

                                {batch.product_name ||
                                    batch.name ||
                                    'Chưa cập nhật tên sản phẩm'}

                            </h3>

                            {/* MÃ LÔ */}

                            <div className="mb-5 rounded-xl bg-green-50 p-4">

                                <p className="text-sm text-green-600">

                                    Mã lô sản phẩm

                                </p>

                                <p className="mt-1 break-all text-lg font-bold text-green-800">

                                    {batch.batch_code || batchInput}

                                </p>

                            </div>

                            {/* THÔNG TIN */}

                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                                {/* NGÀY THU HOẠCH */}

                                <div className="flex items-start gap-3 rounded-xl border border-gray-100 p-4">

                                    <Calendar className="mt-1 text-green-700" />

                                    <div>

                                        <p className="text-sm text-gray-500">

                                            Ngày thu hoạch

                                        </p>

                                        <p className="font-semibold text-gray-800">

                                            {batch.harvest_date ||
                                                'Chưa cập nhật'}

                                        </p>

                                    </div>

                                </div>

                                {/* HẠN SỬ DỤNG */}

                                <div className="flex items-start gap-3 rounded-xl border border-gray-100 p-4">

                                    <Calendar className="mt-1 text-green-700" />

                                    <div>

                                        <p className="text-sm text-gray-500">

                                            Hạn sử dụng

                                        </p>

                                        <p className="font-semibold text-gray-800">

                                            {batch.expiry_date ||
                                                batch.exp_date ||
                                                'Chưa cập nhật'}

                                        </p>

                                    </div>

                                </div>

                                {/* NHÂN VIÊN */}

                                <div className="flex items-start gap-3 rounded-xl border border-gray-100 p-4">

                                    <UserCheck className="mt-1 text-green-700" />

                                    <div>

                                        <p className="text-sm text-gray-500">

                                            Nhân viên phụ trách

                                        </p>

                                        <p className="font-semibold text-gray-800">

                                            {batch.farm_staff_name ||
                                                batch.staff_name ||
                                                'Chưa cập nhật'}

                                        </p>

                                    </div>

                                </div>

                                {/* CHỨNG NHẬN */}

                                <div className="flex items-start gap-3 rounded-xl border border-gray-100 p-4">

                                    <CheckCircle2 className="mt-1 text-green-700" />

                                    <div>

                                        <p className="text-sm text-gray-500">

                                            Chứng nhận

                                        </p>

                                        <p className="font-semibold text-gray-800">

                                            {batch.certification ||
                                                'Chưa cập nhật'}

                                        </p>

                                    </div>

                                </div>

                                {/* NÔNG TRẠI */}

                                {batch.farm_name && (

                                    <div className="flex items-start gap-3 rounded-xl border border-gray-100 p-4">

                                        <Sprout className="mt-1 text-green-700" />

                                        <div>

                                            <p className="text-sm text-gray-500">

                                                Nông trại

                                            </p>

                                            <p className="font-semibold text-gray-800">

                                                {batch.farm_name}

                                            </p>

                                        </div>

                                    </div>

                                )}

                                {/* ĐỊA ĐIỂM */}

                                {batch.farm_location && (

                                    <div className="flex items-start gap-3 rounded-xl border border-gray-100 p-4">

                                        <MapPin className="mt-1 text-green-700" />

                                        <div>

                                            <p className="text-sm text-gray-500">

                                                Địa điểm nông trại

                                            </p>

                                            <p className="font-semibold text-gray-800">

                                                {batch.farm_location}

                                            </p>

                                        </div>

                                    </div>

                                )}

                                {/* SỐ LƯỢNG */}

                                {batch.quantity != null && (

                                    <div className="flex items-start gap-3 rounded-xl border border-gray-100 p-4">

                                        <Package className="mt-1 text-green-700" />

                                        <div>

                                            <p className="text-sm text-gray-500">

                                                Số lượng lô

                                            </p>

                                            <p className="font-semibold text-gray-800">

                                                {batch.quantity}

                                            </p>

                                        </div>

                                    </div>

                                )}

                            </div>

                            {/* GIẤY CHỨNG NHẬN */}

                            {batch.certification_doc_url && (

                                <a
                                    href={batch.certification_doc_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-5 inline-flex items-center gap-2 text-green-700 hover:underline"
                                >

                                    <FileText className="h-5 w-5" />

                                    Xem giấy chứng nhận

                                </a>

                            )}

                        </div>

                        {/* TIMELINE */}

                        <div className="rounded-2xl bg-white p-6 shadow-md">

                            <div className="mb-8 flex items-center gap-2">

                                <Sprout className="h-6 w-6 text-green-700" />

                                <h2 className="text-xl font-bold text-gray-800">

                                    Nhật Ký Quá Trình Canh Tác

                                </h2>

                            </div>

                            {farmingLogs.length > 0 ? (

                                <div className="space-y-8">

                                    {farmingLogs.map((log, index) => {

                                        const stageInfo =
                                            STAGE_LABELS[log.stage] || {
                                                label: log.stage ||
                                                    'Giai đoạn canh tác',
                                                color: 'bg-emerald-600'
                                            };

                                        const mediaUrls =
                                            log.media_urls ||
                                            log.media ||
                                            [];

                                        return (

                                            <div
                                                key={log.id || index}
                                                className="relative border-l-4 border-green-200 pb-2 pl-6"
                                            >

                                                {/* NHÃN GIAI ĐOẠN */}

                                                <span
                                                    className={`inline-block rounded-full px-3 py-1 text-sm font-semibold text-white ${stageInfo.color}`}
                                                >

                                                    {stageInfo.label}

                                                </span>

                                                {/* NGÀY */}

                                                <p className="mt-2 text-sm text-gray-500">

                                                    {log.logged_at ||
                                                        log.created_at ||
                                                        'Chưa cập nhật ngày'}

                                                </p>

                                                {/* TIÊU ĐỀ */}

                                                <h3 className="mt-2 text-lg font-bold text-gray-800">

                                                    {log.title ||
                                                        'Nhật ký canh tác'}

                                                </h3>

                                                {/* MÔ TẢ */}

                                                <p className="mt-2 whitespace-pre-line leading-relaxed text-gray-600">

                                                    {log.description ||
                                                        'Chưa có mô tả.'}

                                                </p>

                                                {/* HÌNH ẢNH */}

                                                {Array.isArray(mediaUrls) &&
                                                    mediaUrls.length > 0 && (

                                                        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">

                                                            {mediaUrls.map(
                                                                (media, mediaIndex) => {

                                                                    const url =
                                                                        typeof media === 'string'
                                                                            ? media
                                                                            : media?.url;

                                                                    if (!url) return null;

                                                                    const isVideo = isVideoMediaUrl(url);

                                                                    if (isVideo) {
                                                                        return (
                                                                            <div
                                                                                key={mediaIndex}
                                                                                className="overflow-hidden rounded-xl border border-gray-200 bg-black"
                                                                            >
                                                                                <video
                                                                                    src={url}
                                                                                    controls
                                                                                    className="h-40 w-full object-cover"
                                                                                />
                                                                            </div>
                                                                        );
                                                                    }

                                                                    return (
                                                                        <button
                                                                            key={mediaIndex}
                                                                            type="button"
                                                                            onClick={() =>
                                                                                setPreviewMedia({
                                                                                    url,
                                                                                    isVideo: false,
                                                                                    title: `Nhật ký ${stageInfo.label}`,
                                                                                })
                                                                            }
                                                                            className="block w-full overflow-hidden rounded-xl border border-gray-200 text-left"
                                                                            title="Nhấn để xem ảnh lớn"
                                                                        >
                                                                            <img
                                                                                src={url}
                                                                                alt={`Hình ảnh ${stageInfo.label}`}
                                                                                loading="lazy"
                                                                                className="h-40 w-full object-cover transition hover:scale-105"
                                                                            />
                                                                        </button>
                                                                    );
                                                                }
                                                            )}

                                                        </div>

                                                    )}

                                            </div>

                                        );
                                    })}

                                </div>

                            ) : (

                                <div className="py-8 text-center">

                                    <Sprout
                                        className="mx-auto mb-4 text-gray-300"
                                        size={45}
                                    />

                                    <p className="text-gray-500">

                                        Chưa có nhật ký canh tác
                                        cho lô sản phẩm này.

                                    </p>

                                </div>

                            )}

                        </div>

                    </div>

                )}

                {/* CHƯA TRA CỨU */}

                {!loading && !error && !traceData && (

                    <div className="rounded-2xl bg-white py-12 text-center shadow-sm">

                        <QrCode
                            size={50}
                            className="mx-auto mb-4 text-green-200"
                        />

                        <h2 className="text-xl font-bold text-gray-700">

                            Truy xuất sản phẩm

                        </h2>

                        <p className="mt-2 text-gray-500">

                            Nhập mã lô sản phẩm để xem
                            thông tin nguồn gốc.

                        </p>

                    </div>

                )}

            </div>

            <MediaLightbox
                media={previewMedia}
                onClose={() => setPreviewMedia(null)}
            />

        </div>

    );
}
