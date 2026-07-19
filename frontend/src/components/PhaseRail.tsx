import { vertical } from "../config/vertical";
import { useStore } from "../lib/store";
import type { PhaseId } from "../types";

export default function PhaseRail({
  onSelect,
}: {
  onSelect?: (id: PhaseId) => void;
}) {
  const { phase, setPhase, jobSpecReady, movers } = useStore();
  const callsDone = movers.some(m => m.calls.some(c => c.status === "completed"));

  return (
    <div className="card p-3 sm:p-4">
      <div className="flex flex-col md:flex-row gap-2 md:gap-3 md:items-stretch">
        {vertical.phases.map((p, i) => {
          const active = phase === p.id;
          const locked =
            (p.id === "calls" && !jobSpecReady) ||
            (p.id === "close" && !callsDone);
          return (
            <div key={p.id} className="flex-1 relative">
              {i > 0 && (
                <div className="hidden md:block absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-px bg-zinc-700" />
              )}
              <button
                type="button"
                disabled={locked}
                onClick={() => {
                  setPhase(p.id as PhaseId);
                  onSelect?.(p.id as PhaseId);
                }}
                className={`relative z-10 w-full text-left rounded-xl px-3.5 py-3 border transition-all ${
                  active
                    ? "bg-zinc-100 text-zinc-900 border-zinc-100 shadow-sm"
                    : locked
                      ? "border-zinc-800 text-zinc-600 cursor-not-allowed bg-zinc-800/50"
                      : "border-zinc-700 hover:border-primary/40 bg-zinc-900"
                }`}
              >
                <div className={`text-[10px] uppercase tracking-[0.14em] font-metric ${active ? "text-white/60" : "text-zinc-500"}`}>
                  Phase {String(i + 1).padStart(2, "0")}
                </div>
                <div className="font-semibold text-base leading-tight mt-0.5">{p.title}</div>
                <p className={`text-xs mt-1 leading-snug ${active ? "text-white/75" : "text-zinc-400"}`}>
                  {p.blurb}
                </p>
                {locked && (
                  <p className="text-[10px] mt-2 font-metric text-zinc-600">
                    {p.id === "calls" ? "Confirm JobSpec first" : "Need completed calls"}
                  </p>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
