import { useStore } from "../lib/store";
import AgentPanel from "../components/AgentPanel";
import type { NavId } from "../lib/nav";
import { AlertTriangle, Check } from "lucide-react";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 18) return "Good Afternoon";
  return "Good Evening";
}

function daysUntil(iso: string) {
  const target = new Date(iso + "T12:00:00").getTime();
  const now = Date.now();
  return Math.max(0, Math.ceil((target - now) / 86400000));
}

export default function MissionControl({ onNavigate }: { onNavigate: (id: NavId) => void }) {
  const { user, jobSpec, movers, wavesRunning, recommendation, perf } = useStore();
  const firstName = user?.name?.split(" ")[0] ?? "there";
  const days = daysUntil(jobSpec.dateWindow[0]);
  const quotes = movers.filter(m => m.quote?.comparability === "valid").length;
  const callsDone = movers.reduce((n, m) => n + m.calls.filter(c => c.status === "completed").length, 0);

  let progress = 28;
  if (quotes >= 1) progress = 42;
  if (quotes >= 3) progress = 55;
  if (recommendation) progress = 72;
  if (wavesRunning) progress = Math.max(progress, 42);

  const priorities = [
    { label: "Compare Quotes", done: quotes >= 2, warn: false, nav: "companies" as NavId },
    { label: "Confirm Moving Company", done: !!recommendation, warn: false, nav: "companies" as NavId },
    { label: "Book Parking Permit", done: false, warn: true, nav: "timeline" as NavId },
    { label: "Finish Kitchen Packing", done: false, warn: true, nav: "inventory" as NavId },
  ];

  const activity = [
    callsDone > 0 || perf.callsMade > 0
      ? `Called ${Math.max(callsDone, perf.callsMade, 5)} movers`
      : "Called 5 movers",
    quotes > 0 ? `Received ${quotes} quotations` : "Received 3 quotations",
    "Found cheaper insurance",
    "Scheduled internet installation",
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 tracking-tight">
          {greeting()}, {firstName}
        </h1>
        <p className="mt-1 text-slate-500">
          Your move to {jobSpec.destCity} is{" "}
          <span className="font-medium text-slate-800 font-metric">{days}</span> days away.
        </p>
      </div>

      <div className="card p-5 sm:p-6">
        <div className="flex items-end justify-between gap-4 mb-3">
          <div className="text-sm text-slate-500">Move progress</div>
          <div className="text-2xl font-semibold font-metric text-primary">{progress}%</div>
        </div>
        <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-400 font-metric">
          {jobSpec.originCity} → {jobSpec.destCity} · {jobSpec.dateWindow[0]}
        </p>
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Today&apos;s Priorities</h2>
        <ul className="space-y-2">
          {priorities.map(p => (
            <li key={p.label}>
              <button
                type="button"
                onClick={() => onNavigate(p.nav)}
                className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-slate-50 transition-colors"
              >
                {p.done ? (
                  <Check size={18} className="text-success shrink-0" />
                ) : p.warn ? (
                  <AlertTriangle size={18} className="text-warning shrink-0" />
                ) : (
                  <span className="w-[18px] h-[18px] rounded border border-slate-300 shrink-0" />
                )}
                <span className={`text-sm ${p.done ? "text-slate-400 line-through" : "text-slate-800"}`}>
                  {p.label}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      {/* AI Command Center — ~40% visual weight */}
      <div className="min-h-[280px] sm:min-h-[320px]">
        <AgentPanel onNavigate={onNavigate} variant="command" />
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">Recent AI Activity</h2>
        <ul className="space-y-2.5">
          {activity.map(a => (
            <li key={a} className="flex items-start gap-2.5 text-sm text-slate-700">
              <Check size={16} className="text-success shrink-0 mt-0.5" />
              {a}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
