import { costBreakdown } from "../mock/data";
import { useStore } from "../lib/store";

const LIMIT = 1800;

export default function BudgetView() {
  const { movers, recommendation } = useStore();
  const live = recommendation ? movers.find(m => m.id === recommendation.moverId) : null;
  const rows = costBreakdown.map(r =>
    r.label === "Moving Company" && live?.quote ? { ...r, amountEur: live.quote.totalEur } : r,
  );
  const current = rows.reduce((n, r) => n + r.amountEur, 0);
  const estimated = Math.round(current * 1.18);
  const pct = Math.min(100, Math.round((current / LIMIT) * 100));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">Budget</h1>
        <p className="text-sm text-zinc-400 mt-1">Supervise spend — atlas.ai flags where you can cut.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        {[
          { label: "Current", value: `€${current}` },
          { label: "Estimated Final", value: `€${estimated}` },
          { label: "Budget Limit", value: `€${LIMIT}` },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <div className="text-xs text-zinc-400">{s.label}</div>
            <div className="text-2xl font-semibold font-metric text-zinc-100 mt-1">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-zinc-400">Spend vs limit</span>
          <span className="font-metric text-zinc-300">{pct}%</span>
        </div>
        <div className="h-2.5 rounded-full bg-zinc-800 overflow-hidden">
          <div
            className={`h-full rounded-full ${pct > 90 ? "bg-danger" : pct > 70 ? "bg-warning" : "bg-primary"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-800 text-sm font-semibold">Expenses</div>
        <ul className="divide-y divide-zinc-800">
          {rows.map(r => (
            <li key={r.label} className="flex justify-between px-4 py-3 text-sm">
              <span className="text-zinc-400">{r.label}</span>
              <span className="font-metric font-medium">€{r.amountEur}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="card p-4 text-sm text-zinc-300 leading-relaxed border-l-4 border-primary">
        <span className="font-semibold text-primary">AI insight: </span>
        You can save about €180 by confirming MoveFast and buying boxes locally instead of through the mover.
      </div>
    </div>
  );
}
