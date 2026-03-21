'use client';
export function KpiCard({ label, value, unit, icon, accent }: { label: string; value: string; unit?: string; icon?: React.ReactNode; accent?: boolean }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-3">
      {icon && <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${accent ? 'bg-blue-50' : 'bg-gray-50'}`}>{icon}</div>}
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-lg font-bold text-gray-900">{value}{unit && <span className="text-sm font-normal text-gray-400 ml-1">{unit}</span>}</p>
      </div>
    </div>
  );
}
