import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import {
  AlertTriangle,
  UploadCloud,
  CheckCircle2,
  X,
  Image as ImageIcon,
  Video,
  Loader2,
  FileText,
} from 'lucide-react';
import { getAuthHeaders } from '../services/api';

// ======================================================
// API CONFIG
// ======================================================

const BASE_API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';
const API_URL = `${BASE_API}/complaints`;

const MAX_FILES = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// ======================================================
// LÝ DO KHIẾU NẠI
// ======================================================

const COMPLAINT_REASONS = {
  rau_dap_nat: 'Rau củ bị dập nát, hư hỏng khi vận chuyển',
  giao_thieu: 'Giao thiếu số lượng / Sai loại sản phẩm',
  qua_han: 'Sản phẩm không đạt chất lượng tươi mới',
};

// ======================================================
// COMPONENT
// ======================================================

export default function ComplaintPage({
  initialOrderCode = '',
  ordersList = [],
  onComplaintSuccess = null,
  embedded = false,
}) {
  const fileInputRef = useRef(null);

  const [orderCode, setOrderCode] = useState(initialOrderCode);
  const [reason, setReason] = useState('rau_dap_nat');
  const [description, setDescription] = useState('');

  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  const [submitted, setSubmitted] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (initialOrderCode) {
      setOrderCode(initialOrderCode);
      setSubmitted(null);
      setErrorMessage('');
    }
  }, [initialOrderCode]);

  // ====================================================
  // CHỌN FILE BẰNG CHỨNG
  // ====================================================

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files || []);

    setErrorMessage('');

    if (files.length + selectedFiles.length > MAX_FILES) {
      setErrorMessage(`Bạn chỉ được tải tối đa ${MAX_FILES} tệp.`);
      e.target.value = '';
      return;
    }

    const validFiles = [];

    for (const file of selectedFiles) {
      if (!file.type.startsWith('image/') &&
        !file.type.startsWith('video/')) {
        setErrorMessage('Chỉ hỗ trợ tệp hình ảnh và video.');
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        setErrorMessage(`${file.name} vượt quá dung lượng 10MB.`);
        continue;
      }

      validFiles.push(file);
    }

    setFiles((previous) => [...previous, ...validFiles]);

    // Cho phép chọn lại cùng một tệp
    e.target.value = '';
  };

  // ====================================================
  // XÓA FILE
  // ====================================================

  const handleRemoveFile = (index) => {
    setFiles((previous) =>
      previous.filter((_, i) => i !== index)
    );
  };

  // ====================================================
  // RESET FORM
  // ====================================================

  const resetForm = () => {
    setOrderCode(initialOrderCode || '');
    setReason('rau_dap_nat');
    setDescription('');
    setFiles([]);
    setSubmitted(null);
    setErrorMessage('');
  };

  // ====================================================
  // GỬI KHIẾU NẠI ĐẾN LARAVEL API
  // ====================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setErrorMessage('');

    if (!orderCode.trim()) {
      setErrorMessage('Vui lòng nhập hoặc chọn mã đơn hàng.');
      return;
    }

    if (!description.trim()) {
      setErrorMessage('Vui lòng mô tả chi tiết tình trạng sản phẩm.');
      return;
    }

    if (description.trim().length < 10) {
      setErrorMessage('Mô tả cần có ít nhất 10 ký tự.');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();

      formData.append('order_code', orderCode.trim());
      formData.append('reason', COMPLAINT_REASONS[reason]);
      formData.append('description', description.trim());
      formData.append('media_count', String(files.length));

      files.forEach((file) => {
        formData.append('media[]', file);
      });

      const response = await axios.post(API_URL, formData, {
        headers: {
          Accept: 'application/json',
          ...getAuthHeaders(),
        },
        timeout: 30000,
      });

      const created = response.data?.data || response.data;
      setSubmitted(created);
      if (onComplaintSuccess) {
        onComplaintSuccess(created);
      }

    } catch (error) {
      console.error('Complaint API Error:', error);

      if (error.response) {
        const status = error.response.status;
        const serverData = error.response.data;

        if (status === 422) {
          const validationErrors = serverData?.errors;

          if (validationErrors) {
            const firstError = Object.values(validationErrors)[0];
            setErrorMessage(
              Array.isArray(firstError)
                ? firstError[0]
                : 'Dữ liệu khiếu nại không hợp lệ.'
            );
          } else {
            setErrorMessage(
              serverData?.message || 'Vui lòng kiểm tra lại thông tin.'
            );
          }
        } else if (status === 401) {
          setErrorMessage('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        } else if (status === 403) {
          setErrorMessage('Bạn không có quyền gửi khiếu nại.');
        } else {
          setErrorMessage(
            serverData?.message ||
            `Không thể gửi khiếu nại. Mã lỗi: ${status}`
          );
        }
      } else if (error.code === 'ECONNABORTED') {
        setErrorMessage('Kết nối quá thời gian chờ. Vui lòng thử lại.');
      } else {
        setErrorMessage(
          'Không thể kết nối Backend Laravel. Hãy kiểm tra server.'
        );
      }

    } finally {
      setLoading(false);
    }
  };

  const wrapperClass = embedded ? 'w-full' : 'mx-auto max-w-3xl p-4 sm:p-6';

  // ====================================================
  // GIAO DIỆN THÀNH CÔNG
  // ====================================================

  if (submitted) {
    return (
      <div className={wrapperClass}>
        <div className="rounded-2xl border border-emerald-200 bg-white p-8 text-center shadow-sm">

          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 size={36} />
          </div>

          <h2 className="text-xl font-bold text-emerald-900">
            Gửi khiếu nại thành công!
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            Yêu cầu của bạn đã được hệ thống tiếp nhận và chuyển đến bộ phận Sales/CSKH.
          </p>

          {submitted.id && (
            <div className="mt-5 rounded-xl bg-emerald-50 p-4">
              <p className="text-xs text-emerald-700">
                Mã khiếu nại
              </p>
              <p className="mt-1 text-lg font-bold text-emerald-900">
                #{submitted.id}
              </p>
            </div>
          )}

          <p className="mt-4 text-xs text-slate-500">
            Mã đơn hàng: {submitted.order?.order_code || orderCode}
          </p>

          <button
            type="button"
            onClick={resetForm}
            className="mt-6 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-700"
          >
            Gửi khiếu nại khác
          </button>

        </div>
      </div>
    );
  }

  // ====================================================
  // GIAO DIỆN FORM
  // ====================================================

  return (
    <div className={wrapperClass}>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        {/* HEADER */}

        <div className="border-b border-slate-100 p-6">

          <div className="flex items-center gap-2 text-lg font-bold text-rose-600">
            <AlertTriangle size={23} />
            Form Gửi Khiếu Nại & Đổi Trả Nông Sản
          </div>

          <p className="mt-2 text-xs leading-relaxed text-slate-500">
            Nếu sản phẩm gặp vấn đề về chất lượng hoặc giao hàng,
            vui lòng cung cấp thông tin và hình ảnh/video bằng chứng
            để bộ phận CSKH hỗ trợ xử lý.
          </p>

        </div>

        {/* FORM */}

        <form onSubmit={handleSubmit} className="space-y-5 p-6">

          {/* ERROR MESSAGE */}

          {errorMessage && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              <p>{errorMessage}</p>
            </div>
          )}

          {/* ORDER CODE */}

          <div>

            <label className="mb-2 block text-sm font-bold text-slate-700">
              Mã đơn hàng cần khiếu nại
            </label>

            {(() => {
              const eligibleOrders = Array.isArray(ordersList)
                ? ordersList.filter((ord) =>
                    ['hoan_thanh', 'da_giao_bu'].includes(ord.order_status)
                  )
                : [];
              if (eligibleOrders.length === 0) {
                return (
                  <p className="mb-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    Chỉ những đơn hàng đã giao tới nơi và bạn đã nhấn{' '}
                    <strong>Đã nhận hàng</strong> mới được phép gửi khiếu nại.
                  </p>
                );
              }
              return (
                <div className="mb-2.5 flex flex-wrap gap-2">
                  {eligibleOrders.slice(0, 6).map((ord) => (
                    <button
                      key={ord.id || ord.order_code}
                      type="button"
                      onClick={() => setOrderCode(ord.order_code)}
                      className={`rounded-lg border px-2.5 py-1 font-mono text-xs font-semibold transition ${orderCode === ord.order_code
                          ? 'border-rose-500 bg-rose-50 text-rose-700'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                        }`}
                    >
                      {ord.order_code}
                    </button>
                  ))}
                </div>
              );
            })()}

            <input
              type="text"
              required
              value={orderCode}
              onChange={(e) => setOrderCode(e.target.value)}
              placeholder="Ví dụ: ORD-20261117-01"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
            />

          </div>

          {/* REASON */}

          <div>

            <label className="mb-2 block text-sm font-bold text-slate-700">
              Lý do khiếu nại
            </label>

            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-rose-500"
            >

              {Object.entries(COMPLAINT_REASONS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}

            </select>

          </div>

          {/* DESCRIPTION */}

          <div>

            <label className="mb-2 block text-sm font-bold text-slate-700">
              Mô tả chi tiết sự cố
            </label>

            <textarea
              rows={4}
              required
              minLength={10}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả cụ thể tình trạng hàng hóa nhận được..."
              className="w-full resize-y rounded-xl border border-slate-300 p-4 text-sm outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
            />

            <p className="mt-1 text-right text-xs text-slate-400">
              {description.length} ký tự
            </p>

          </div>

          {/* EVIDENCE UPLOAD */}

          <div>

            <label className="mb-2 block text-sm font-bold text-slate-700">
              Tải ảnh/video bằng chứng
            </label>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={files.length >= MAX_FILES}
              className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-7 text-center transition hover:border-rose-400 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
            >

              <UploadCloud size={30} className="mb-2 text-slate-400" />

              <span className="text-sm font-semibold text-slate-700">
                Chọn ảnh hoặc video
              </span>

              <span className="mt-1 text-xs text-slate-400">
                Tối đa {MAX_FILES} tệp, mỗi tệp không quá 10MB
              </span>

            </button>

            {/* DANH SÁCH FILE */}

            {files.length > 0 && (
              <div className="mt-3 space-y-2">

                {files.map((file, index) => (

                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center justify-between rounded-lg border border-slate-200 p-3"
                  >

                    <div className="flex min-w-0 items-center gap-2">

                      {file.type.startsWith('video/') ? (
                        <Video size={19} className="shrink-0 text-purple-500" />
                      ) : (
                        <ImageIcon size={19} className="shrink-0 text-emerald-600" />
                      )}

                      <div className="min-w-0">

                        <p className="truncate text-xs font-semibold text-slate-700">
                          {file.name}
                        </p>

                        <p className="text-xs text-slate-400">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>

                      </div>

                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveFile(index)}
                      className="rounded-lg p-2 text-rose-500 hover:bg-rose-50"
                      aria-label={`Xóa ${file.name}`}
                    >
                      <X size={17} />
                    </button>

                  </div>

                ))}

              </div>
            )}

            <p className="mt-2 text-xs text-slate-400">
              Đã chọn {files.length}/{MAX_FILES} tệp.
            </p>

          </div>

          {/* SUBMIT */}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
          >

            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Đang gửi khiếu nại...
              </>
            ) : (
              <>
                <FileText size={18} />
                Gửi yêu cầu khiếu nại
              </>
            )}

          </button>

        </form>

      </div>

    </div>
  );
}
