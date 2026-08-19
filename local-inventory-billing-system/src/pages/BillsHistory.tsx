import React, { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useStore } from '../store/StoreContext';
import { Bill, PaymentMethod } from '../types';
import { formatCurrency, formatDateTime } from '../utils/format';
import Modal from '../components/Modal';
import PrintableBill from '../components/PrintableBill';
import { StatusPill } from './Dashboard';

const BillsHistory: React.FC = () => {
  const { state, addPaymentToBill } = useStore();
  const { bills, settings } = state;
  const symbol = settings.currencySymbol;

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | Bill['status']>('All');
  const [viewBill, setViewBill] = useState<Bill | null>(null);
  const [payBill, setPayBill] = useState<Bill | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('Cash');

  const filtered = useMemo(() => {
    return bills.filter((b) => {
      const matchesSearch =
        !search ||
        b.billNumber.toLowerCase().includes(search.toLowerCase()) ||
        b.customerName.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'All' || b.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [bills, search, statusFilter]);

  const submitPayment = () => {
    if (!payBill) return;
    const amt = Number(payAmount);
    if (!amt || amt <= 0) {
      toast.error('Enter a valid payment amount');
      return;
    }
    if (amt > payBill.amountDue) {
      toast.error(`Amount cannot exceed the due balance of ${formatCurrency(payBill.amountDue, symbol)}`);
      return;
    }
    addPaymentToBill(payBill.id, amt, payMethod);
    toast.success('Payment recorded');
    setPayBill(null);
    setPayAmount('');
  };

  // find the up-to-date bill object (for printing/viewing after edits)
  const liveBill = (id: string) => bills.find((b) => b.id === id) || null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Sales History</h1>
        <p className="text-slate-500">All bills, track dues and collect pending payments.</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Search by bill number or customer..."
          className="input min-w-[220px] flex-1"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} className="input w-auto">
          <option value="All">All Status</option>
          <option value="Paid">Paid</option>
          <option value="Partial">Partial</option>
          <option value="Unpaid">Unpaid (Credit)</option>
        </select>
      </div>

      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        {filtered.length === 0 ? (
          <p className="p-10 text-center text-slate-400">No bills found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-slate-500">
                  <th className="px-4 py-3 font-semibold">Bill #</th>
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Total</th>
                  <th className="px-4 py-3 font-semibold">Due</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr key={b.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-700">{b.billNumber}</td>
                    <td className="px-4 py-3 text-slate-600">{b.customerName}</td>
                    <td className="px-4 py-3 text-slate-500">{formatDateTime(b.date)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{formatCurrency(b.grandTotal, symbol)}</td>
                    <td className="px-4 py-3 font-semibold text-rose-600">{b.amountDue > 0 ? formatCurrency(b.amountDue, symbol) : '-'}</td>
                    <td className="px-4 py-3">
                      <StatusPill status={b.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => setViewBill(b)} className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200">
                          View
                        </button>
                        {b.amountDue > 0 && (
                          <button
                            onClick={() => {
                              setPayBill(b);
                              setPayAmount(String(b.amountDue));
                            }}
                            className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-100"
                          >
                            Collect Payment
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {viewBill && (
        <Modal
          title={`Bill ${viewBill.billNumber}`}
          onClose={() => setViewBill(null)}
          wide
          footer={
            <button onClick={() => window.print()} className="w-full rounded-xl bg-slate-800 py-3 text-sm font-bold text-white">
              🖨️ Print / Reprint Invoice
            </button>
          }
        >
          <PrintableBill bill={liveBill(viewBill.id) || viewBill} settings={settings} />
        </Modal>
      )}

      {payBill && (
        <Modal title={`Collect Payment - ${payBill.billNumber}`} onClose={() => setPayBill(null)}>
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Outstanding balance: <span className="font-bold text-rose-600">{formatCurrency(payBill.amountDue, symbol)}</span>
            </p>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-600">Amount received ({symbol})</span>
              <input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="input" />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-600">Payment method</span>
              <select value={payMethod} onChange={(e) => setPayMethod(e.target.value as PaymentMethod)} className="input">
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </label>
            <button onClick={submitPayment} className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white">
              Confirm Payment
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default BillsHistory;
