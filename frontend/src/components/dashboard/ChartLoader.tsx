'use client';

export default function ChartLoader({ height = 280 }: { height?: number }) {
  return (
    <div className="flex items-center justify-center" style={{ height }}>
      <div className="flex flex-col items-center gap-2">
        <div
          className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin"
          style={{ color: 'var(--color-accent, #5CE5A0)' }}
        />
        <span className="text-[10px] text-muted-foreground">Loading chart...</span>
      </div>
    </div>
  );
}
