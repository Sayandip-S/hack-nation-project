import BackToHome from "../components/BackToHome";
import CallQuoteTable from "../components/CallQuoteTable";
import CloseDesk from "../components/CloseDesk";
import { useStore } from "../lib/store";

export default function CloserView({
  onBack,
  onOpenCaller,
}: {
  onBack: () => void;
  onOpenCaller: () => void;
}) {
  const { movers, recommendation } = useStore();
  const completed = movers.flatMap(m => m.calls).filter(c => c.status === "completed").length;
  const priceMoved = movers.some(m =>
    m.calls.some(c =>
      c.initialQuoteEur != null
      && c.finalQuoteEur != null
      && c.finalQuoteEur < c.initialQuoteEur,
    ),
  );
  const redFlags = movers.reduce((n, m) => n + m.risks.length, 0);

  return (
    <div className="space-y-5">
      <BackToHome onBack={onBack} />
      <div className="pipeline-module">
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-primary font-medium">Agent 03</p>
          <h2 className="text-xl sm:text-2xl font-semibold text-zinc-100 mt-1">The Closer</h2>
          <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
            Uses competing quotes as leverage, questions fees, and recommends a deal you can trust —
            with transcripts and recordings to back it up.
          </p>
        </div>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat label="Calls done" value={String(completed)} ok={completed >= 3} />
          <Stat label="Price improved" value={priceMoved ? "Yes" : "Not yet"} ok={priceMoved} />
          <Stat label="Risk flags" value={String(redFlags)} ok={redFlags === 0 && completed > 0} />
          <Stat label="Recommendation" value={recommendation ? "Ready" : "Pending"} ok={!!recommendation} />
        </div>
      </div>

      {!completed && (
        <div className="card p-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-zinc-100">Need quotes before negotiating</p>
            <p className="text-xs text-zinc-400 mt-0.5">
              Run The Caller first so there are real numbers to leverage.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenCaller}
            className="px-4 py-2 rounded-xl bg-zinc-100 text-zinc-900 text-sm"
          >
            Open Caller
          </button>
        </div>
      )}

      {recommendation && (
        <div className="card p-5 border-primary/30 bg-gradient-to-br from-zinc-900 via-zinc-900 to-blue-950/40">
          <p className="text-[11px] uppercase tracking-[0.12em] text-primary font-medium">Recommended deal</p>
          <h3 className="text-lg font-semibold text-zinc-100 mt-1">{recommendation.title}</h3>
          <p className="text-sm text-zinc-400 mt-2">{recommendation.why}</p>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-400">
            <span>Final €{recommendation.finalPriceEur}</span>
            <span>Saved €{recommendation.savingsEur}</span>
          </div>
        </div>
      )}

      <CallQuoteTable />

      <CloseDesk onOpenCaller={onOpenCaller} />
    </div>
  );
}

function Stat({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className={`rounded-xl border px-3 py-2 ${ok ? "border-emerald-800 bg-emerald-950/40" : "border-zinc-700 bg-zinc-900"}`}>
      <div className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</div>
      <div className={`text-sm font-semibold mt-0.5 ${ok ? "text-emerald-400" : "text-zinc-300"}`}>{value}</div>
    </div>
  );
}
