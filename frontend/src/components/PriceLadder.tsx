import type { Mover } from "../types";

export default function PriceLadder({ mover }: { mover: Mover }) {
  const steps = mover.calls
    .slice()
    .sort((a, b) => a.wave - b.wave || a.id.localeCompare(b.id))
    .flatMap(c => {
      const items: { label: string; value: number; cited?: number }[] = [];
      if (c.initialQuoteEur != null) {
        items.push({ label: `W${c.wave} open`, value: c.initialQuoteEur, cited: c.citedQuoteEur });
      }
      const fin = c.finalQuoteEur ?? c.initialQuoteEur;
      if (fin != null) {
        items.push({ label: `W${c.wave} final`, value: fin, cited: c.citedQuoteEur });
      }
      return items;
    })
    .filter(s => s.value != null);

  if (!steps.length) return null;

  const max = Math.max(...steps.map(s => s.value));
  const min = Math.min(...steps.map(s => s.value));
  const saved = steps[0].value - steps[steps.length - 1].value;

  return (
    <div className="mt-4">
      <div className="text-sm font-medium mb-2">
        Price movement{" "}
        {saved > 0 && <span className="text-emerald-600">(−€{saved})</span>}
        {saved <= 0 && <span className="text-zinc-500">(no drop yet)</span>}
      </div>
      <div className="flex items-end gap-2 h-28">
        {steps.map((s, i) => (
          <div key={`${s.label}-${i}`} className="flex-1 flex flex-col items-center justify-end min-w-0">
            <div
              className={`w-full rounded-t ${saved > 0 && i === steps.length - 1 ? "bg-teal-800" : "bg-zinc-700"}`}
              style={{ height: `${((s.value - min) / (max - min || 1)) * 80 + 20}%` }}
              title={s.cited != null ? `Cited competing €${s.cited}` : undefined}
            />
            <div className="text-[10px] text-zinc-400 mt-1 font-medium">€{s.value}</div>
            <div className="text-[9px] text-zinc-500 text-center truncate w-full">{s.label}</div>
          </div>
        ))}
      </div>
      {steps.some(s => s.cited != null) && (
        <p className="text-[11px] text-zinc-400 mt-2">
          Leverage cited a competing quote from a prior call — never invented.
        </p>
      )}
    </div>
  );
}
