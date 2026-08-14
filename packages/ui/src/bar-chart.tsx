const CHART_HEIGHT_PX = 140;

export function BarChart({ data }: { data: { label: string; value: number; displayValue?: string }[] }) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div>
      <div className="flex items-end gap-2" style={{ height: CHART_HEIGHT_PX }}>
        {data.map((d) => (
          <div key={d.label} className="flex h-full flex-1 items-end" title={d.displayValue ?? String(d.value)}>
            <div
              className="w-full rounded-t-md bg-primary transition-[height] duration-300 hover:opacity-70"
              style={{ height: `${Math.max((d.value / max) * CHART_HEIGHT_PX, 4)}px` }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        {data.map((d) => (
          <span key={d.label} className="flex-1 text-center text-xs text-muted-foreground">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}
