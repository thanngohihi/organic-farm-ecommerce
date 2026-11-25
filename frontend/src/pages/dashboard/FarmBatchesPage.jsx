import React, { useEffect, useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import {
  PackagePlus,
  QrCode,
  Trash2,
  Printer,
  X,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import {
  fetchBatches,
  createBatch,
  recordBatchWaste,
  fetchProducts,
} from '../../services/api';

export default function FarmBatchesPage() {
  const [batches, setBatches] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form khởi tạo lô mới
  const [formData, setFormData] = useState({
    product_id: '1',
    initial_quantity: '',
    harvest_date: new Date().toISOString().slice(0, 10),
    expiry_date: '',
  });

  // Modal In QR
  const [selectedQrBatch, setSelectedQrBatch] = useState(null);
  const printRef = useRef();

  // Modal Xuất hủy / Hao hụt
  const [wasteModalBatch, setWasteModalBatch] = useState(null);
  const [wasteQty, setWasteQty] = useState('');
  const [wasteReason, setWasteReason] = useState('Hư hỏng sau thu hoạch');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [batchList, productList] = await Promise.all([
      fetchBatches(),
      fetchProducts(),
    ]);
    setBatches(batchList);
    setProducts(productList);
    setLoading(false);
  };

  // Xử lý tạo lô FEFO
  const handleCreateBatch = async (e) => {
    e.preventDefault();
    if (!formData.initial_quantity || !formData.expiry_date) {
      alert('Vui lòng nhập đầy đủ số lượng và ngày hết hạn!');
      return;
    }

    const selectedProd = products.find(
      (p) => String(p.id) === String(formData.product_id)
    );

    const newBatch = await createBatch({
      ...formData,
      product_name: selectedProd?.name || 'Nông sản hữu cơ',
      unit: selectedProd?.unit || 'Kg',
    });

    setBatches([newBatch, ...batches]);
    setFormData({
      ...formData,
      initial_quantity: '',
      expiry_date: '',
    });
    alert(`Đã khởi tạo lô ${newBatch.batch_code} thành công!`);
  };

  // Xử lý in tem QR
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: selectedQrBatch ? `QR_${selectedQrBatch.batch_code}` : 'QR_Tem',
  });

  // Xử lý ghi nhận hao hụt / xuất hủy
  const handleConfirmWaste = async (e) => {
    e.preventDefault();
    const qty = Number(wasteQty);
    if (!qty || qty <= 0 || qty > wasteModalBatch.remaining_quantity) {
      alert('Số lượng xuất hủy không hợp lệ hoặc vượt quá tồn kho!');
      return;
    }

    const res = await recordBatchWaste({
      batch_id: wasteModalBatch.id,
      batch_code: wasteModalBatch.batch_code,
      quantity: qty,
      reason: wasteReason,
    });

    setBatches((prev) =>
      prev.map((b) =>
        b.id === wasteModalBatch.id
          ? { ...b, remaining_quantity: b.remaining_quantity - qty }
          : b
      )
    );
    alert(res.message);
    setWasteModalBatch(null);
    setWasteQty('');
  };

  return (
    <div className="space-y-6">
      {/* FORM KHỞI TẠO LÔ HÀNG MỚI */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <PackagePlus className="text-emerald-600" size={22} />
          <h2 className="text-xl font-bold text-slate-800">
            Khởi tạo Lô hàng Thu hoạch (FEFO)
          </h2>
        </div>

        <form
          onSubmit={handleCreateBatch}
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5"
        >
          <div className="lg:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Sản phẩm thu hoạch
            </label>
            <select
              value={formData.product_id}
              onChange={(e) =>
                setFormData({ ...formData, product_id: e.target.value })
              }
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.unit})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Số lượng nhập
            </label>
            <input
              type="number"
              min="1"
              placeholder="VD: 100"
              value={formData.initial_quantity}
              onChange={(e) =>
                setFormData({ ...formData, initial_quantity: e.target.value })
              }
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Ngày thu hoạch
            </label>
            <input
              type="date"
              value={formData.harvest_date}
              onChange={(e) =>
                setFormData({ ...formData, harvest_date: e.target.value })
              }
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              Hạn sử dụng (FEFO)
            </label>
            <input
              type="date"
              value={formData.expiry_date}
              onChange={(e) =>
                setFormData({ ...formData, expiry_date: e.target.value })
              }
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
              required
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-5 flex justify-end">
            <button
              type="submit"
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              + Nhập kho & Sinh mã lô
            </button>
          </div>
        </form>
      </div>

      {/* DANH SÁCH LÔ HÀNG TRONG KHO */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-bold text-slate-800">
          Danh sách Lô hàng tại Nông trại
        </h3>

        {loading ? (
          <p className="text-sm text-slate-500">Đang tải dữ liệu kho...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                  <th className="p-3">Mã Lô</th>
                  <th className="p-3">Sản phẩm</th>
                  <th className="p-3">Tồn kho</th>
                  <th className="p-3">Hạn sử dụng</th>
                  <th className="p-3">Trạng thái</th>
                  <th className="p-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {batches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-emerald-700">
                      {batch.batch_code}
                    </td>
                    <td className="p-3 font-medium text-slate-800">
                      {batch.product_name}
                    </td>
                    <td className="p-3">
                      <span className="font-bold">{batch.remaining_quantity}</span> /{' '}
                      {batch.initial_quantity} {batch.unit}
                    </td>
                    <td className="p-3 text-slate-600">{batch.expiry_date}</td>
                    <td className="p-3">
                      {batch.is_flash_sale ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                          <AlertTriangle size={13} /> Sắp hết hạn
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                          <CheckCircle2 size={13} /> Đạt chuẩn
                        </span>
                      )}
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
                          className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                        >
                          <Trash2 size={15} /> Xuất hủy
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL XEM VÀ IN TEM QR */}
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

            {/* Vùng nội dung sẽ được in ra giấy */}
            <div
              ref={printRef}
              className="flex flex-col items-center rounded-xl border-2 border-dashed border-emerald-400 bg-white p-5 text-center"
            >
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                ORGANIC FARM - TRUY XUẤT NGUỒN GỐC
              </span>
              <h4 className="mt-1 text-base font-extrabold text-slate-900">
                {selectedQrBatch.product_name}
              </h4>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                  `${window.location.origin}/traceability/${selectedQrBatch.batch_code}`
                )}`}
                alt="QR Code"
                className="my-3 h-44 w-44"
              />
              <p className="font-mono text-sm font-bold text-slate-800">
                {selectedQrBatch.batch_code}
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Thu hoạch: {selectedQrBatch.harvest_date} | HSD:{' '}
                {selectedQrBatch.expiry_date}
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

      {/* MODAL GHI NHẬN XUẤT HỦY / HAO HỤT */}
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
              Lô hàng: <strong>{wasteModalBatch.batch_code}</strong> (Tồn hiện tại:{' '}
              <strong>
                {wasteModalBatch.remaining_quantity} {wasteModalBatch.unit}
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
                  min="1"
                  max={wasteModalBatch.remaining_quantity}
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
                  <option value="Hư hỏng sau thu hoạch">Hư hỏng / dập nát sau thu hoạch</option>
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
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700"
              >
                Xác nhận trừ kho
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}