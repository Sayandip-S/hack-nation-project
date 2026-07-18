import { vertical } from "../config/vertical";
import { useStore } from "../lib/store";
import type { PhaseId } from "../types";

export default function PhaseRail() {
  const { phase, setPhase, jobSpecReady, movers } = useStore();
  const callsDone = movers.some(m => m.calls.some(c => c.status === "completed"));

  return (
    <div className="card p-4">
      <div className="flex flex-col md:flex-row gap-3 md:gap-0 md:items-stretch">
        {vertical.phases.map((p, i) => {
          const active = phase === p.id;
          const locked =
            (p.id === "calls" && !jobSpecReady) ||
            (p.id === "close" && !callsDone);
          return (
            <div key={p.id} className="flex-1 flex md:flex-col gap-3 md:gap-2 relative">
              {i > 0 && <div className="hidden md:block absolute left-0 top-5 -translate-x-1/2 w-full h-px bg-slate-200 -z-0" />}
              <button
                type="button"
                disabled={locked}
                onClick={() => setPhase(p.id as PhaseId)}
                className={`relative z-10 text-left rounded-xl px-3 py-3 border transition-all ${
                  active
                    ? "bg-teal-950 text-sand border-teal-950"
                    : locked
                      ? "border-slate-100 text-slate-300 cursor-not-allowed"
                      : "border-slate-200 hover:border-teal-800/40 bg-white"
                }`}
              >
                <div className="text-[11px] uppercase tracking-wider opacity-70">Phase {i + 1}</div>
                <div className="font-display text-lg leading-tight">{p.title}</div>
                <p className={`text-xs mt-1 ${active ? "text-sand/80" : "text-slate-500"}`}>{p.blurb}</p>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
