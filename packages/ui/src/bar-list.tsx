export function BarList({
  items,
}: {
  items: { label: string; value: number; displayValue?: string }[];
}) {
  const max = Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label} title={item.displayValue ?? String(item.value)}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-medium">{item.label}</span>
            <span className="text-muted-foreground">{item.displayValue ?? item.value}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300"
              style={{ width: `${Math.max((item.value / max) * 100, 2)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
