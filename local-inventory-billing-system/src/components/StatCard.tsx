import React from 'react';

interface Props {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: string;
  sub?: string;
}

const StatCard: React.FC<Props> = ({ label, value, icon, accent, sub }) => {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-100">
      <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl ${accent}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-slate-500">{label}</p>
        <p className="truncate text-2xl font-bold text-slate-800">{value}</p>
        {sub && <p className="truncate text-xs text-slate-400">{sub}</p>}
      </div>
    </div>
  );
};

export default StatCard;
