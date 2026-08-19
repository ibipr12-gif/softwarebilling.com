import React, { useMemo } from 'react';
import { useStore } from '../store/StoreContext';
import StatCard from '../components/StatCard';
import { formatCurrency, formatDateTime } from '../utils/format';

interface Props {
  onNavigate: (tab: string) => void;
}

const Dashboard: React.FC<Props> = ({ onNavigate }) => {
  const { state } = useStore();
  const { products, bills, claims, settings } = state;
  const symbol = settings.currencySymbol;

  const todayStr = new Date().toDateString();

  const stats = useMemo(() => {
    const todaysBills = bills.filter((b) => new Date(b.date).toDateString() === todayStr);
    const todaysSales = todaysBills.reduce((sum, b) => sum + b.grandTotal, 0);
    const totalDue = bills.reduce((sum, b) => sum + b.amountDue, 0);
    const stockValue = products.reduce((sum, p) => sum + p.price * p.stockQty, 0);
    const lowStock = products.filter((p) => p.stockQty <= p.lowStockThreshold);
    const pendingClaims = claims.filter((c) => c.status === 'Pending');
    return { todaysSales, todaysCount: todaysBills.length, totalDue, stockValue, lowStock, pendingClaims };
  }, [bills, products, claims, todayStr]);

  const recentBills = [...bills].slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Welcome back 👋</h1>
          <p className="text-slate-500">Here's how your shop is doing today.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onNavigate('billing')}
            className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow hover:bg-indigo-700"
          >
            + Create New Bill
          </button>
          <button
            onClick={() => onNavigate('inventory')}
            className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow ring-1 ring-slate-200 hover:bg-slate-50"
          >
            + Add Product
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Today's Sales"
          value={formatCurrency(stats.todaysSales, symbol)}
          sub={`${stats.todaysCount} bill(s) today`}
          icon={<span>💰</span>}
          accent="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          label="Total Outstanding Dues"
          value={formatCurrency(stats.totalDue, symbol)}
          sub="From partial/unpaid bills"
          icon={<span>⏳</span>}
          accent="bg-amber-50 text-amber-600"
        />
        <StatCard
          label="Stock Value"
          value={formatCurrency(stats.stockValue, symbol)}
          sub={`${products.length} product(s) in catalog`}
          icon={<span>📦</span>}
          accent="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          label="Low Stock Items"
          value={String(stats.lowStock.length)}
          sub="Needs restocking soon"
          icon={<span>⚠️</span>}
          accent="bg-rose-50 text-rose-600"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-bold text-slate-800">Recent Bills</h2>
            <button onClick={() => onNavigate('bills')} className="text-sm font-semibold text-indigo-600">
              View all →
            </button>
          </div>
          {recentBills.length === 0 ? (
            <p className="py-8 text-center text-slate-400">No bills yet. Create your first bill to get started.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-slate-500">
                    <th className="py-2 font-semibold">Bill #</th>
                    <th className="py-2 font-semibold">Customer</th>
                    <th className="py-2 font-semibold">Date</th>
                    <th className="py-2 font-semibold">Amount</th>
                    <th className="py-2 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentBills.map((b) => (
                    <tr key={b.id} className="border-b border-slate-50">
                      <td className="py-2 font-semibold text-slate-700">{b.billNumber}</td>
                      <td className="py-2 text-slate-600">{b.customerName}</td>
                      <td className="py-2 text-slate-500">{formatDateTime(b.date)}</td>
                      <td className="py-2 font-semibold text-slate-700">{formatCurrency(b.grandTotal, symbol)}</td>
                      <td className="py-2">
                        <StatusPill status={b.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <h2 className="mb-3 font-bold text-slate-800">Low Stock Alerts</h2>
            {stats.lowStock.length === 0 ? (
              <p className="text-sm text-slate-400">All stock levels look healthy.</p>
            ) : (
              <ul className="space-y-2">
                {stats.lowStock.slice(0, 6).map((p) => (
                  <li key={p.id} className="flex items-center justify-between rounded-xl bg-rose-50 px-3 py-2 text-sm">
                    <span className="font-semibold text-rose-700">{p.name}</span>
                    <span className="font-bold text-rose-600">{p.stockQty} {p.unit} left</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
            <h2 className="mb-3 font-bold text-slate-800">Pending Return/Exchange</h2>
            {stats.pendingClaims.length === 0 ? (
              <p className="text-sm text-slate-400">No pending claims.</p>
            ) : (
              <ul className="space-y-2">
                {stats.pendingClaims.slice(0, 6).map((c) => (
                  <li key={c.id} className="flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2 text-sm">
                    <span className="font-semibold text-amber-700">{c.claimNumber} · {c.type}</span>
                    <span className="text-amber-600">{c.productName}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const StatusPill: React.FC<{ status: string }> = ({ status }) => {
  const styles: Record<string, string> = {
    Paid: 'bg-emerald-100 text-emerald-700',
    Partial: 'bg-amber-100 text-amber-700',
    Unpaid: 'bg-rose-100 text-rose-700',
    Pending: 'bg-amber-100 text-amber-700',
    Approved: 'bg-sky-100 text-sky-700',
    Completed: 'bg-emerald-100 text-emerald-700',
    Rejected: 'bg-rose-100 text-rose-700',
  };
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${styles[status] || 'bg-slate-100 text-slate-600'}`}>
      {status}
    </span>
  );
};

export default Dashboard;
