import React, { useMemo, useState } from 'react';
import { useStore } from '../store/StoreContext';
import { formatCurrency, formatDateTime } from '../utils/format';
import Modal from '../components/Modal';
import { StatusPill } from './Dashboard';

const Customers: React.FC = () => {
  const { state } = useStore();
  const { customers, bills, settings } = state;
  const symbol = settings.currencySymbol;
  const [search, setSearch] = useState('');
  const [viewCustomerId, setViewCustomerId] = useState<string | null>(null);

  const customerStats = useMemo(() => {
    return customers.map((c) => {
      const cBills = bills.filter((b) => b.customerId === c.id);
      const totalSpent = cBills.reduce((s, b) => s + b.grandTotal, 0);
      const totalDue = cBills.reduce((s, b) => s + b.amountDue, 0);
      return { customer: c, bills: cBills, totalSpent, totalDue };
    });
  }, [customers, bills]);

  const filtered = customerStats.filter(
    (cs) => !search || cs.customer.name.toLowerCase().includes(search.toLowerCase()) || cs.customer.phone.includes(search)
  );

  const viewing = customerStats.find((cs) => cs.customer.id === viewCustomerId);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Customers</h1>
        <p className="text-slate-500">Customer purchase history and pending dues.</p>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="🔍 Search by name or phone..."
        className="input max-w-md"
      />

      <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
        {filtered.length === 0 ? (
          <p className="p-10 text-center text-slate-400">
            No customers yet. Customers are added automatically when you create a bill with their name & phone.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-slate-500">
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Phone</th>
                  <th className="px-4 py-3 font-semibold">Total Bills</th>
                  <th className="px-4 py-3 font-semibold">Total Spent</th>
                  <th className="px-4 py-3 font-semibold">Outstanding Due</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((cs) => (
                  <tr key={cs.customer.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-700">{cs.customer.name}</td>
                    <td className="px-4 py-3 text-slate-500">{cs.customer.phone}</td>
                    <td className="px-4 py-3 text-slate-500">{cs.bills.length}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700">{formatCurrency(cs.totalSpent, symbol)}</td>
                    <td className="px-4 py-3">
                      {cs.totalDue > 0 ? (
                        <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-700">
                          {formatCurrency(cs.totalDue, symbol)}
                        </span>
                      ) : (
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">Clear</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setViewCustomerId(cs.customer.id)}
                        className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-100"
                      >
                        View History
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {viewing && (
        <Modal title={`${viewing.customer.name} - Purchase History`} onClose={() => setViewCustomerId(null)} wide>
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <MiniStat label="Total Bills" value={String(viewing.bills.length)} />
            <MiniStat label="Total Spent" value={formatCurrency(viewing.totalSpent, symbol)} />
            <MiniStat label="Outstanding Due" value={formatCurrency(viewing.totalDue, symbol)} danger={viewing.totalDue > 0} />
          </div>
          <div className="space-y-2">
            {viewing.bills.map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm">
                <div>
                  <p className="font-semibold text-slate-700">{b.billNumber}</p>
                  <p className="text-xs text-slate-400">{formatDateTime(b.date)}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-700">{formatCurrency(b.grandTotal, symbol)}</p>
                  <StatusPill status={b.status} />
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
};

const MiniStat: React.FC<{ label: string; value: string; danger?: boolean }> = ({ label, value, danger }) => (
  <div className={`rounded-xl p-3 ${danger ? 'bg-rose-50' : 'bg-slate-50'}`}>
    <p className="text-xs font-semibold text-slate-500">{label}</p>
    <p className={`text-lg font-bold ${danger ? 'text-rose-600' : 'text-slate-800'}`}>{value}</p>
  </div>
);

export default Customers;
