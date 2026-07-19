import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { useStore } from "../lib/store";

const CATS = [
  "Contracts",
  "Invoices",
  "Insurance",
  "Receipts",
  "Photos",
  "Inventory Export",
  "Moving Checklist",
  "Call Transcripts",
];

export default function DocumentsView() {
  const { intakeDocs, movers } = useStore();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | null>(null);

  const docs = useMemo(() => {
    const base = [
      ...intakeDocs.map(d => ({ name: d.name, cat: "Photos", note: d.extractedNotes })),
      { name: "MoveFast draft contract.pdf", cat: "Contracts", note: "Pending signature" },
      { name: "Household insurance binder.pdf", cat: "Insurance", note: "Coverage confirmed" },
      { name: "Box retailer receipt.pdf", cat: "Receipts", note: "€110" },
      { name: "Inventory export.csv", cat: "Inventory Export", note: "126 items" },
      { name: "Packing checklist.md", cat: "Moving Checklist", note: "72% complete" },
      ...movers.flatMap(m =>
        m.calls.filter(c => c.status === "completed").map(c => ({
          name: `${m.companyName} — wave ${c.wave} transcript`,
          cat: "Call Transcripts",
          note: c.summary ?? "Completed call",
        })),
      ),
    ];
    return base.filter(d => {
      if (cat && d.cat !== cat) return false;
      if (!q) return true;
      const s = q.toLowerCase();
      return d.name.toLowerCase().includes(s) || d.note.toLowerCase().includes(s) || d.cat.toLowerCase().includes(s);
    });
  }, [intakeDocs, movers, q, cat]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Documents</h1>
        <p className="text-sm text-slate-500 mt-1">Everything related to this move — searchable.</p>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search contracts, invoices, transcripts…"
          className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none focus:border-primary/50 bg-white"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCat(null)}
          className={`text-xs px-3 py-1.5 rounded-full border ${!cat ? "bg-primary text-white border-primary" : "border-slate-200 text-slate-600"}`}
        >
          All
        </button>
        {CATS.map(c => (
          <button
            key={c}
            type="button"
            onClick={() => setCat(c)}
            className={`text-xs px-3 py-1.5 rounded-full border ${cat === c ? "bg-primary text-white border-primary" : "border-slate-200 text-slate-600"}`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="card divide-y divide-slate-100">
        {docs.map(d => (
          <div key={d.name + d.cat} className="px-4 py-3 flex justify-between gap-3">
            <div>
              <div className="text-sm font-medium text-slate-900">{d.name}</div>
              <div className="text-xs text-slate-500 mt-0.5">{d.note}</div>
            </div>
            <span className="text-[10px] uppercase tracking-wide text-slate-400 shrink-0">{d.cat}</span>
          </div>
        ))}
        {!docs.length && <p className="p-4 text-sm text-slate-400">No documents match.</p>}
      </div>
    </div>
  );
}
