import React from 'react';
import { Bill, ShopSettings } from '../types';
import { formatCurrency, formatDateTime } from '../utils/format';

interface Props {
  bill: Bill;
  settings: ShopSettings;
}

const PrintableBill: React.FC<Props> = ({ bill, settings }) => {
  const symbol = settings.currencySymbol;
  return (
    <div id="printable-bill" className="mx-auto max-w-md bg-white p-2 text-sm text-slate-800">
      <div className="text-center">
        <h2 className="text-lg font-bold">{settings.shopName}</h2>
        <p className="text-xs text-slate-500">{settings.address}</p>
        <p className="text-xs text-slate-500">{settings.phone}</p>
      </div>
      <hr className="my-3 border-dashed" />
      <div className="flex justify-between text-xs">
        <span>Bill #: <b>{bill.billNumber}</b></span>
        <span>{formatDateTime(bill.date)}</span>
      </div>
      <div className="mt-1 text-xs">
        <p>Customer: <b>{bill.customerName}</b></p>
        {bill.customerPhone && <p>Phone: {bill.customerPhone}</p>}
      </div>
      <hr className="my-3 border-dashed" />
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-300 text-left">
            <th className="py-1">Item</th>
            <th className="py-1 text-center">Qty</th>
            <th className="py-1 text-right">Price</th>
            <th className="py-1 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {bill.items.map((it) => (
            <tr key={it.id} className="border-b border-slate-100">
              <td className="py-1 pr-1">{it.name}</td>
              <td className="py-1 text-center">{it.qty} {it.unit}</td>
              <td className="py-1 text-right">{formatCurrency(it.price, symbol)}</td>
              <td className="py-1 text-right">{formatCurrency(it.total, symbol)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <hr className="my-3 border-dashed" />
      <div className="space-y-1 text-xs">
        <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(bill.subtotal, symbol)}</span></div>
        {bill.discount > 0 && <div className="flex justify-between"><span>Discount</span><span>-{formatCurrency(bill.discount, symbol)}</span></div>}
        <div className="flex justify-between text-sm font-bold"><span>Grand Total</span><span>{formatCurrency(bill.grandTotal, symbol)}</span></div>
        <div className="flex justify-between"><span>Paid</span><span>{formatCurrency(bill.amountPaid, symbol)}</span></div>
        <div className="flex justify-between font-bold text-rose-600"><span>Balance Due</span><span>{formatCurrency(bill.amountDue, symbol)}</span></div>
      </div>
      {bill.payments.length > 0 && (
        <>
          <hr className="my-3 border-dashed" />
          <p className="mb-1 text-xs font-semibold">Payment History</p>
          {bill.payments.map((p) => (
            <div key={p.id} className="flex justify-between text-xs">
              <span>{formatDateTime(p.date)} ({p.method})</span>
              <span>{formatCurrency(p.amount, symbol)}</span>
            </div>
          ))}
        </>
      )}
      <hr className="my-3 border-dashed" />
      <p className="text-center text-xs font-semibold">{bill.status === 'Unpaid' ? 'CREDIT - PAYMENT PENDING' : bill.status === 'Partial' ? 'PARTIALLY PAID - BALANCE DUE' : 'PAID IN FULL'}</p>
      <p className="mt-3 text-center text-xs text-slate-500">{settings.footerNote}</p>
    </div>
  );
};

export default PrintableBill;
