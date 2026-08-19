import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useStore } from '../store/StoreContext';
import { Product } from '../types';
import { formatCurrency, formatDateTime } from '../utils/format';
import Modal from '../components/Modal';
import BarcodeScannerModal from '../components/BarcodeScannerModal';
import BarcodeImage from '../components/BarcodeImage';

const DEFAULT_CATEGORIES = ['Sofa Raw Material', 'Mattress', 'Pillow', 'Blanket', 'Other'];
const DEFAULT_UNITS = ['pcs', 'meter', 'kg', 'roll', 'set', 'yard'];

const emptyForm = {
  name: '',
  category: 'Sofa Raw Material',
  customCategory: '',
  barcode: '',
  useExisting: true,
  unit: 'pcs',
  price: '',
  costPrice: '',
  stockQty: '',
  lowStockThreshold: '',
};

const Inventory: React.FC = () => {
  const { state, addProduct, updateProduct, deleteProduct, adjustStock, findProductByBarcode } = useStore();
  const { products, settings } = state;
  const symbol = settings.currencySymbol;

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [showScanner, setShowScanner] = useState(false);
  const [labelProduct, setLabelProduct] = useState<Product | null>(null);
  const [stockModal, setStockModal] = useState<Product | null>(null);
  const [stockDelta, setStockDelta] = useState('');
  const [stockNote, setStockNote] = useState('');
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);

  const categories = useMemo(() => {
    const set = new Set<string>(DEFAULT_CATEGORIES);
    products.forEach((p) => set.add(p.category));
    return Array.from(set);
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.barcode.toLowerCase().includes(search.toLowerCase());
      const matchesCat = categoryFilter === 'All' || p.category === categoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [products, search, categoryFilter]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const openAdd = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      category: DEFAULT_CATEGORIES.includes(p.category) ? p.category : 'Other',
      customCategory: DEFAULT_CATEGORIES.includes(p.category) ? '' : p.category,
      barcode: p.barcode,
      useExisting: p.barcodeSource === 'existing',
      unit: p.unit,
      price: String(p.price),
      costPrice: p.costPrice ? String(p.costPrice) : '',
      stockQty: String(p.stockQty),
      lowStockThreshold: String(p.lowStockThreshold),
    });
    setShowForm(true);
  };

  const submitForm = () => {
    const finalCategory = form.category === 'Other' && form.customCategory.trim() ? form.customCategory.trim() : form.category;
    if (!form.name.trim()) {
      toast.error('Please enter a product name');
      return;
    }
    if (!form.price || Number(form.price) <= 0) {
      toast.error('Please enter a valid price');
      return;
    }
    if (form.useExisting && !form.barcode.trim()) {
      toast.error('Please scan/enter the existing barcode, or switch to auto-generate');
      return;
    }
    // check duplicate barcode
    if (form.useExisting && form.barcode.trim()) {
      const dup = findProductByBarcode(form.barcode.trim());
      if (dup && dup.id !== editingId) {
        toast.error('This barcode is already used by another product');
        return;
      }
    }

    const payload = {
      name: form.name.trim(),
      category: finalCategory,
      barcode: form.useExisting ? form.barcode.trim() : editingId ? form.barcode : '',
      barcodeSource: (form.useExisting ? 'existing' : 'generated') as 'existing' | 'generated',
      unit: form.unit,
      price: Number(form.price),
      costPrice: form.costPrice ? Number(form.costPrice) : undefined,
      stockQty: Number(form.stockQty) || 0,
      lowStockThreshold: Number(form.lowStockThreshold) || settings.lowStockThresholdDefault,
    };

    if (editingId) {
      updateProduct(editingId, payload);
      toast.success('Product updated');
    } else {
      const created = addProduct(payload);
      toast.success(`Product added! Barcode: ${created.barcode}`);
    }
    setShowForm(false);
    resetForm();
  };

  const handleScanForForm = (code: string) => {
    setForm((f) => ({ ...f, barcode: code, useExisting: true }));
    setShowScanner(false);
    toast.success('Barcode captured');
  };

  const applyStockAdjust = () => {
    if (!stockModal) return;
    const delta = Number(stockDelta);
    if (!delta) {
      toast.error('Enter a quantity (positive to add, negative to remove)');
      return;
    }
    adjustStock(stockModal.id, delta, stockNote || (delta > 0 ? 'Stock added' : 'Stock removed'), delta > 0 ? 'restock' : 'damage');
    toast.success('Stock updated');
    setStockModal(null);
    setStockDelta('');
    setStockNote('');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Inventory</h1>
          <p className="text-slate-500">Manage sofa raw material, mattresses, pillows, blankets & more.</p>
        </div>
        <button
          onClick={openAdd}
          className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow hover:bg-indigo-700"
        >
          + Add Product
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Search by name or barcode..."
          className="min-w-[220px] flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-indigo-400 focus:outline-none"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-indigo-400 focus:outline-none"
        >
          <option value="All">All Categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        {filtered.length === 0 ? (
          <p className="p-10 text-center text-slate-400">No products found. Add your first product to get started.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-slate-500">
                  <th className="px-4 py-3 font-semibold">Product</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Barcode</th>
                  <th className="px-4 py-3 font-semibold">Price</th>
                  <th className="px-4 py-3 font-semibold">Stock</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const low = p.stockQty <= p.lowStockThreshold;
                  return (
                    <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-700">{p.name}</td>
                      <td className="px-4 py-3 text-slate-500">{p.category}</td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.barcode}</td>
                      <td className="px-4 py-3 font-semibold text-slate-700">{formatCurrency(p.price, symbol)}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${low ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {p.stockQty} {p.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <button onClick={() => setStockModal(p)} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200">
                            Adjust Stock
                          </button>
                          <button onClick={() => setLabelProduct(p)} className="rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-100">
                            Label
                          </button>
                          <button onClick={() => setHistoryProduct(p)} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200">
                            History
                          </button>
                          <button onClick={() => openEdit(p)} className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-600 hover:bg-amber-100">
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Delete "${p.name}"? This cannot be undone.`)) {
                                deleteProduct(p.id);
                                toast.success('Product deleted');
                              }
                            }}
                            className="rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-100"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <Modal title={editingId ? 'Edit Product' : 'Add New Product'} onClose={() => setShowForm(false)}>
          <div className="space-y-4">
            <Field label="Product Name">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Foam Sheet 4 inch, King Size Mattress..."
                className="input"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Category">
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input">
                  {DEFAULT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
              {form.category === 'Other' && (
                <Field label="Custom Category Name">
                  <input
                    value={form.customCategory}
                    onChange={(e) => setForm({ ...form, customCategory: e.target.value })}
                    placeholder="e.g. Curtains"
                    className="input"
                  />
                </Field>
              )}
              <Field label="Unit">
                <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="input">
                  {DEFAULT_UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="mb-2 text-sm font-semibold text-slate-600">Barcode</p>
              <div className="mb-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, useExisting: true })}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold ${form.useExisting ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 ring-1 ring-slate-200'}`}
                >
                  Product already has a barcode
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, useExisting: false })}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold ${!form.useExisting ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 ring-1 ring-slate-200'}`}
                >
                  Generate a new barcode
                </button>
              </div>
              {form.useExisting ? (
                <div className="flex gap-2">
                  <input
                    value={form.barcode}
                    onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                    placeholder="Scan or type existing barcode number"
                    className="input flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => setShowScanner(true)}
                    className="rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-bold text-white"
                  >
                    📷 Scan
                  </button>
                </div>
              ) : (
                <p className="text-sm text-slate-500">
                  A unique barcode will be generated automatically for this product once saved. You can print a label for it afterwards.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label={`Selling Price (${symbol})`}>
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="0"
                  className="input"
                />
              </Field>
              <Field label={`Cost Price (${symbol}) - optional`}>
                <input
                  type="number"
                  value={form.costPrice}
                  onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
                  placeholder="0"
                  className="input"
                />
              </Field>
              <Field label="Current Stock Quantity">
                <input
                  type="number"
                  value={form.stockQty}
                  onChange={(e) => setForm({ ...form, stockQty: e.target.value })}
                  placeholder="0"
                  className="input"
                  disabled={!!editingId}
                />
              </Field>
              <Field label="Low Stock Alert Below">
                <input
                  type="number"
                  value={form.lowStockThreshold}
                  onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })}
                  placeholder={String(settings.lowStockThresholdDefault)}
                  className="input"
                />
              </Field>
            </div>
            {editingId && (
              <p className="text-xs text-slate-400">
                To change stock quantity, use the "Adjust Stock" button from the product list (keeps a history log).
              </p>
            )}

            <button onClick={submitForm} className="w-full rounded-xl bg-indigo-600 py-3.5 text-base font-bold text-white shadow hover:bg-indigo-700">
              {editingId ? 'Save Changes' : 'Add Product'}
            </button>
          </div>
        </Modal>
      )}

      {showScanner && <BarcodeScannerModal onDetected={handleScanForForm} onClose={() => setShowScanner(false)} />}

      {labelProduct && (
        <Modal title={`Print Label - ${labelProduct.name}`} onClose={() => setLabelProduct(null)}>
          <div id="print-label-area" className="flex flex-col items-center gap-2 py-4">
            <p className="font-bold text-slate-800">{labelProduct.name}</p>
            <p className="text-sm text-slate-500">{formatCurrency(labelProduct.price, symbol)}</p>
            <BarcodeImage value={labelProduct.barcode} />
          </div>
          <button
            onClick={() => {
              const content = document.getElementById('print-label-area')?.innerHTML;
              const w = window.open('', '_blank', 'width=400,height=400');
              if (w && content) {
                w.document.write(`<html><head><title>Label</title></head><body style="display:flex;flex-direction:column;align-items:center;font-family:sans-serif;padding:20px">${content}</body></html>`);
                w.document.close();
                w.focus();
                setTimeout(() => w.print(), 300);
              }
            }}
            className="w-full rounded-xl bg-slate-800 py-3 text-sm font-bold text-white"
          >
            🖨️ Print Label
          </button>
        </Modal>
      )}

      {stockModal && (
        <Modal title={`Adjust Stock - ${stockModal.name}`} onClose={() => setStockModal(null)}>
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Current stock: <span className="font-bold text-slate-700">{stockModal.stockQty} {stockModal.unit}</span>
            </p>
            <Field label="Quantity to add (+) or remove (-)">
              <input
                type="number"
                value={stockDelta}
                onChange={(e) => setStockDelta(e.target.value)}
                placeholder="e.g. 10 or -2"
                className="input"
              />
            </Field>
            <Field label="Reason / Note">
              <input value={stockNote} onChange={(e) => setStockNote(e.target.value)} placeholder="e.g. New stock received from supplier" className="input" />
            </Field>
            <button onClick={applyStockAdjust} className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white">
              Update Stock
            </button>
          </div>
        </Modal>
      )}

      {historyProduct && (
        <Modal title={`Stock History - ${historyProduct.name}`} onClose={() => setHistoryProduct(null)} wide>
          {historyProduct.stockLogs.length === 0 ? (
            <p className="py-6 text-center text-slate-400">No stock movement recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {historyProduct.stockLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm">
                  <div>
                    <p className="font-semibold capitalize text-slate-700">{log.type.replace('-', ' ')}</p>
                    <p className="text-xs text-slate-400">{formatDateTime(log.date)} {log.note ? `· ${log.note}` : ''}</p>
                  </div>
                  <span className={`font-bold ${log.qty >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {log.qty >= 0 ? '+' : ''}
                    {log.qty}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="mb-1 block text-sm font-semibold text-slate-600">{label}</span>
    {children}
  </label>
);

export default Inventory;
