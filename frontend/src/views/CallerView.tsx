import BackToHome from "../components/BackToHome";
import CallBoard from "../components/CallBoard";
import ConversationContract from "../components/ConversationContract";
import StatusStrip from "../components/StatusStrip";
import { vertical } from "../config/vertical";
import { useStore } from "../lib/store";

export default function CallerView({
  onBack,
  onOpenEstimator,
}: {
  onBack: () => void;
  onOpenEstimator: () => void;
}) {
  const { movers, wavesRunning, jobSpecReady } = useStore();
  const styles = new Set(movers.flatMap(m => m.calls.map(c => c.persona))).size;
  const quotes = movers.filter(m => m.quote?.comparability === "valid").length;

  return (
    <div className="space-y-5">
      <BackToHome onBack={onBack} />
      <div className="pipeline-module">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-primary font-medium">Agent 02</p>
            <h2 className="text-xl sm:text-2xl font-semibold text-zinc-100 mt-1">The Caller</h2>
            <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
              Phones movers with your confirmed brief, handles pushback, and collects itemised quotes
              you can actually compare.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {vertical.counterpartPersonas.map(p => (
              <span
                key={p.id}
                className="text-[11px] px-2.5 py-1 rounded-lg border border-zinc-700 bg-zinc-800/50 text-zinc-400"
                title={p.style}
              >
                {p.label}
              </span>
            ))}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat label="Brief ready" value={jobSpecReady ? "Yes" : "No"} ok={jobSpecReady} />
          <Stat label="Styles reached" value={`${styles}`} ok={styles >= 3} />
          <Stat label="Quotes" value={String(quotes)} ok={quotes >= 3} />
          <Stat label="Status" value={wavesRunning ? "Calling" : "Idle"} ok={jobSpecReady} pulse={wavesRunning} />
        </div>
      </div>

      <StatusStrip />

      {!jobSpecReady && (
        <div className="card p-5 flex flex-wrap items-center justify-between gap-3 border-amber-800 bg-amber-950/30">
          <div>
            <p className="text-sm font-semibold text-amber-200">Confirm your move brief first</p>
            <p className="text-xs text-amber-200/70 mt-0.5">
              Calls stay locked until you approve what every company will hear.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenEstimator}
            className="px-4 py-2 rounded-xl bg-zinc-100 text-zinc-900 text-sm"
          >
            Open Estimator
          </button>
        </div>
      )}

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
        <CallBoard onOpenEstimator={onOpenEstimator} />
        <ConversationContract />
      </div>
    </div>
  );
}

function Stat({
  label, value, ok, pulse,
}: {
  label: string; value: string; ok: boolean; pulse?: boolean;
}) {
  return (
    <div className={`rounded-xl border px-3 py-2 ${ok ? "border-primary/25 bg-primary/15" : "border-zinc-700 bg-zinc-900"}`}>
      <div className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</div>
      <div className={`text-sm font-semibold mt-0.5 flex items-center gap-1.5 ${ok ? "text-primary" : "text-zinc-300"}`}>
        {pulse && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />}
        {value}
      </div>
    </div>
  );
}
