'use client';
export function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#131620] rounded-xl border border-[#2C2E39] overflow-hidden">
      <div className="px-4 py-3 border-b border-[#2C2E39]/50">
        <h3 className="text-sm font-semibold text-[#F5F5F7]/80">{title}</h3>
      </div>
      <div className="px-4 py-3 h-[280px]">{children}</div>
    </div>
  );
}
