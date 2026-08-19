import React, { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useStore } from '../store/StoreContext';
import { formatDateTime } from '../utils/format';

const Backup: React.FC = () => {
  const { state, exportBackup, importBackup, resetAllData } = useStore();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importing, setImporting] = useState(false);
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(
    () => localStorage.getItem('sofa_shop_last_backup') || null
  );

  const handleExport = () => {
    exportBackup();
    const now = new Date().toISOString();
    localStorage.setItem('sofa_shop_last_backup', now);
    setLastBackupTime(now);
    toast.success('Backup file saved to your device (check Downloads folder)');
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm('Importing a backup will REPLACE all current data on this device. Continue?')) {
      e.target.value = '';
      return;
    }
    setImporting(true);
    try {
      await importBackup(file);
      toast.success('Backup restored successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to import backup. Please check the file is a valid backup.');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const handleReset = () => {
    if (confirm('This will PERMANENTLY delete ALL data (products, bills, customers, claims) from this device. Are you absolutely sure?')) {
      if (confirm('Please confirm again: Delete everything?')) {
        resetAllData();
        toast.success('All data has been cleared');
      }
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Backup & Restore</h1>
        <p className="text-slate-500">
          Your data is automatically saved on this device. Use backups to keep a safety copy, or move data to another tablet/PC.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <div className="mb-3 text-3xl">💾</div>
          <h2 className="mb-1 font-bold text-slate-800">Export Backup</h2>
          <p className="mb-4 text-sm text-slate-500">
            Save a copy of all your products, bills, customers and claims as a file on this device.
          </p>
          <button onClick={handleExport} className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow hover:bg-indigo-700">
            Export Backup File
          </button>
          {lastBackupTime && <p className="mt-2 text-center text-xs text-slate-400">Last backup: {formatDateTime(lastBackupTime)}</p>}
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
          <div className="mb-3 text-3xl">📂</div>
          <h2 className="mb-1 font-bold text-slate-800">Import Backup</h2>
          <p className="mb-4 text-sm text-slate-500">
            Restore data from a previously exported backup file. This will replace all current data on this device.
          </p>
          <button
            onClick={handleImportClick}
            disabled={importing}
            className="w-full rounded-xl bg-slate-800 py-3 text-sm font-bold text-white shadow hover:bg-slate-900 disabled:opacity-50"
          >
            {importing ? 'Importing…' : 'Choose Backup File to Import'}
          </button>
          <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleFileChange} />
        </div>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <h2 className="mb-3 font-bold text-slate-800">Current Data Summary</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryBox label="Products" value={state.products.length} />
          <SummaryBox label="Bills" value={state.bills.length} />
          <SummaryBox label="Customers" value={state.customers.length} />
          <SummaryBox label="Claims" value={state.claims.length} />
        </div>
      </div>

      <div className="rounded-2xl bg-rose-50 p-6 ring-1 ring-rose-100">
        <h2 className="mb-1 font-bold text-rose-700">⚠️ Danger Zone</h2>
        <p className="mb-4 text-sm text-rose-600">
          Permanently erase all data from this device. Make sure you have exported a backup first!
        </p>
        <button onClick={handleReset} className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-rose-700">
          Erase All Data
        </button>
      </div>

      <div className="rounded-2xl bg-amber-50 p-5 text-sm text-amber-700 ring-1 ring-amber-100">
        <p className="font-semibold">💡 Tips for using on a tablet:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Backup files are saved to your Downloads folder — move them to a USB drive, SD card, or cloud storage regularly.</li>
          <li>Data is stored directly in this browser on this device — clearing browser data/cache will erase it, so back up often.</li>
          <li>To move your shop data to a new tablet or PC, export a backup here and import it on the new device.</li>
        </ul>
      </div>
    </div>
  );
};

const SummaryBox: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="rounded-xl bg-slate-50 p-4 text-center">
    <p className="text-2xl font-bold text-slate-800">{value}</p>
    <p className="text-xs font-semibold text-slate-500">{label}</p>
  </div>
);

export default Backup;
