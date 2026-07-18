import { X, AlertTriangle } from "lucide-react";
import { useStore } from "../lib/store";
import FactRow from "./FactRow";
import { RiskBadge } from "./RiskBadge";
import PriceLadder from "./PriceLadder";
import { moverEtaHours, moverScore } from "../mock/data";

export default function QuoteDrawer({ moverId, onClose }: { moverId: string; onClose: () => void }) {
  const { movers, negotiateMover, recommendation } = useStore();
  const m = movers.find(x => x.id === moverId);
  if (!m) return null;
  const call = [...m.calls].reverse().find(c => c.status === "completed");
  const score = moverScore(m);
  const isPick = recommendation?.moverId === m.id;

  const extras = [
    { label: "Insurance", value: m.risks.some(r => /insur/i.test(r.explanation)) ? "Limited / exclusions" : "Included" },
    { label: "Packing", value: m.quote?.lineItems.some(l => /pack/i.test(l.label)) ? "Available / quoted" : "Ask on call" },
    { label: "Dismantling furniture", value: "On request" },
    { label: "Elevator support", value: "Included if booked" },
    { label: "Cancellation", value: "Free 48h (typical)" },
    { label: "ETA", value: m.quote ? `${moverEtaHours(m)} hours` : "—" },
  ];

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/20" onClick={onClose}>
      <div className="w-full max-w-md bg-white h-full overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">{m.companyName}</h2>
            <p className="text-sm text-slate-500">{m.phone} · ★ {m.rating}</p>
          </div>
          <button type="button" onClick={onClose}><X size={20} className="text-slate-400" /></button>
        </div>

        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {m.risks[0] && <RiskBadge label={m.risks[0].severity} />}
          {score != null && <span className="text-xs px-2 py-0.5 rounded-md bg-teal-950 text-sand">Score {score}</span>}
          {isPick && <span className="text-xs px-2 py-0.5 rounded-md bg-[rgba(212,224,92,0.45)] text-teal-950">AI recommendation</span>}
        </div>

        {isPick && recommendation && (
          <p className="mt-4 text-sm bg-teal-950/5 rounded-lg p-3 text-teal-950">{recommendation.why}</p>
        )}

        {m.quote && (
          <p className="mt-3 text-sm bg-slate-50 rounded-lg p-3">{m.quote.rationale}</p>
        )}

        <div className="grid grid-cols-2 gap-3 mt-4 text-sm">
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-xs text-slate-400">Price</div>
            <div className="font-semibold text-xl">€{m.quote?.totalEur ?? "—"}</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-xs text-slate-400">Reviews</div>
            <div className="font-semibold text-xl">{m.reviewCount}</div>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <div className="text-sm font-medium">Coverage & policies</div>
          {extras.map(e => (
            <div key={e.label} className="flex justify-between text-sm border-b border-slate-50 py-1.5">
              <span className="text-slate-500">{e.label}</span>
              <span className="font-medium text-right max-w-[55%]">{e.value}</span>
            </div>
          ))}
        </div>

        <PriceLadder mover={m} />

        {m.risks.length > 0 && (
          <div className="mt-4">
            <div className="text-sm font-medium mb-2">Flags</div>
            {m.risks.map(r => (
              <div key={r.id} className="flex items-start gap-2 text-sm text-rose-700 bg-rose-50 rounded-lg p-2 mb-1">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />{r.explanation}
              </div>
            ))}
          </div>
        )}

        <div className="mt-4">
          <div className="text-sm font-medium mb-1">Structured extraction</div>
          {m.facts.length
            ? m.facts.map(f => <FactRow key={f.id} fact={f} />)
            : <p className="text-sm text-slate-400">Run a call wave to extract fees from the transcript.</p>}
        </div>

        {call?.summary && (
          <div className="mt-4">
            <div className="text-sm font-medium mb-1">Call summary</div>
            <p className="text-sm text-slate-600">{call.summary}</p>
          </div>
        )}

        {m.quote && (
          <button
            type="button"
            onClick={() => negotiateMover(m.id)}
            className="mt-6 w-full rounded-xl bg-teal-950 text-sand py-3 text-sm font-medium hover:bg-teal-900"
          >
            Negotiate this quote
          </button>
        )}
      </div>
    </div>
  );
}
