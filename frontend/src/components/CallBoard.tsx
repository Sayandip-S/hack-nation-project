import { Phone, FileAudio2 } from "lucide-react";
import { vertical } from "../config/vertical";
import { buildPitch } from "../mock/engine";
import { useStore } from "../lib/store";

const statusColor: Record<string, string> = {
  queued: "text-zinc-500", dialing: "text-sky-600", in_progress: "text-amber-600",
  negotiating: "text-amber-700",
  completed: "text-emerald-600", declined: "text-rose-600", failed: "text-rose-600",
};

export default function CallBoard({ onOpenEstimator }: { onOpenEstimator?: () => void }) {
  const { movers, runWaves, jobSpec, jobSpecReady, callGuidelines, wavesRunning } = useStore();
  const calls = movers.flatMap(m => m.calls.map(c => ({ call: c, mover: m })));
  const pitch = buildPitch(jobSpec, callGuidelines);

  const photoNote = jobSpec.photoSurveyCount
    ? `Photo survey: ${jobSpec.photoSurveyCount} room image${jobSpec.photoSurveyCount === 1 ? "" : "s"} included in the pitch`
    : "Tip: add room photos in The Estimator so movers hear a volume estimate";

  if (!jobSpecReady) {
    return (
      <div className="card p-8 text-center">
        <p className="text-zinc-400 mb-3">Lock the job spec (and photo inventory) before calling movers.</p>
        <button
          type="button"
          onClick={() => onOpenEstimator?.()}
          className="px-4 py-2 rounded-xl bg-primary text-white text-sm"
        >
          Confirm JobSpec in Estimator
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="text-lg font-semibold text-zinc-100 mb-1">Calling movers</div>
        <div className="text-sm text-zinc-400 mb-1">Same move details on every call</div>
        <p className="text-xs text-primary mb-2">{photoNote}</p>
        <ol className="text-xs text-zinc-400 list-decimal pl-4 space-y-1">
          {pitch.map((line, i) => <li key={i}>{line}</li>)}
        </ol>
        <div className="mt-3 flex flex-wrap gap-2">
          {vertical.counterpartPersonas.map(p => (
            <span key={p.id} className="text-[11px] px-2 py-1 rounded-md bg-zinc-800/50 border border-zinc-800 text-zinc-400">
              {p.label}: {p.style}
            </span>
          ))}
        </div>
        <p className="text-[11px] text-zinc-500 mt-2">
          Call list from {movers.map(m => m.source).filter(Boolean).join(" · ") || "Places / Yelp-style directory"}
        </p>
      </div>

      {!calls.length ? (
        <div className="card p-8 text-center">
          <p className="text-zinc-400 mb-3">
            No calls yet. Wave 1 discovers quotes; wave 2 cites the best valid number and prices drop.
          </p>
          <button
            onClick={runWaves}
            disabled={wavesRunning}
            className="px-4 py-2 rounded-lg bg-teal-950 text-sand text-sm disabled:opacity-50"
          >
            {wavesRunning ? "Waves running…" : "Get quotes (run waves)"}
          </button>
        </div>
      ) : (
        <>
          <div className="flex justify-end">
            <button
              onClick={runWaves}
              disabled={wavesRunning}
              className="px-3 py-1.5 rounded-lg border border-zinc-700 text-sm hover:border-teal-800/40 disabled:opacity-50"
            >
              {wavesRunning ? "Waves running…" : "Re-run quote waves"}
            </button>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {calls.map(({ call, mover }) => (
              <div key={call.id} className="card p-4">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm">{mover.companyName}</div>
                  <div className={`flex items-center gap-1 text-xs ${statusColor[call.status]}`}>
                    <Phone size={12} /> W{call.wave} · {call.status.replace("_", " ")}
                  </div>
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  {vertical.counterpartPersonas.find(p => p.id === call.persona)?.label ?? call.persona}
                  {call.citedQuoteEur != null && ` · citing €${call.citedQuoteEur}`}
                </div>

                <div className="mt-3 max-h-40 overflow-y-auto space-y-1.5">
                  {call.transcript.map(t => (
                    <div key={t.id} className={`text-xs ${t.speaker === "agent" ? "text-zinc-300" : "text-zinc-400"}`}>
                      <span className="font-medium">{t.speaker === "agent" ? "Agent" : "Dispatcher"}:</span> {t.text}
                      {t.priceDeltaEur != null && t.priceDeltaEur !== 0 && (
                        <span className="ml-1 text-emerald-400 font-medium">({t.priceDeltaEur}€)</span>
                      )}
                    </div>
                  ))}
                </div>

                {!!call.quoteLines?.length && (
                  <div className="mt-3 pt-2 border-t border-zinc-800">
                    <div className="text-xs font-medium text-zinc-400 mb-1">Itemised quote</div>
                    <ul className="text-xs space-y-0.5">
                      {call.quoteLines.map(q => (
                        <li key={q.id} className="flex justify-between gap-2">
                          <span>{q.label}{q.note ? ` · ${q.note}` : ""}</span>
                          <span className="font-medium">€{q.amountEur}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {call.status === "completed" && (
                  <div className="mt-3 pt-2 border-t border-zinc-800 text-xs flex items-center justify-between gap-2">
                    <div>
                      <span className="text-zinc-400">€{call.initialQuoteEur}</span>
                      {call.finalQuoteEur != null && call.finalQuoteEur < (call.initialQuoteEur ?? 0) && (
                        <span className="text-emerald-400 font-medium"> → €{call.finalQuoteEur}</span>
                      )}
                      <span className="text-zinc-500"> · {call.terminalOutcome}</span>
                    </div>
                    {call.recordingUrl && (
                      <span className="inline-flex items-center gap-1 text-teal-900">
                        <FileAudio2 size={12} /> Rec
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
