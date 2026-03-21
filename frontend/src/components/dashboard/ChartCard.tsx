'use client';
export function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-border/50">
        <h3 className="text-xs sm:text-sm font-semibold text-foreground/80">{title}</h3>
      </div>
      <div className="px-2 sm:px-4 py-2 sm:py-3 h-[220px] sm:h-[280px]">{children}</div>
    </div>
  );
}
