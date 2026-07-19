import { useStore } from "../lib/store";
import { vertical } from "../config/vertical";
import { Phone, TrendingDown, BadgeEuro, PiggyBank, Radar, Activity } from "lucide-react";

export default function StatusStrip() {
  const { movers, wavesRunning, searching } = useStore();
  const quotes = movers.map(m => m.quote).filter((q): q is NonNullable<typeof q> => !!q && q.comparability === "valid");
  const totals = quotes.map(q => q.totalEur);
  const min = totals.length ? Math.min(...totals) : null;
  const max = totals.length ? Math.max(...totals) : null;
  const firstQuotes = movers.flatMap(m => m.calls.filter(c => c.wave === 1 && c.initialQuoteEur != null).map(c => c.initialQuoteEur!));
  const firstAvg = firstQuotes.length ? firstQuotes.reduce((a, b) => a + b, 0) / firstQuotes.length : null;
  const savings = firstAvg != null && min != null ? Math.round(firstAvg - min) : 0;
  const inProgress = movers.reduce(
    (n, m) => n + m.calls.filter(c => ["dialing", "in_progress", "negotiating"].includes(c.status)).length,
    0,
  );

  const items = [
    { icon: BadgeEuro, label: "Quotes", value: quotes.length, tone: "teal" },
    { icon: TrendingDown, label: "Price range", value: min != null && max != null ? `€${min}–${max}` : "—", tone: "sky" },
    { icon: PiggyBank, label: "Best offer", value: min != null ? `€${min}` : "—", tone: "emerald" },
    { icon: Activity, label: "Est. savings", value: savings > 0 ? `€${savings}` : "—", tone: "amber" },
    { icon: Phone, label: "Active calls", value: inProgress, tone: wavesRunning ? "amber" : "teal" },
    { icon: Radar, label: searching || wavesRunning ? "Working…" : "Market check", value: searching || wavesRunning ? "…" : `€${vertical.marketMedianEur}`, tone: searching || wavesRunning ? "amber" : "teal" },
  ];

  const toneClass: Record<string, string> = {
    teal: "text-teal-900 bg-primary/10",
    sky: "text-sky-700 bg-sky-50",
    amber: "text-amber-700 bg-amber-50",
    emerald: "text-emerald-400 bg-emerald-950/50",
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {items.map(({ icon: Icon, label, value, tone }) => (
        <div key={label} className="card p-4 hover:-translate-y-0.5 transition-transform duration-200">
          <span className={`inline-grid place-items-center w-8 h-8 rounded-lg ${toneClass[tone]}`}>
            <Icon size={16} />
          </span>
          <div className="text-xl font-semibold mt-2 tabular-nums truncate">{value}</div>
          <div className="text-xs text-zinc-400">{label}</div>
        </div>
      ))}
    </div>
  );
}
