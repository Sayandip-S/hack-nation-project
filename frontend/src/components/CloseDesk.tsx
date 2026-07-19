import { useMemo } from "react";
import { Scale, Mic2, AlertTriangle, Handshake, Trophy } from "lucide-react";
import { vertical } from "../config/vertical";
import { useStore } from "../lib/store";
import QuoteMatrix from "./QuoteMatrix";
import PriceLadder from "./PriceLadder";

export default function CloseDesk() {
  const { movers, recommendation, negotiateMover, refreshRecommendation, setPhase, jobSpec } = useStore();

  const rows = useMemo(() => {
    return movers
      .filter(m => m.calls.some(c => c.status === "completed" || c.status === "negotiating"))
      .sort((a, b) => (a.quote?.totalEur ?? 99999) - (b.quote?.totalEur ?? 99999));
  }, [movers]);

  if (!rows.length) {
    return (
      <div className="card p-8 text-center">
        <p className="text-slate-500 mb-3">No quotes yet. Run The Caller waves first so we have bids to leverage.</p>
        <button onClick={() => setPhase("calls")} className="px-4 py-2 rounded-lg bg-teal-950 text-sand text-sm">
          Go to Caller
        </button>
      </div>
    );
  }

  const featured = movers.find(m => m.id === recommendation?.moverId) ?? rows[0];

  return (
    <div className="space-y-4">
      <div className="card p-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl text-teal-950">03 · The Closer — negotiation & reporting</h2>
          <p className="text-sm text-slate-500 mt-1">
            Leverage competing bids against frozen spec {jobSpec.specHash}. Prices must move — then rank with evidence.
          </p>
        </div>
        <button
          onClick={refreshRecommendation}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-950 text-sand text-sm hover:bg-teal-900"
        >
          <Trophy size={14} /> Refresh recommendation
        </button>
      </div>

      <div className="card p-4">
        <div className="text-sm font-medium mb-2 flex items-center gap-2">
          <Scale size={14} /> Negotiation levers
        </div>
        <div className="flex flex-wrap gap-2">
          {vertical.negotiationLevers.map(l => (
            <span key={l.id} className="text-xs px-2.5 py-1 rounded-lg bg-teal-950/5 text-teal-900 border border-teal-900/10">
              {l.label}
            </span>
          ))}
        </div>
      </div>

      <QuoteMatrix />

      <div className="grid md:grid-cols-2 gap-4">
        {rows.slice(0, 4).map(m => {
          const call = [...m.calls].reverse().find(c => c.status === "completed");
          return (
            <div key={m.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium">{m.companyName}</div>
                  <div className="text-xs text-slate-400">
                    {vertical.counterpartPersonas.find(p => p.id === call?.persona)?.label}
                  </div>
                </div>
                <button
                  onClick={() => negotiateMover(m.id)}
                  disabled={m.risks.some(r => r.ruleId === "below_market")}
                  className="inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-slate-200 hover:border-teal-800/40 disabled:opacity-40"
                >
                  <Handshake size={13} /> Negotiate
                </button>
              </div>
              <PriceLadder mover={m} />
              {m.risks[0] && (
                <div className="flex items-start gap-1 text-xs text-rose-700 mt-2">
                  <AlertTriangle size={11} className="mt-0.5 shrink-0" /> {m.risks[0].explanation}
                </div>
              )}
              {call?.recordingUrl && (
                <div className="text-xs text-teal-900 mt-2 flex items-center gap-1">
                  <Mic2 size={12} /> Recording + {call.transcript.length} transcript turns
                </div>
              )}
            </div>
          );
        })}
      </div>

      {recommendation && featured && (
        <div className="card p-6 border-teal-900/20 bg-gradient-to-br from-white to-teal-50/40">
          <div className="flex items-center gap-2 text-teal-950 font-display text-xl">
            <Trophy size={20} /> Recommended deal
          </div>
          <p className="mt-3 text-slate-700 leading-relaxed">{recommendation.why}</p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <div>
              <div className="text-xs text-slate-400">Final price</div>
              <div className="text-2xl font-semibold">€{recommendation.finalPriceEur}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">Savings from first quote</div>
              <div className="text-2xl font-semibold text-emerald-700">€{recommendation.savingsEur}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400">vs median €{vertical.marketMedianEur}</div>
              <div className={`text-2xl font-semibold ${recommendation.vsMedian <= 0 ? "text-emerald-700" : "text-amber-700"}`}>
                {recommendation.vsMedian > 0 ? "+" : ""}€{recommendation.vsMedian}
              </div>
            </div>
          </div>
          <div className="mt-4">
            <div className="text-sm font-medium mb-1">Evidence (transcript / recording)</div>
            <ul className="text-sm text-slate-600 list-disc pl-5 space-y-1">
              {recommendation.evidence.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          </div>
          {!!recommendation.risksCalledOut.length && (
            <div className="mt-3 text-sm text-rose-700">
              Risks called out: {recommendation.risksCalledOut.join(" · ")}
            </div>
          )}
          <PriceLadder mover={featured} />
        </div>
      )}
    </div>
  );
}
