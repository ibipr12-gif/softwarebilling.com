import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useStore } from '../store/StoreContext';
import { ClaimRecord, ClaimType } from '../types';
import { formatCurrency, formatDateTime } from '../utils/format';
import Modal from '../components/Modal';
import { StatusPill } from './Dashboard';

const Claims: React.FC = () => {
  const { state, createClaim, updateClaimStatus } = useStore();
  const { bills, products, claims, settings } = state;
  const symbol = settings.currencySymbol;

  const [showForm, setShowForm] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'All' | ClaimType>('All');

  const [claimType, setClaimType] = useState<ClaimType>('Return');
  const [billSearch, setBillSearch] = useState('');
  const [linkedBillId, setLinkedBillId] = useState<string | undefined>(undefined);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [productId, setProductId] = useState<string | undefined>(undefined);
  const [productNameFree, setProductNameFree] = useState('');
  const [qty, setQty] = useState('1');
  const [reason, setReason] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [exchangeProductId, setExchangeProductId] = useState<string | undefined>(undefined);
  const [exchangeQty, setExchangeQty] = useState('1');
  const [warrantyOutcome, setWarrantyOutcome] = useState<ClaimRecord['warrantyOutcome']>('Pending');
  const [notes, setNotes] = useState('');

  const billMatches = useMemo(() => {
    if (!billSearch.trim()) return [];
    const q = billSearch.toLowerCase();
    return bills.filter((b) => b.billNumber.toLowerCase().includes(q) || b.customerName.toLowerCase().includes(q)).slice(0, 6);
  }, [billSearch, bills]);

  const linkedBill = bills.find((b) => b.id === linkedBillId);

  const productSearchList = useMemo(() => products, [products]);
  const exchangeSearchList = useMemo(() => products, [products]);

  const resetForm = () => {
    setClaimType('Return');
    setBillSearch('');
    setLinkedBillId(undefined);
    setCustomerName('');
    setCustomerPhone('');
    setProductId(undefined);
    setProductNameFree('');
    setQty('1');
    setReason('');
    setRefundAmount('');
    setExchangeProductId(undefined);
    setExchangeQty('1');
    setWarrantyOutcome('Pending');
    setNotes('');
  };

  const selectBillItemAsProduct = (pid: string, price: number) => {
    setProductId(pid);
    const product = products.find((p) => p.id === pid);
    setProductNameFree(product?.name || '');
    if (claimType === 'Return') {
      setRefundAmount(String(price * Number(qty || 1)));
    }
  };

  const submitClaim = () => {
    const finalProductName = productNameFree || products.find((p) => p.id === productId)?.name || '';
    if (!finalProductName.trim()) {
      toast.error('Please select or enter a product name');
      return;
    }
    if (!reason.trim()) {
      toast.error('Please enter a reason');
      return;
    }
    const qtyNum = Number(qty) || 1;

    const claim = createClaim({
      type: claimType,
      billId: linkedBillId,
      customerName: customerName.trim() || linkedBill?.customerName || 'Walk-in Customer',
      customerPhone: customerPhone.trim() || linkedBill?.customerPhone,
      productId,
      productName: finalProductName,
      qty: qtyNum,
      reason: reason.trim(),
      refundAmount: refundAmount ? Number(refundAmount) : undefined,
      exchangeProductId: claimType === 'Exchange' ? exchangeProductId : undefined,
      exchangeQty: claimType === 'Exchange' ? Number(exchangeQty) || 1 : undefined,
      warrantyOutcome: claimType === 'Warranty Claim' ? warrantyOutcome : undefined,
      notes: notes.trim() || undefined,
    });

    toast.success(`${claimType} recorded as ${claim.claimNumber}`);
    setShowForm(false);
    resetForm();
  };

  const filteredClaims = claims.filter((c) => typeFilter === 'All' || c.type === typeFilter);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Returns, Exchanges & Warranty Claims</h1>
          <p className="text-slate-500">Track product returns, exchanges and warranty issues.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow hover:bg-indigo-700">
          + New Return / Exchange / Claim
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {(['All', 'Return', 'Exchange', 'Warranty Claim'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-bold ${typeFilter === t ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        {filteredClaims.length === 0 ? (
          <p className="p-10 text-center text-slate-400">No records found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-slate-500">
                  <th className="px-4 py-3 font-semibold">Claim #</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 font-semibold">Product</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Update</th>
                </tr>
              </thead>
              <tbody>
                {filteredClaims.map((c) => (
                  <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-700">{c.claimNumber}</td>
                    <td className="px-4 py-3 text-slate-600">{c.type}</td>
                    <td className="px-4 py-3 text-slate-600">{c.customerName}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {c.productName} <span className="text-xs text-slate-400">x{c.qty}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDateTime(c.date)}</td>
                    <td className="px-4 py-3">
                      <StatusPill status={c.status} />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={c.status}
                        onChange={(e) => updateClaimStatus(c.id, e.target.value as ClaimRecord['status'])}
                        className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-semibold"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Approved">Approved</option>
                        <option value="Completed">Completed</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <Modal title="New Return / Exchange / Warranty Claim" onClose={() => setShowForm(false)} wide>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {(['Return', 'Exchange', 'Warranty Claim'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setClaimType(t)}
                  className={`rounded-xl px-3 py-3 text-sm font-bold ${claimType === t ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="mb-2 text-sm font-semibold text-slate-600">Link to original bill (recommended, optional)</p>
              <input
                value={billSearch}
                onChange={(e) => setBillSearch(e.target.value)}
                placeholder="Search bill number or customer name..."
                className="input"
              />
              {billMatches.length > 0 && (
                <div className="mt-2 space-y-1">
                  {billMatches.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => {
                        setLinkedBillId(b.id);
                        setBillSearch(`${b.billNumber} - ${b.customerName}`);
                        setCustomerName(b.customerName);
                        setCustomerPhone(b.customerPhone || '');
                      }}
                      className="block w-full rounded-lg bg-white px-3 py-2 text-left text-sm ring-1 ring-slate-200 hover:bg-indigo-50"
                    >
                      <span className="font-semibold">{b.billNumber}</span> · {b.customerName} · {formatCurrency(b.grandTotal, symbol)}
                    </button>
                  ))}
                </div>
              )}
              {linkedBill && (
                <div className="mt-3">
                  <p className="mb-1 text-xs font-semibold text-slate-500">Select product from this bill:</p>
                  <div className="flex flex-wrap gap-2">
                    {linkedBill.items.map((it) => (
                      <button
                        key={it.id}
                        onClick={() => selectBillItemAsProduct(it.productId, it.price)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${productId === it.productId ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}
                      >
                        {it.name} (x{it.qty})
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Customer Name">
                <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="input" placeholder="Walk-in Customer" />
              </Field>
              <Field label="Customer Phone (optional)">
                <input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="input" />
              </Field>
            </div>

            {!linkedBill && (
              <Field label="Product (search catalog or type name manually)">
                <input
                  value={productNameFree}
                  onChange={(e) => setProductNameFree(e.target.value)}
                  className="input"
                  placeholder="Type product name"
                  list="product-options"
                />
                <datalist id="product-options">
                  {productSearchList.map((p) => (
                    <option key={p.id} value={p.name} />
                  ))}
                </datalist>
                <button
                  type="button"
                  onClick={() => {
                    const match = products.find((p) => p.name.toLowerCase() === productNameFree.toLowerCase());
                    if (match) setProductId(match.id);
                  }}
                  className="mt-1 text-xs font-semibold text-indigo-600"
                >
                  Link to catalog product (for stock adjustment)
                </button>
              </Field>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field label="Quantity">
                <input type="number" value={qty} onChange={(e) => setQty(e.target.value)} className="input" />
              </Field>
              <Field label={`Refund Amount (${symbol}) - if applicable`}>
                <input type="number" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} className="input" />
              </Field>
            </div>

            <Field label="Reason">
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} className="input" rows={2} placeholder="e.g. Wrong size delivered, manufacturing defect..." />
            </Field>

            {claimType === 'Exchange' && (
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="mb-2 text-sm font-semibold text-slate-600">Exchange for new product</p>
                <select
                  value={exchangeProductId || ''}
                  onChange={(e) => setExchangeProductId(e.target.value || undefined)}
                  className="input mb-2"
                >
                  <option value="">Select replacement product...</option>
                  {exchangeSearchList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} - {formatCurrency(p.price, symbol)} ({p.stockQty} {p.unit} in stock)
                    </option>
                  ))}
                </select>
                <Field label="Exchange Quantity">
                  <input type="number" value={exchangeQty} onChange={(e) => setExchangeQty(e.target.value)} className="input" />
                </Field>
              </div>
            )}

            {claimType === 'Warranty Claim' && (
              <Field label="Warranty Outcome">
                <select value={warrantyOutcome} onChange={(e) => setWarrantyOutcome(e.target.value as any)} className="input">
                  <option value="Pending">Pending / Under Review</option>
                  <option value="Repaired">Repaired</option>
                  <option value="Replaced">Replaced with new unit</option>
                  <option value="Refunded">Refunded</option>
                </select>
              </Field>
            )}

            <Field label="Additional Notes">
              <input value={notes} onChange={(e) => setNotes(e.target.value)} className="input" />
            </Field>

            <button onClick={submitClaim} className="w-full rounded-xl bg-indigo-600 py-3.5 text-base font-bold text-white shadow hover:bg-indigo-700">
              Save {claimType}
            </button>
          </div>
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

export default Claims;
