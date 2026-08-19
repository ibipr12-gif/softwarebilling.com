import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useStore } from '../store/StoreContext';
import { Bill, PaymentMethod, Product } from '../types';
import { formatCurrency } from '../utils/format';
import BarcodeScannerModal from '../components/BarcodeScannerModal';
import Modal from '../components/Modal';
import PrintableBill from '../components/PrintableBill';

interface CartLine {
  productId: string;
  name: string;
  unit: string;
  qty: number;
  price: number;
  originalPrice: number;
  maxStock: number;
}

const Billing: React.FC = () => {
  const { state, createBill, findProductByBarcode, addCustomer } = useStore();
  const { products, customers, settings } = state;
  const symbol = settings.currencySymbol;

  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [discount, setDiscount] = useState('0');

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | undefined>(undefined);
  const [customerSuggestOpen, setCustomerSuggestOpen] = useState(false);

  const [paymentMode, setPaymentMode] = useState<'full' | 'half' | 'custom' | 'none'>('full');
  const [customAmount, setCustomAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  const [completedBill, setCompletedBill] = useState<Bill | null>(null);

  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase();
    return products
      .filter((p) => p.name.toLowerCase().includes(q) || p.barcode.toLowerCase().includes(q))
      .slice(0, 8);
  }, [search, products]);

  const customerMatches = useMemo(() => {
    if (!customerName.trim() && !customerPhone.trim()) return [];
    const q = (customerName || customerPhone).toLowerCase();
    return customers
      .filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q))
      .slice(0, 5);
  }, [customerName, customerPhone, customers]);

  const addToCart = (product: Product, qty = 1) => {
    if (product.stockQty <= 0) {
      toast.error(`${product.name} is out of stock!`);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      if (existing) {
        if (existing.qty + qty > product.stockQty) {
          toast.error(`Only ${product.stockQty} ${product.unit} available in stock`);
          return prev;
        }
        return prev.map((l) => (l.productId === product.id ? { ...l, qty: l.qty + qty } : l));
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          unit: product.unit,
          qty,
          price: product.price,
          originalPrice: product.price,
          maxStock: product.stockQty,
        },
      ];
    });
    setSearch('');
  };

  const handleScan = (code: string) => {
    setShowScanner(false);
    const product = findProductByBarcode(code);
    if (!product) {
      toast.error(`No product found with barcode: ${code}`);
      return;
    }
    addToCart(product);
    toast.success(`${product.name} added to bill`);
  };

  const updateLine = (productId: string, patch: Partial<CartLine>) => {
    setCart((prev) =>
      prev.map((l) => {
        if (l.productId !== productId) return l;
        const updated = { ...l, ...patch };
        if (updated.qty > l.maxStock) {
          toast.error(`Only ${l.maxStock} ${l.unit} available`);
          updated.qty = l.maxStock;
        }
        if (updated.qty < 1) updated.qty = 1;
        return updated;
      })
    );
  };

  const removeLine = (productId: string) => setCart((prev) => prev.filter((l) => l.productId !== productId));

  const subtotal = cart.reduce((sum, l) => sum + l.qty * l.price, 0);
  const discountNum = Math.max(0, Number(discount) || 0);
  const grandTotal = Math.max(0, subtotal - discountNum);

  const amountPaidNow = useMemo(() => {
    if (paymentMode === 'full') return grandTotal;
    if (paymentMode === 'half') return Math.round(grandTotal / 2);
    if (paymentMode === 'none') return 0;
    return Math.min(Number(customAmount) || 0, grandTotal);
  }, [paymentMode, grandTotal, customAmount]);

  const amountDue = grandTotal - amountPaidNow;

  const resetAll = () => {
    setCart([]);
    setDiscount('0');
    setCustomerName('');
    setCustomerPhone('');
    setSelectedCustomerId(undefined);
    setPaymentMode('full');
    setCustomAmount('');
    setPaymentMethod('Cash');
    setDueDate('');
    setNotes('');
  };

  const completeBill = () => {
    if (cart.length === 0) {
      toast.error('Add at least one product to the bill');
      return;
    }
    if (!customerName.trim()) {
      toast.error('Please enter customer name (use "Walk-in Customer" if unknown)');
      return;
    }
    if (amountDue > 0 && !dueDate) {
      // due date optional, don't block, just default
    }

    let customerId = selectedCustomerId;
    const trimmedName = customerName.trim();
    const trimmedPhone = customerPhone.trim();
    if (!customerId && trimmedPhone && trimmedName.toLowerCase() !== 'walk-in customer') {
      const existing = customers.find((c) => c.phone === trimmedPhone);
      if (existing) {
        customerId = existing.id;
      } else {
        const created = addCustomer({ name: trimmedName, phone: trimmedPhone });
        customerId = created.id;
      }
    }

    const bill = createBill({
      customerId,
      customerName: trimmedName,
      customerPhone: trimmedPhone || undefined,
      items: cart.map((l) => ({ productId: l.productId, qty: l.qty, price: l.price })),
      discount: discountNum,
      amountPaidNow,
      paymentMethod,
      dueDate: amountDue > 0 ? dueDate || undefined : undefined,
      notes: notes.trim() || undefined,
    });

    toast.success(`Bill ${bill.billNumber} created!`);
    setCompletedBill(bill);
    resetAll();
  };

  const printBill = () => {
    window.print();
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">New Bill</h1>
        <p className="text-slate-500">Search or scan a product to add it to the customer's bill.</p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Left: product search & results */}
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <div className="flex gap-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="🔍 Search product by name or barcode..."
                className="input flex-1"
              />
              <button onClick={() => setShowScanner(true)} className="whitespace-nowrap rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-bold text-white">
                📷 Scan Barcode
              </button>
            </div>
            {searchResults.length > 0 && (
              <div className="mt-3 max-h-64 space-y-1.5 overflow-y-auto">
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    disabled={p.stockQty <= 0}
                    className="flex w-full items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-left hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <div>
                      <p className="font-semibold text-slate-700">{p.name}</p>
                      <p className="text-xs text-slate-400">{p.category} · {p.barcode}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-slate-700">{formatCurrency(p.price, symbol)}</p>
                      <p className={`text-xs ${p.stockQty <= p.lowStockThreshold ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {p.stockQty > 0 ? `${p.stockQty} ${p.unit} in stock` : 'Out of stock'}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Cart */}
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <h2 className="mb-3 font-bold text-slate-800">Bill Items ({cart.length})</h2>
            {cart.length === 0 ? (
              <p className="py-10 text-center text-slate-400">No items added yet. Search or scan a product above.</p>
            ) : (
              <div className="space-y-3">
                {cart.map((l) => (
                  <div key={l.productId} className="rounded-xl border border-slate-100 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="font-semibold text-slate-700">{l.name}</p>
                      <button onClick={() => removeLine(l.productId)} className="text-xs font-bold text-rose-500">
                        Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <label className="block">
                        <span className="mb-1 block text-xs font-semibold text-slate-500">Qty ({l.unit})</span>
                        <input
                          type="number"
                          value={l.qty}
                          onChange={(e) => updateLine(l.productId, { qty: Number(e.target.value) })}
                          className="input"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-semibold text-slate-500">
                          Price/unit {l.price !== l.originalPrice && <span className="text-amber-500">(edited)</span>}
                        </span>
                        <input
                          type="number"
                          value={l.price}
                          onChange={(e) => updateLine(l.productId, { price: Number(e.target.value) })}
                          className="input"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-semibold text-slate-500">Total</span>
                        <div className="input flex items-center bg-slate-50 font-bold text-slate-700">
                          {formatCurrency(l.qty * l.price, symbol)}
                        </div>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: customer + payment + totals */}
        <div className="space-y-4">
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <h2 className="mb-3 font-bold text-slate-800">Customer</h2>
            <div className="relative space-y-2">
              <input
                value={customerName}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  setSelectedCustomerId(undefined);
                  setCustomerSuggestOpen(true);
                }}
                placeholder="Customer name (or 'Walk-in Customer')"
                className="input"
              />
              <input
                value={customerPhone}
                onChange={(e) => {
                  setCustomerPhone(e.target.value);
                  setCustomerSuggestOpen(true);
                }}
                placeholder="Phone number (optional)"
                className="input"
              />
              {customerSuggestOpen && customerMatches.length > 0 && (
                <div className="absolute z-10 mt-1 w-full space-y-1 rounded-xl bg-white p-2 shadow-lg ring-1 ring-slate-200">
                  {customerMatches.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        setCustomerName(c.name);
                        setCustomerPhone(c.phone);
                        setSelectedCustomerId(c.id);
                        setCustomerSuggestOpen(false);
                      }}
                      className="block w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-slate-50"
                    >
                      <span className="font-semibold text-slate-700">{c.name}</span>{' '}
                      <span className="text-slate-400">{c.phone}</span>
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={() => setCustomerName('Walk-in Customer')}
                className="text-xs font-semibold text-indigo-600"
              >
                Use "Walk-in Customer"
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <h2 className="mb-3 font-bold text-slate-800">Totals</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span className="font-semibold text-slate-700">{formatCurrency(subtotal, symbol)}</span>
              </div>
              <label className="flex items-center justify-between text-slate-500">
                <span>Discount ({symbol})</span>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="w-28 rounded-lg border border-slate-200 px-2 py-1.5 text-right text-sm"
                />
              </label>
              <div className="flex justify-between border-t border-dashed pt-2 text-base font-bold text-slate-800">
                <span>Grand Total</span>
                <span>{formatCurrency(grandTotal, symbol)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
            <h2 className="mb-3 font-bold text-slate-800">Payment</h2>
            <div className="mb-3 grid grid-cols-2 gap-2">
              <PayModeBtn active={paymentMode === 'full'} onClick={() => setPaymentMode('full')} label="Full Payment" />
              <PayModeBtn active={paymentMode === 'half'} onClick={() => setPaymentMode('half')} label="Half Now, Half Later" />
              <PayModeBtn active={paymentMode === 'custom'} onClick={() => setPaymentMode('custom')} label="Custom Amount" />
              <PayModeBtn active={paymentMode === 'none'} onClick={() => setPaymentMode('none')} label="Pay Full Later (Credit)" />
            </div>

            {paymentMode === 'custom' && (
              <label className="mb-3 block">
                <span className="mb-1 block text-xs font-semibold text-slate-500">Amount received now ({symbol})</span>
                <input type="number" value={customAmount} onChange={(e) => setCustomAmount(e.target.value)} className="input" />
              </label>
            )}

            {amountPaidNow > 0 && (
              <label className="mb-3 block">
                <span className="mb-1 block text-xs font-semibold text-slate-500">Payment method</span>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)} className="input">
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                </select>
              </label>
            )}

            {amountDue > 0 && (
              <label className="mb-3 block">
                <span className="mb-1 block text-xs font-semibold text-slate-500">Due date (optional reminder)</span>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="input" />
              </label>
            )}

            <div className="rounded-xl bg-slate-50 p-3 text-sm">
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>Paying Now</span>
                <span>{formatCurrency(amountPaidNow, symbol)}</span>
              </div>
              <div className="flex justify-between font-bold text-rose-600">
                <span>Balance Due</span>
                <span>{formatCurrency(amountDue, symbol)}</span>
              </div>
            </div>

            <label className="mt-3 block">
              <span className="mb-1 block text-xs font-semibold text-slate-500">Notes (optional)</span>
              <input value={notes} onChange={(e) => setNotes(e.target.value)} className="input" placeholder="e.g. Delivery address, special instructions" />
            </label>

            <button
              onClick={completeBill}
              className="mt-4 w-full rounded-xl bg-indigo-600 py-3.5 text-base font-bold text-white shadow hover:bg-indigo-700"
            >
              ✅ Complete Bill & Generate Invoice
            </button>
          </div>
        </div>
      </div>

      {showScanner && <BarcodeScannerModal onDetected={handleScan} onClose={() => setShowScanner(false)} />}

      {completedBill && (
        <Modal
          title="Bill Created Successfully"
          onClose={() => setCompletedBill(null)}
          wide
          footer={
            <div className="flex gap-2">
              <button onClick={printBill} className="flex-1 rounded-xl bg-slate-800 py-3 text-sm font-bold text-white">
                🖨️ Print Invoice
              </button>
              <button onClick={() => setCompletedBill(null)} className="flex-1 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white">
                Start New Bill
              </button>
            </div>
          }
        >
          <PrintableBill bill={completedBill} settings={settings} />
        </Modal>
      )}
    </div>
  );
};

const PayModeBtn: React.FC<{ active: boolean; onClick: () => void; label: string }> = ({ active, onClick, label }) => (
  <button
    onClick={onClick}
    className={`rounded-xl px-3 py-2.5 text-xs font-bold ${active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}
  >
    {label}
  </button>
);

export default Billing;
