'use client';
export function KpiCard({ label, value, unit, icon, accent }: { label: string; value: string; unit?: string; icon?: React.ReactNode; accent?: boolean }) {
  return (
    <div className="bg-[#131620] rounded-xl border border-[#2C2E39] p-4 flex items-center gap-3">
      {icon && <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-[#1B1E27]">{icon}</div>}
      <div>
        <p className="text-xs text-[#454A5F]">{label}</p>
        <p className="text-lg font-bold text-[#F5F5F7]">{value}{unit && <span className="text-sm font-normal text-[#454A5F] ml-1">{unit}</span>}</p>
      </div>
    </div>
  );
}
