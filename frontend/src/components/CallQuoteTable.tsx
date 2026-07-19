import { useMemo, useState } from "react";
import { ArrowDownUp, Sparkles } from "lucide-react";
import { useStore } from "../lib/store";
import { moverScore } from "../mock/data";
import { vertical } from "../config/vertical";
import type { Mover } from "../types";

type SortMode = "priority" | "price" | "newest";

function latestCallAt(m: Mover): number {
  if (!m.calls.length) return 0;
  // Prefer highest wave / most recently completed as "newest"
  return m.calls.reduce((best, c) => {
    const stamp = c.wave * 1_000_000 + (c.durationSec ?? 0) + (c.status === "completed" ? 100 : 0);
    return Math.max(best, stamp);
  }, 0);
}

function displayQuote(m: Mover): number | null {
  if (m.quote?.comparability === "valid") return m.quote.totalEur;
  const completed = [...m.calls].reverse().find(c => c.finalQuoteEur != null || c.quotedTotalEur != null);
  return completed?.finalQuoteEur ?? completed?.quotedTotalEur ?? null;
}

function personaLabel(m: Mover): string {
  const call = [...m.calls].reverse().find(c => c.persona);
  if (!call) return "—";
  return vertical.counterpartPersonas.find(p => p.id === call.persona)?.label ?? call.persona;
}

export default function CallQuoteTable() {
  const { movers, recommendation } = useStore();
  const [sort, setSort] = useState<SortMode>("priority");

  const rows = useMemo(() => {
    const called = movers.filter(m => m.calls.length > 0);
    const priorityId = recommendation?.moverId;

    const sorted = [...called].sort((a, b) => {
      if (sort === "price") {
        const pa = displayQuote(a) ?? Number.POSITIVE_INFINITY;
        const pb = displayQuote(b) ?? Number.POSITIVE_INFINITY;
        if (pa !== pb) return pa - pb;
        return a.companyName.localeCompare(b.companyName);
      }
      if (sort === "newest") {
        return latestCallAt(b) - latestCallAt(a);
      }
      // priority: recommended first, then AI score, then price
      const aPri = a.id === priorityId ? 1 : 0;
      const bPri = b.id === priorityId ? 1 : 0;
      if (aPri !== bPri) return bPri - aPri;
      const sa = moverScore(a) ?? -1;
      const sb = moverScore(b) ?? -1;
      if (sa !== sb) return sb - sa;
      const pa = displayQuote(a) ?? Number.POSITIVE_INFINITY;
      const pb = displayQuote(b) ?? Number.POSITIVE_INFINITY;
      return pa - pb;
    });

    return sorted.map((m, index) => {
      const quote = displayQuote(m);
      const last = [...m.calls].reverse()[0];
      const initial = last?.initialQuoteEur;
      const final = last?.finalQuoteEur ?? quote;
      const isPriority = m.id === priorityId || (!priorityId && sort === "priority" && index === 0 && quote != null);
      return { mover: m, quote, last, initial, final, isPriority };
    });
  }, [movers, recommendation, sort]);

  const sorts: { id: SortMode; label: string }[] = [
    { id: "priority", label: "Priority" },
    { id: "price", label: "Price · low to high" },
    { id: "newest", label: "Newest" },
  ];

  return (
    <div className="card overflow-hidden">
      <div className="px-4 sm:px-5 py-4 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">Calls & quotes</h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Everyone contacted for this move — filter by priority, price, or recency.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ArrowDownUp size={14} className="text-zinc-500 shrink-0" />
          <div className="flex rounded-xl border border-zinc-700 p-0.5 bg-zinc-800/50">
            {sorts.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSort(s.id)}
                className={`px-2.5 sm:px-3 py-1.5 text-xs rounded-[10px] transition-colors ${
                  sort === s.id ? "bg-zinc-900 text-zinc-100 shadow-sm font-medium" : "text-zinc-400 hover:text-zinc-300"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-zinc-400">
          No calls yet. Open The Caller to gather quotes.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-zinc-500 border-b border-zinc-800">
                <th className="px-4 sm:px-5 py-3 font-medium">Company</th>
                <th className="px-3 py-3 font-medium">Contact</th>
                <th className="px-3 py-3 font-medium">Style</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium text-right">Quote</th>
                <th className="px-3 py-3 font-medium text-right">Change</th>
                <th className="px-4 sm:px-5 py-3 font-medium text-right">Calls</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ mover, quote, last, initial, final, isPriority }) => {
                const dropped =
                  initial != null && final != null && final < initial
                    ? initial - final
                    : null;
                return (
                  <tr
                    key={mover.id}
                    className={`border-b border-zinc-800 last:border-0 transition-colors ${
                      isPriority
                        ? "bg-primary/[0.06] ring-1 ring-inset ring-primary/15"
                        : "hover:bg-zinc-800/50"
                    }`}
                  >
                    <td className="px-4 sm:px-5 py-3.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-zinc-100 truncate">{mover.companyName}</span>
                            {isPriority && (
                              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded-md bg-primary/10 text-primary">
                                <Sparkles size={10} /> Priority
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-500 mt-0.5">
                            {mover.rating.toFixed(1)} ★ · {mover.reviewCount} reviews
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-zinc-400 whitespace-nowrap font-metric text-xs">
                      {mover.phone || "—"}
                    </td>
                    <td className="px-3 py-3.5 text-zinc-400 whitespace-nowrap">
                      {personaLabel(mover)}
                    </td>
                    <td className="px-3 py-3.5">
                      <span className={`text-xs px-2 py-0.5 rounded-md capitalize ${
                        last?.status === "completed"
                          ? "bg-emerald-950/50 text-emerald-400"
                          : last?.status === "negotiating" || last?.status === "in_progress"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-zinc-800 text-zinc-400"
                      }`}>
                        {(last?.status ?? mover.status).replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-3 py-3.5 text-right font-semibold text-zinc-100 font-metric whitespace-nowrap">
                      {quote != null ? `€${quote}` : "—"}
                    </td>
                    <td className="px-3 py-3.5 text-right whitespace-nowrap text-xs font-metric">
                      {dropped != null ? (
                        <span className="text-emerald-400">−€{dropped}</span>
                      ) : initial != null && final != null && initial === final ? (
                        <span className="text-zinc-500">—</span>
                      ) : (
                        <span className="text-zinc-500">—</span>
                      )}
                    </td>
                    <td className="px-4 sm:px-5 py-3.5 text-right text-zinc-400 font-metric">
                      {mover.calls.length}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
