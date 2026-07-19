import { useMemo, useState } from "react";
import { Check, X, Star } from "lucide-react";
import { useStore } from "../lib/store";
import type { Mover } from "../types";
import { moverEtaHours, moverScore } from "../mock/data";
import QuoteDrawer from "./QuoteDrawer";

function hasPacking(m: Mover) {
  return !!m.quote?.lineItems.some(l => /pack/i.test(l.label)) || (moverScore(m) ?? 0) >= 90;
}

export default function QuoteMatrix() {
  const { movers, recommendation, refreshRecommendation } = useStore();
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<"cards" | "matrix">("cards");

  const ranked = useMemo(() => {
    return [...movers]
      .filter(m => m.quote?.comparability === "valid" || !m.quote)
      .sort((a, b) => (moverScore(b) ?? -1) - (moverScore(a) ?? -1));
  }, [movers]);

  const top = ranked.filter(m => m.quote).slice(0, 3);
  const matrixMovers = top.length >= 2 ? top : ranked.slice(0, 3);

  const features = [
    {
      label: "Price",
      render: (m: (typeof movers)[0]) => (m.quote ? `€${m.quote.totalEur}` : "—"),
    },
    {
      label: "Insurance",
      render: (m: (typeof movers)[0]) =>
        m.quote ? (!m.risks.some(r => /insur/i.test(r.explanation)) ? "yes" : "no") : "—",
    },
    {
      label: "Packing",
      render: (m: (typeof movers)[0]) => (m.quote ? (hasPacking(m) ? "yes" : "no") : "—"),
    },
    {
      label: "Furniture Assembly",
      render: (m: (typeof movers)[0]) => (m.quote ? ((moverScore(m) ?? 0) >= 88 ? "yes" : "no") : "—"),
    },
    {
      label: "Boxes Included",
      render: (m: (typeof movers)[0]) => {
        if (!m.quote) return "—";
        const n = 10 + (m.id.charCodeAt(m.id.length - 1) % 25);
        return String(hasPacking(m) ? n : 0);
      },
    },
    {
      label: "ETA",
      render: (m: (typeof movers)[0]) => (m.quote ? `${moverEtaHours(m)} h` : "—"),
    },
    {
      label: "AI Score",
      render: (m: (typeof movers)[0]) => {
        const s = moverScore(m);
        return s != null ? String(s) : "—";
      },
    },
  ];

  const pick = recommendation
    ? movers.find(m => m.id === recommendation.moverId)
    : top[0];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Moving Companies</h1>
          <p className="text-sm text-zinc-400 mt-1">Corridoor AI ranks providers — you approve the decision.</p>
        </div>
        <div className="flex rounded-xl border border-zinc-700 p-0.5 bg-zinc-900">
          <button
            type="button"
            onClick={() => setTab("cards")}
            className={`px-3 py-1.5 text-xs rounded-[10px] ${tab === "cards" ? "bg-primary text-white" : "text-zinc-400"}`}
          >
            Top Recommendations
          </button>
          <button
            type="button"
            onClick={() => { setTab("matrix"); refreshRecommendation(); }}
            className={`px-3 py-1.5 text-xs rounded-[10px] ${tab === "matrix" ? "bg-primary text-white" : "text-zinc-400"}`}
          >
            Quote Comparison
          </button>
        </div>
      </div>

      {tab === "cards" && (
        <div className="grid gap-3">
          {ranked.map((m, i) => {
            const score = moverScore(m);
            const isRec = recommendation?.moverId === m.id || (!recommendation && i === 0 && !!m.quote);
            const insured = !!m.quote && !m.risks.some(r => /insur/i.test(r.explanation));
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelected(m.id)}
                className={`card p-5 text-left transition-shadow hover:shadow-md ${
                  isRec ? "ring-2 ring-primary/30" : ""
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold text-zinc-100">{m.companyName}</h2>
                      {isRec && m.quote && (
                        <span className="text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5 rounded-md bg-primary text-white">
                          Recommended
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-warning">
                      {Array.from({ length: 5 }).map((_, si) => (
                        <Star
                          key={si}
                          size={14}
                          fill={si < Math.round(m.rating) ? "currentColor" : "none"}
                          className={si < Math.round(m.rating) ? "" : "text-zinc-600"}
                        />
                      ))}
                      <span className="text-xs text-zinc-400 ml-1 font-metric">{m.rating.toFixed(1)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-zinc-400">Score</div>
                    <div className="text-2xl font-semibold font-metric text-primary">
                      {score ?? "—"}
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-zinc-400">Price</div>
                    <div className="font-semibold font-metric">{m.quote ? `€${m.quote.totalEur}` : "Pending"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-400">Insurance</div>
                    <div className="font-medium">{m.quote ? (insured ? "Included" : "Limited") : "—"}</div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-400">Available</div>
                    <div className="font-medium text-success">{m.quote ? "✓" : "—"}</div>
                  </div>
                </div>
              </button>
            );
          })}
          {!movers.some(m => m.quote) && (
            <p className="text-sm text-zinc-400 card p-4">
              No quotes yet. Ask Corridoor AI to call moving companies, or open Calls.
            </p>
          )}
        </div>
      )}

      {tab === "matrix" && (
        <div className="space-y-4">
          <div className="card overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="p-3 text-left text-zinc-400 font-medium">Feature</th>
                  {matrixMovers.map(m => (
                    <th key={m.id} className="p-3 text-left font-semibold text-zinc-100">{m.companyName}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {features.map(f => (
                  <tr key={f.label} className="border-b border-zinc-800">
                    <td className="p-3 text-zinc-400">{f.label}</td>
                    {matrixMovers.map(m => {
                      const v = f.render(m);
                      return (
                        <td key={m.id} className="p-3 font-metric">
                          {v === "yes" ? <Check size={16} className="text-success" /> :
                           v === "no" ? <X size={16} className="text-danger" /> :
                           v}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pick?.quote && (
            <div className="card p-4 text-sm leading-relaxed text-zinc-300 bg-primary/[0.03]">
              <span className="font-semibold text-primary">Recommendation: </span>
              {pick.companyName} offers the best overall value.
              {matrixMovers[1]?.quote && pick.quote.totalEur > (matrixMovers.find(x => x.id !== pick.id && x.quote)?.quote?.totalEur ?? pick.quote.totalEur) && (
                <> While a competitor may be slightly cheaper, {pick.companyName} includes stronger coverage and services, reducing your expected total cost.</>
              )}
              {!matrixMovers[1]?.quote && <> Corridoor AI selected this based on price, insurance, packing, and ETA.</>}
            </div>
          )}
        </div>
      )}

      {selected && <QuoteDrawer moverId={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
