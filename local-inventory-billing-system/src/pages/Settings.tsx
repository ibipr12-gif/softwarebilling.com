import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useStore } from '../store/StoreContext';

const Settings: React.FC = () => {
  const { state, updateSettings } = useStore();
  const [form, setForm] = useState(state.settings);

  const save = () => {
    updateSettings(form);
    toast.success('Settings saved');
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
        <p className="text-slate-500">Shop details shown on printed invoices, plus system preferences.</p>
      </div>

      <div className="space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <Field label="Shop Name">
          <input value={form.shopName} onChange={(e) => setForm({ ...form, shopName: e.target.value })} className="input" />
        </Field>
        <Field label="Address">
          <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input" />
        </Field>
        <Field label="Phone Number">
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Currency Symbol">
            <input value={form.currencySymbol} onChange={(e) => setForm({ ...form, currencySymbol: e.target.value })} className="input" />
          </Field>
          <Field label="Default Low Stock Alert Level">
            <input
              type="number"
              value={form.lowStockThresholdDefault}
              onChange={(e) => setForm({ ...form, lowStockThresholdDefault: Number(e.target.value) })}
              className="input"
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Invoice Number Prefix">
            <input value={form.invoicePrefix} onChange={(e) => setForm({ ...form, invoicePrefix: e.target.value })} className="input" />
          </Field>
          <Field label="Claim Number Prefix">
            <input value={form.claimPrefix} onChange={(e) => setForm({ ...form, claimPrefix: e.target.value })} className="input" />
          </Field>
        </div>
        <Field label="Invoice Footer Note">
          <input value={form.footerNote} onChange={(e) => setForm({ ...form, footerNote: e.target.value })} className="input" />
        </Field>

        <button onClick={save} className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow hover:bg-indigo-700">
          Save Settings
        </button>
      </div>

      <div className="rounded-2xl bg-slate-50 p-5 text-sm text-slate-500 ring-1 ring-slate-100">
        <p className="font-semibold text-slate-600">About this software</p>
        <p className="mt-1">
          Runs fully offline in your browser — no internet or database server needed. All data is saved directly on this
          device. Works great on Samsung tablets (Chrome) and PCs. Remember to export backups regularly from the Backup page.
        </p>
      </div>
    </div>
  );
};

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="mb-1 block text-sm font-semibold text-slate-600">{label}</span>
    {children}
  </label>
);

export default Settings;
