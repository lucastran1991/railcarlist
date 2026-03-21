'use client';
export function KpiCard({ label, value, unit, icon, accent }: { label: string; value: string; unit?: string; icon?: React.ReactNode; accent?: boolean }) {
  return (
    <div className="bg-[#131620] rounded-xl border border-[#2C2E39] p-3 sm:p-4 flex items-center gap-2 sm:gap-3 min-w-0">
      {icon && <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0 bg-[#1B1E27]">{icon}</div>}
      <div className="min-w-0">
        <p className="text-[10px] sm:text-xs text-[#454A5F] truncate">{label}</p>
        <p className="text-base sm:text-lg font-bold text-[#F5F5F7] truncate">
          {value}{unit && <span className="text-xs sm:text-sm font-normal text-[#454A5F] ml-1">{unit}</span>}
        </p>
      </div>
    </div>
  );
}
