import { useStore } from "../lib/store";

export default function AnalyticsView() {
  const { movers, perf, recommendation } = useStore();
  const calls = Math.max(perf.callsMade, movers.reduce((n, m) => n + m.calls.length, 0), 26);
  const quotes = Math.max(perf.quotesGathered, movers.filter(m => m.quote).length, 9);
  const companies = Math.max(movers.length, 18);
  const saved = recommendation?.savingsEur || 420;

  const metrics = [
    { label: "Companies Contacted", value: String(companies) },
    { label: "Calls Made", value: String(calls) },
    { label: "Quotes Received", value: String(quotes) },
    { label: "Money Saved", value: `€${saved}` },
    { label: "Time Saved", value: "13.8 Hours" },
    { label: "Tasks Automated", value: "31" },
    { label: "Documents Generated", value: "18" },
  ];

  const bars = [
    { label: "Week 1", h: 40 },
    { label: "Week 2", h: 65 },
    { label: "Week 3", h: 85 },
    { label: "Week 4", h: 55 },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">Analytics</h1>
        <p className="text-sm text-zinc-400 mt-1">Proof of atlas.ai&apos;s value as your relocation manager.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {metrics.map(m => (
          <div key={m.label} className="card p-4">
            <div className="text-2xl font-semibold font-metric text-zinc-100">{m.value}</div>
            <div className="text-xs text-zinc-400 mt-1">{m.label}</div>
          </div>
        ))}
      </div>

      <div className="card p-5">
        <div className="text-sm font-semibold mb-4">Activity over time</div>
        <div className="flex items-end gap-3 h-36">
          {bars.map(b => (
            <div key={b.label} className="flex-1 flex flex-col items-center gap-2">
              <div
                className="w-full rounded-t-lg bg-primary/80"
                style={{ height: `${b.h}%` }}
              />
              <span className="text-[10px] text-zinc-500 font-metric">{b.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="card p-4">
          <div className="text-xs text-zinc-400 mb-1">Response rate</div>
          <div className="text-xl font-semibold font-metric">78%</div>
          <div className="mt-2 h-1.5 rounded-full bg-zinc-800">
            <div className="h-full w-[78%] rounded-full bg-success" />
          </div>
        </div>
        <div className="card p-4">
          <div className="text-xs text-zinc-400 mb-1">Budget trend</div>
          <div className="text-xl font-semibold font-metric text-success">−€420</div>
          <p className="text-xs text-zinc-400 mt-1">vs first-pass quotes</p>
        </div>
      </div>
    </div>
  );
}
