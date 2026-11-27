import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useReactToPrint } from 'react-to-print';
import {
  PackagePlus,
  QrCode,
  Trash2,
  Printer,
  X,
  AlertTriangle,
  CheckCircle2,
  FolderPlus,
  ImagePlus,
  PlusCircle,
  Loader2,
  Tag,
  ZoomIn,
  RefreshCw,
} from 'lucide-react';
import { getAuthHeaders } from '../../services/api';
import Pagination from '../../components/Pagination';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';
const ITEMS_PER_PAGE = 5;

export default function FarmBatchesPage() {
  const todayStr = new Date().toISOString().slice(0, 10);

  const [activeSection, setActiveSection] = useState('categories'); // 'categories' | 'products' | 'batches'

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Phân trang cho 3 danh sách (tối đa 5 mục / trang)
  const [categoryPage, setCategoryPage] = useState(1);
  const [productPage, setProductPage] = useState(1);
  const [batchPage, setBatchPage] = useState(1);

  // Form tạo Danh mục mới
  const [categoryName, setCategoryName] = useState('');
  const [categoryDesc, setCategoryDesc] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState(null);

  // Form tạo Sản phẩm mới (chỉ cho phép tải file ảnh)
  const [productForm, setProductForm] = useState({
    name: '',
    category_id: '',
    unit: 'kg',
    base_price: '',
    certification: 'VietGAP',
    description: '',
  });
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState('');
  const [savingProduct, setSavingProduct] = useState(false);
  const fileInputRef = useRef(null);

  // Lightbox xem ảnh phóng to khi click vào ảnh
  const [previewImage, setPreviewImage] = useState(null); // { url, title }

  // Form khởi tạo Lô hàng FEFO (tự động sinh batch_code & QR)
  const [batchForm, setBatchForm] = useState({
    product_id: '',
    initial_quantity: '',
    harvest_date: todayStr,
    expiry_date: '',
  });
  const [savingBatch, setSavingBatch] = useState(false);

  // Modal In QR & Xuất hủy
  const [selectedQrBatch, setSelectedQrBatch] = useState(null);
  const printRef = useRef();
  const [wasteModalBatch, setWasteModalBatch] = useState(null);
  const [wasteQty, setWasteQty] = useState('');
  const [wasteReason, setWasteReason] = useState('Hư hỏng sau thu hoạch');
  const [savingWaste, setSavingWaste] = useState(false);

  const loadFarmData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const headers = getAuthHeaders();
      const [catRes, prodRes, batchRes] = await Promise.all([
        axios.get(`${API_URL}/categories`, { headers }),
        axios.get(`${API_URL}/products`, { headers }),
        axios.get(`${API_URL}/farm/batches`, { headers }),
      ]);

      const catList = Array.isArray(catRes.data?.data) ? catRes.data.data : [];
      const prodList = Array.isArray(prodRes.data?.data) ? prodRes.data.data : [];
      const batchList = Array.isArray(batchRes.data?.data) ? batchRes.data.data : [];

      setCategories(catList);
      setProducts(prodList);
      setBatches(batchList);

      setProductForm((prev) => ({
        ...prev,
        category_id:
          catList.some((c) => String(c.id) === String(prev.category_id))
            ? prev.category_id
            : catList[0]?.id
              ? String(catList[0].id)
              : '',
      }));

      setBatchForm((prev) => ({
        ...prev,
        product_id:
          prodList.some((p) => String(p.id) === String(prev.product_id))
            ? prev.product_id
            : prodList[0]?.id
              ? String(prodList[0].id)
              : '',
      }));
    } catch (err) {
      console.error('Lỗi tải dữ liệu trang trại:', err);
      setErrorMsg(
        err.response?.data?.message ||
          'Không thể tải dữ liệu từ máy chủ. Vui lòng kiểm tra đăng nhập Farm Staff.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFarmData();
  }, []);

  useEffect(() => {
    return () => {
      if (thumbnailPreview && thumbnailPreview.startsWith('blob:')) {
        URL.revokeObjectURL(thumbnailPreview);
      }
    };
  }, [thumbnailPreview]);

  // =============================================
  // 1. QUẢN LÝ DANH MỤC (THÊM & XÓA)
  // =============================================
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!categoryName.trim()) {
      alert('Vui lòng nhập tên danh mục!');
      return;
    }

    setSavingCategory(true);
    try {
      const res = await axios.post(
        `${API_URL}/farm/categories`,
        {
          name: categoryName.trim(),
          description: categoryDesc.trim() || null,
        },
        { headers: getAuthHeaders() }
      );

      const created = res.data?.data;
      setCategoryName('');
      setCategoryDesc('');
      setCategoryPage(1);

      await loadFarmData();
      if (created?.id) {
        setProductForm((prev) => ({ ...prev, category_id: String(created.id) }));
      }
      alert(res.data?.message || 'Đã thêm danh mục mới!');
    } catch (err) {
      alert(
        err.response?.data?.message ||
          'Không thể tạo danh mục. Vui lòng kiểm tra lại.'
      );
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (cat) => {
    if ((cat.products_count ?? 0) > 0) {
      alert(
        `Danh mục "${cat.name}" đang có ${cat.products_count} sản phẩm nên không thể xóa.`
      );
      return;
    }

    if (!window.confirm(`Bạn chắc chắn muốn xóa danh mục "${cat.name}"?`)) {
      return;
    }

    setDeletingCategoryId(cat.id);
    try {
      const res = await axios.delete(`${API_URL}/farm/categories/${cat.id}`, {
        headers: getAuthHeaders(),
      });
      await loadFarmData();
      alert(res.data?.message || 'Đã xóa danh mục thành công!');
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể xóa danh mục.');
    } finally {
      setDeletingCategoryId(null);
    }
  };

  // =============================================
  // 2. XỬ LÝ CHỌN ẢNH & TẠO SẢN PHẨM MỚI
  // =============================================
  const handleThumbnailFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chỉ chọn file hình ảnh (JPG, PNG, WEBP)!');
      e.target.value = '';
      return;
    }

    if (thumbnailPreview && thumbnailPreview.startsWith('blob:')) {
      URL.revokeObjectURL(thumbnailPreview);
    }

    setThumbnailFile(file);
    setThumbnailPreview(URL.createObjectURL(file));
  };

  const clearSelectedThumbnail = () => {
    if (thumbnailPreview && thumbnailPreview.startsWith('blob:')) {
      URL.revokeObjectURL(thumbnailPreview);
    }
    setThumbnailFile(null);
    setThumbnailPreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();

    if (!productForm.name.trim()) {
      alert('Vui lòng nhập tên sản phẩm!');
      return;
    }
    if (!productForm.category_id) {
      alert('Vui lòng tạo hoặc chọn danh mục cho sản phẩm!');
      return;
    }
    if (productForm.base_price === '' || Number(productForm.base_price) < 0) {
      alert('Vui lòng nhập giá bán hợp lệ!');
      return;
    }
    if (!thumbnailFile) {
      alert('Vui lòng tải lên hình ảnh sản phẩm!');
      return;
    }

    setSavingProduct(true);
    try {
      const payload = new FormData();
      payload.append('name', productForm.name.trim());
      payload.append('category_id', productForm.category_id);
      payload.append('unit', productForm.unit.trim() || 'kg');
      payload.append('base_price', String(Number(productForm.base_price)));
      if (productForm.certification.trim()) {
        payload.append('certification', productForm.certification.trim());
      }
      if (productForm.description.trim()) {
        payload.append('description', productForm.description.trim());
      }
      payload.append('thumbnail', thumbnailFile);

      const res = await axios.post(`${API_URL}/farm/products`, payload, {
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'multipart/form-data',
        },
      });

      const createdProd = res.data?.data;
      setProductForm((prev) => ({
        ...prev,
        name: '',
        base_price: '',
        description: '',
      }));
      clearSelectedThumbnail();
      setProductPage(1);

      await loadFarmData();
      if (createdProd?.id) {
        setBatchForm((prev) => ({ ...prev, product_id: String(createdProd.id) }));
      }
      alert(
        `Đã thêm sản phẩm "${createdProd?.name || ''}" kèm hình ảnh thành công!`
      );
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        Object.values(err.response?.data?.errors || {})
          .flat()
          .join('\n') ||
        'Không thể lưu sản phẩm mới.';
      alert(msg);
    } finally {
      setSavingProduct(false);
    }
  };

  // =============================================
  // 3. KHỞI TẠO LÔ HÀNG (HỆ THỐNG TỰ SINH MÃ LÔ & QR)
  // =============================================
  const handleCreateBatch = async (e) => {
    e.preventDefault();

    if (!batchForm.product_id) {
      alert('Vui lòng thêm và chọn sản phẩm trước khi tạo lô hàng!');
      return;
    }
    if (batchForm.harvest_date < todayStr) {
      alert('Ngày thu hoạch phải từ hôm nay trở đi!');
      return;
    }
    if (batchForm.expiry_date <= batchForm.harvest_date) {
      alert('Hạn sử dụng phải lớn hơn ngày thu hoạch!');
      return;
    }

    setSavingBatch(true);
    try {
      const res = await axios.post(
        `${API_URL}/farm/batches`,
        {
          product_id: Number(batchForm.product_id),
          initial_quantity: Number(batchForm.initial_quantity),
          harvest_date: batchForm.harvest_date,
          expiry_date: batchForm.expiry_date,
          qr_format: 'svg',
        },
        { headers: getAuthHeaders() }
      );

      const newBatch = res.data?.data;
      setBatchForm((prev) => ({
        ...prev,
        initial_quantity: '',
        expiry_date: '',
      }));
      setBatchPage(1);

      await loadFarmData();
      alert(
        `Hệ thống đã tự động khởi tạo mã lô ${newBatch?.batch_code || ''} và sinh mã QR thành công!`
      );
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        Object.values(err.response?.data?.errors || {})
          .flat()
          .join('\n') ||
        'Không thể khởi tạo lô hàng.';
      alert(msg);
    } finally {
      setSavingBatch(false);
    }
  };

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: selectedQrBatch ? `QR_${selectedQrBatch.batch_code}` : 'QR_Tem',
  });

  // =============================================
  // 4. GHI NHẬN XUẤT HỦY / HAO HỤT
  // =============================================
  const handleConfirmWaste = async (e) => {
    e.preventDefault();
    const qty = Number(wasteQty);
    const currentQty = Number(wasteModalBatch?.current_quantity ?? 0);

    if (!qty || qty <= 0 || qty > currentQty) {
      alert('Số lượng xuất hủy không hợp lệ hoặc vượt quá tồn kho!');
      return;
    }

    setSavingWaste(true);
    try {
      const res = await axios.post(
        `${API_URL}/farm/batches/waste-record`,
        {
          batch_id: wasteModalBatch.id,
          quantity: qty,
          reason: wasteReason,
        },
        { headers: getAuthHeaders() }
      );

      alert(res.data?.message || 'Đã ghi nhận xuất hủy thành công!');
      setWasteModalBatch(null);
      setWasteQty('');
      await loadFarmData();
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể ghi nhận xuất hủy.');
    } finally {
      setSavingWaste(false);
    }
  };

  const resolveBatchStatus = (batch) => {
    if (batch.status === 'het_han') {
      return {
        label: 'Hết hạn',
        cls: 'bg-rose-100 text-rose-800',
        icon: AlertTriangle,
      };
    }
    if (batch.is_flash_sale || batch.status === 'sap_het_han') {
      return {
        label: 'Sắp hết hạn',
        cls: 'bg-amber-100 text-amber-800',
        icon: AlertTriangle,
      };
    }
    if (batch.status === 'da_huy') {
      return {
        label: 'Đã hủy / hết',
        cls: 'bg-slate-200 text-slate-700',
        icon: Trash2,
      };
    }
    return {
      label: 'Đạt chuẩn',
      cls: 'bg-emerald-100 text-emerald-800',
      icon: CheckCircle2,
    };
  };

  // Tính phân trang cho 3 danh sách (tối đa 5 mục / trang)
  const totalCategoryPages = Math.max(1, Math.ceil(categories.length / ITEMS_PER_PAGE));
  const safeCategoryPage = Math.min(categoryPage, totalCategoryPages);
  const paginatedCategories = categories.slice(
    (safeCategoryPage - 1) * ITEMS_PER_PAGE,
    safeCategoryPage * ITEMS_PER_PAGE
  );

  const totalProductPages = Math.max(1, Math.ceil(products.length / ITEMS_PER_PAGE));
  const safeProductPage = Math.min(productPage, totalProductPages);
  const paginatedProducts = products.slice(
    (safeProductPage - 1) * ITEMS_PER_PAGE,
    safeProductPage * ITEMS_PER_PAGE
  );

  const totalBatchPages = Math.max(1, Math.ceil(batches.length / ITEMS_PER_PAGE));
  const safeBatchPage = Math.min(batchPage, totalBatchPages);
  const paginatedBatches = batches.slice(
    (safeBatchPage - 1) * ITEMS_PER_PAGE,
    safeBatchPage * ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
          {errorMsg}
        </div>
      )}

      {/* THANH CHỌN 3 MỤC CHỨC NĂNG CỦA STAFF */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveSection('categories')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
              activeSection === 'categories'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FolderPlus size={17} />
            1. Quản lý Danh mục ({categories.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('products')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
              activeSection === 'products'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <ImagePlus size={17} />
            2. Thêm Sản phẩm Mới ({products.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('batches')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
              activeSection === 'batches'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <PackagePlus size={17} />
            3. Khởi tạo Lô hàng ({batches.length})
          </button>
        </div>

        <button
          type="button"
          onClick={loadFarmData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Làm mới
        </button>
      </div>

      {/* MỤC 1: QUẢN LÝ DANH MỤC */}
      {activeSection === 'categories' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-5">
            <div className="mb-4 flex items-center gap-2">
              <FolderPlus className="text-emerald-600" size={22} />
              <h2 className="text-lg font-bold text-slate-800">
                Thêm Danh mục Nông sản
              </h2>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Tên danh mục mới *
                </label>
                <input
                  type="text"
                  placeholder="VD: Rau Ăn Lá Hữu Cơ"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Mô tả danh mục
                </label>
                <input
                  type="text"
                  placeholder="Mô tả ngắn về nhóm nông sản..."
                  value={categoryDesc}
                  onChange={(e) => setCategoryDesc(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={savingCategory}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {savingCategory ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <PlusCircle size={16} />
                )}
                Thêm Danh mục
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-7">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-bold text-slate-800">
                Danh sách Danh mục ({categories.length})
              </h3>
              {totalCategoryPages > 1 && (
                <span className="text-xs font-medium text-slate-500">
                  Trang {safeCategoryPage} / {totalCategoryPages}
                </span>
              )}
            </div>

            {categories.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-xs italic text-slate-400">
                Chưa có danh mục nào. Hãy thêm danh mục đầu tiên bên cạnh.
              </p>
            ) : (
              <>
                <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {paginatedCategories.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex flex-wrap items-center justify-between gap-3 p-3.5 hover:bg-slate-50"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
                          <Tag size={14} className="shrink-0 text-emerald-600" />
                          <span>{cat.name}</span>
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                            {cat.products_count ?? 0} sản phẩm
                          </span>
                        </p>
                        {cat.description && (
                          <p className="mt-1 truncate text-xs text-slate-500">
                            {cat.description}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        disabled={deletingCategoryId === cat.id}
                        onClick={() => handleDeleteCategory(cat)}
                        className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
                      >
                        {deletingCategoryId === cat.id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <Trash2 size={13} />
                        )}
                        Xóa
                      </button>
                    </div>
                  ))}
                </div>

                <Pagination
                  currentPage={safeCategoryPage}
                  totalPages={totalCategoryPages}
                  onPageChange={setCategoryPage}
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* MỤC 2: THÊM SẢN PHẨM MỚI (CHỈ TẢI FILE ẢNH + CLICK XEM ẢNH PHÓNG TO) */}
      {activeSection === 'products' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <ImagePlus className="text-emerald-600" size={22} />
              <h2 className="text-lg font-bold text-slate-800">
                Thêm Sản phẩm Mới (Tải hình ảnh từ máy)
              </h2>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Tên sản phẩm *
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Cà chua bi hữu cơ"
                    value={productForm.name}
                    onChange={(e) =>
                      setProductForm({ ...productForm, name: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Danh mục *
                  </label>
                  <select
                    value={productForm.category_id}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        category_id: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                    required
                  >
                    {categories.length === 0 ? (
                      <option value="">-- Hãy tạo danh mục ở mục 1 trước --</option>
                    ) : (
                      categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Giá bán (VNĐ) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="VD: 45000"
                    value={productForm.base_price}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        base_price: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Đơn vị tính *
                  </label>
                  <input
                    type="text"
                    placeholder="VD: kg, hộp 500g..."
                    value={productForm.unit}
                    onChange={(e) =>
                      setProductForm({ ...productForm, unit: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Chứng nhận
                  </label>
                  <input
                    type="text"
                    placeholder="VD: VietGAP, USDA Organic"
                    value={productForm.certification}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        certification: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* CHỈ CHO PHÉP TẢI HÌNH ẢNH & CLICK XEM PHÓNG TO */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
                <label className="mb-2 block text-xs font-semibold text-slate-700">
                  Hình ảnh sản phẩm (chỉ nhận file ảnh PNG, JPG, WEBP) *
                </label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/jpg"
                  onChange={handleThumbnailFileChange}
                  className="hidden"
                />

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-emerald-500 bg-white px-4 py-2.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
                  >
                    <ImagePlus size={16} />
                    <span>{thumbnailFile ? 'Đổi ảnh khác' : 'Chọn hình ảnh'}</span>
                  </button>

                  {thumbnailFile && (
                    <span className="text-xs font-medium text-slate-600">
                      {thumbnailFile.name}
                    </span>
                  )}
                </div>

                {thumbnailPreview && (
                  <div className="mt-3 flex flex-wrap gap-3">
                    <div className="group relative h-24 w-24 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewImage({
                            url: thumbnailPreview,
                            title: productForm.name.trim() || thumbnailFile?.name || 'Ảnh sản phẩm',
                          })
                        }
                        className="relative h-full w-full"
                        title="Xem ảnh lớn"
                      >
                        <img
                          src={thumbnailPreview}
                          alt="Xem trước sản phẩm"
                          className="h-full w-full object-cover transition group-hover:scale-105"
                        />
                        <span className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition group-hover:opacity-100">
                          <ZoomIn size={18} className="text-white" />
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={clearSelectedThumbnail}
                        className="absolute right-1 top-1 rounded-full bg-black/65 p-1 text-white transition hover:bg-rose-600"
                        title="Xóa ảnh"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600">
                  Mô tả sản phẩm
                </label>
                <textarea
                  rows={2}
                  placeholder="Mô tả hương vị, phương pháp canh tác hữu cơ..."
                  value={productForm.description}
                  onChange={(e) =>
                    setProductForm({
                      ...productForm,
                      description: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={savingProduct || categories.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingProduct && <Loader2 size={16} className="animate-spin" />}
                  + Lưu Sản phẩm Mới
                </button>
              </div>
            </form>
          </div>

          {/* DANH SÁCH SẢN PHẨM HIỆN CÓ (GIỚI HẠN 5 MỤC / TRANG) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-bold text-slate-800">
                Danh sách Sản phẩm ({products.length})
              </h3>
              {totalProductPages > 1 && (
                <span className="text-xs font-medium text-slate-500">
                  Trang {safeProductPage} / {totalProductPages}
                </span>
              )}
            </div>

            {products.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-500">
                Chưa có sản phẩm nào trong hệ thống.
              </p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                        <th className="p-3">Sản phẩm</th>
                        <th className="p-3">Danh mục</th>
                        <th className="p-3">Giá bán</th>
                        <th className="p-3">Chứng nhận</th>
                        <th className="p-3 text-right">Tồn kho khả dụng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedProducts.map((prod) => (
                        <tr key={prod.id} className="hover:bg-slate-50">
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              {prod.thumbnail_url ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewImage({
                                      url: prod.thumbnail_url,
                                      title: prod.name,
                                    })
                                  }
                                  className="group relative shrink-0 overflow-hidden rounded-lg border border-slate-200"
                                  title="Nhấn để xem ảnh"
                                >
                                  <img
                                    src={prod.thumbnail_url}
                                    alt={prod.name}
                                    className="h-11 w-11 object-cover"
                                  />
                                </button>
                              ) : (
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400">
                                  <ImagePlus size={16} />
                                </div>
                              )}
                              <div>
                                <p className="font-semibold text-slate-800">{prod.name}</p>
                                <span className="font-mono text-xs text-slate-400">
                                  {prod.sku}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 text-xs text-slate-600">
                            {prod.category_name || 'Chưa phân loại'}
                          </td>
                          <td className="p-3 font-bold text-emerald-700">
                            {Number(prod.base_price ?? prod.price ?? 0).toLocaleString('vi-VN')}đ /{' '}
                            {prod.unit}
                          </td>
                          <td className="p-3 text-xs text-slate-600">
                            {prod.certification || '—'}
                          </td>
                          <td className="p-3 text-right font-semibold text-slate-700">
                            {Number(prod.stock ?? 0)} {prod.unit}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <Pagination
                  currentPage={safeProductPage}
                  totalPages={totalProductPages}
                  onPageChange={setProductPage}
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* MỤC 3: KHỞI TẠO LÔ HÀNG & DANH SÁCH LÔ HÀNG */}
      {activeSection === 'batches' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <PackagePlus className="text-emerald-600" size={22} />
                <h2 className="text-xl font-bold text-slate-800">
                  Khởi tạo Lô hàng (FEFO) — Tự động sinh Mã lô & QR
                </h2>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                Hệ thống tự sinh mã BATCH & QR truy xuất khi nhập kho
              </span>
            </div>

            <form onSubmit={handleCreateBatch} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="sm:col-span-2 lg:col-span-1">
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Chọn sản phẩm thu hoạch *
                  </label>
                  <select
                    value={batchForm.product_id}
                    onChange={(e) =>
                      setBatchForm({ ...batchForm, product_id: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                    required
                  >
                    {products.length === 0 ? (
                      <option value="">-- Chưa có sản phẩm nào --</option>
                    ) : (
                      products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — [{p.category_name || 'Chưa phân loại'}] ({p.unit})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Số lượng nhập kho *
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    placeholder="VD: 100"
                    value={batchForm.initial_quantity}
                    onChange={(e) =>
                      setBatchForm({
                        ...batchForm,
                        initial_quantity: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Ngày thu hoạch *
                  </label>
                  <input
                    type="date"
                    min={todayStr}
                    value={batchForm.harvest_date}
                    onChange={(e) =>
                      setBatchForm({ ...batchForm, harvest_date: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-600">
                    Hạn sử dụng FEFO *
                  </label>
                  <input
                    type="date"
                    min={batchForm.harvest_date || todayStr}
                    value={batchForm.expiry_date}
                    onChange={(e) =>
                      setBatchForm({ ...batchForm, expiry_date: e.target.value })
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={savingBatch || products.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingBatch && <Loader2 size={16} className="animate-spin" />}
                  + Nhập kho & Tự động sinh mã lô QR
                </button>
              </div>
            </form>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-bold text-slate-800">
                Danh sách Lô hàng tại Nông trại ({batches.length})
              </h3>
              {totalBatchPages > 1 && (
                <span className="text-xs font-medium text-slate-500">
                  Trang {safeBatchPage} / {totalBatchPages}
                </span>
              )}
            </div>

            {loading ? (
              <p className="text-sm text-slate-500">Đang tải dữ liệu kho...</p>
            ) : batches.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 py-8 text-center text-sm text-slate-500">
                Chưa có lô hàng nào. Hãy thêm danh mục, sản phẩm kèm ảnh rồi khởi tạo lô hàng ở trên.
              </p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                        <th className="p-3">Mã Lô</th>
                        <th className="p-3">Sản phẩm & Danh mục</th>
                        <th className="p-3">Tồn kho</th>
                        <th className="p-3">Thu hoạch / HSD</th>
                        <th className="p-3">Trạng thái</th>
                        <th className="p-3 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedBatches.map((batch) => {
                        const statusInfo = resolveBatchStatus(batch);
                        const StatusIcon = statusInfo.icon;
                        const prodName = batch.product?.name || 'Nông sản hữu cơ';
                        const catName =
                          batch.product?.category?.name || 'Chưa phân loại';
                        const unit = batch.product?.unit || 'kg';
                        const thumb = batch.product?.thumbnail_url;

                        return (
                          <tr key={batch.id} className="hover:bg-slate-50">
                            <td className="p-3 font-mono font-bold text-emerald-700">
                              {batch.batch_code}
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-3">
                                {thumb && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setPreviewImage({ url: thumb, title: prodName })
                                    }
                                    className="shrink-0 overflow-hidden rounded-lg border border-slate-200"
                                    title="Nhấn để xem ảnh"
                                  >
                                    <img
                                      src={thumb}
                                      alt={prodName}
                                      className="h-10 w-10 object-cover"
                                    />
                                  </button>
                                )}
                                <div>
                                  <p className="font-medium text-slate-800">
                                    {prodName}
                                  </p>
                                  <span className="text-xs text-slate-500">
                                    {catName}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="p-3">
                              <span className="font-bold">
                                {Number(batch.current_quantity ?? 0)}
                              </span>{' '}
                              / {Number(batch.initial_quantity ?? 0)} {unit}
                            </td>
                            <td className="p-3 text-xs text-slate-600">
                              <div>TH: {batch.harvest_date?.slice(0, 10)}</div>
                              <div className="font-semibold text-slate-800">
                                HSD: {batch.expiry_date?.slice(0, 10)}
                              </div>
                            </td>
                            <td className="p-3">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${statusInfo.cls}`}
                              >
                                <StatusIcon size={13} /> {statusInfo.label}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setSelectedQrBatch(batch)}
                                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                                >
                                  <QrCode size={15} /> In QR
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setWasteModalBatch(batch)}
                                  disabled={Number(batch.current_quantity ?? 0) <= 0}
                                  className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-40"
                                >
                                  <Trash2 size={15} /> Xuất hủy
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <Pagination
                  currentPage={safeBatchPage}
                  totalPages={totalBatchPages}
                  onPageChange={setBatchPage}
                />
              </>
            )}
          </div>
        </div>
      )}

      {/* MODAL XEM ẢNH PHÓNG TO */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
              <h4 className="truncate text-sm font-bold text-slate-800">
                {previewImage.title}
              </h4>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex max-h-[75vh] items-center justify-center bg-slate-950 p-4">
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="max-h-[70vh] max-w-full rounded-lg object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL IN QR */}
      {selectedQrBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800">
                Tem QR Truy Xuất Nguồn Gốc
              </h3>
              <button
                onClick={() => setSelectedQrBatch(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div
              ref={printRef}
              className="flex flex-col items-center rounded-xl border-2 border-dashed border-emerald-400 bg-white p-5 text-center"
            >
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                ORGANIC FARM - TRUY XUẤT NGUỒN GỐC
              </span>
              <h4 className="mt-1 text-base font-extrabold text-slate-900">
                {selectedQrBatch.product?.name || 'Nông sản hữu cơ'}
              </h4>
              <img
                src={
                  selectedQrBatch.qr_code_url ||
                  `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                    `${window.location.origin}/traceability/${selectedQrBatch.batch_code}`
                  )}`
                }
                alt="QR Code"
                className="my-3 h-44 w-44"
              />
              <p className="font-mono text-sm font-bold text-slate-800">
                {selectedQrBatch.batch_code}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Thu hoạch: {selectedQrBatch.harvest_date?.slice(0, 10)} | HSD:{' '}
                {selectedQrBatch.expiry_date?.slice(0, 10)}
              </p>
            </div>

            <button
              type="button"
              onClick={handlePrint}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              <Printer size={18} /> In tem dán bao bì
            </button>
          </div>
        </div>
      )}

      {/* MODAL XUẤT HỦY */}
      {wasteModalBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleConfirmWaste}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-rose-700">
                Ghi nhận Hao hụt / Xuất hủy
              </h3>
              <button
                type="button"
                onClick={() => setWasteModalBatch(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <p className="mb-3 text-sm text-slate-600">
              Lô hàng: <strong>{wasteModalBatch.batch_code}</strong> (Tồn hiện
              tại:{' '}
              <strong>
                {Number(wasteModalBatch.current_quantity ?? 0)}{' '}
                {wasteModalBatch.product?.unit || 'kg'}
              </strong>
              )
            </p>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Số lượng hủy
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  max={Number(wasteModalBatch.current_quantity ?? 0)}
                  value={wasteQty}
                  onChange={(e) => setWasteQty(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Lý do xuất hủy
                </label>
                <select
                  value={wasteReason}
                  onChange={(e) => setWasteReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="Hư hỏng sau thu hoạch">
                    Hư hỏng / dập nát sau thu hoạch
                  </option>
                  <option value="Quá hạn sử dụng">Quá hạn sử dụng</option>
                  <option value="Sâu bệnh phát sinh">Sâu bệnh phát sinh</option>
                </select>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setWasteModalBatch(null)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={savingWaste}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
              >
                {savingWaste ? 'Đang xử lý...' : 'Xác nhận trừ kho'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
