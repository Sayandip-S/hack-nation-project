import { useState } from "react";
import { useStore } from "../lib/store";
import { estimateFromInventory, inventorySummary } from "../mock/data";
import { Mic, Send } from "lucide-react";
import PhotoInventoryCapture from "../components/PhotoInventoryCapture";
import { buildPitch } from "../mock/engine";

export default function InventoryView() {
  const { jobSpec, updateJobSpec, inventoryPhotos } = useStore();
  const est = estimateFromInventory(jobSpec);
  const [utterance, setUtterance] = useState("");
  const truck =
    est.volumeM3 <= 12 ? "Small Truck" : est.volumeM3 <= 22 ? "Medium Truck" : "Large Truck";
  const pitch = buildPitch(jobSpec);

  const ingest = () => {
    const t = utterance.toLowerCase();
    if (!t.trim()) return;
    const found: { item: string; qty: number }[] = [];
    const pairs: [RegExp, string][] = [
      [/king[- ]?size bed|king bed|queen bed/, "King-size bed"],
      [/desk/, "Desk"],
      [/dining table/, "Dining table"],
      [/(\d+)\s*boxes?/, "Boxes"],
      [/sofa|couch/, "Sofa"],
      [/piano/, "Piano"],
    ];
    for (const [re, item] of pairs) {
      const m = t.match(re);
      if (m) {
        const qty = m[1] ? parseInt(m[1], 10) : item === "Desk" && /two desks/.test(t) ? 2 : 1;
        found.push({ item, qty });
      }
    }
    if (found.length) {
      const map = new Map(jobSpec.inventory.map(i => [i.item, i.qty]));
      for (const f of found) map.set(f.item, Math.max(map.get(f.item) ?? 0, f.qty));
      updateJobSpec({
        inventory: [...map.entries()].map(([item, qty]) => ({ item, qty })),
        inventorySource: inventoryPhotos.length ? "mixed" : "manual",
      });
    }
    setUtterance("");
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">Inventory</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Capture rooms with photos or camera — Corridoor AI estimates volume and briefs movers with it.
        </p>
      </div>

      <PhotoInventoryCapture />

      <div className="card p-4">
        <p className="text-sm text-zinc-400 mb-3">
          Or describe aloud: “king-size bed, two desks, sofa, piano, 30 boxes.”
        </p>
        <div className="flex gap-2">
          <button type="button" className="p-3 rounded-xl bg-primary text-white" title="Voice">
            <Mic size={16} />
          </button>
          <input
            value={utterance}
            onChange={e => setUtterance(e.target.value)}
            onKeyDown={e => e.key === "Enter" && ingest()}
            className="flex-1 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary/50"
            placeholder="Describe your inventory…"
          />
          <button type="button" onClick={ingest} className="p-3 rounded-xl border border-zinc-700">
            <Send size={16} />
          </button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Items", value: String(est.items) },
          { label: "Estimated Weight", value: `${est.weightKg} kg` },
          { label: "Estimated Volume", value: `${est.volumeM3} m³` },
          { label: "Truck Recommendation", value: truck },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <div className="text-xl font-semibold font-metric text-zinc-100">{s.value}</div>
            <div className="text-xs text-zinc-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card p-4">
        <div className="text-sm font-semibold text-zinc-100 mb-1">What movers will hear</div>
        <p className="text-xs text-zinc-400 mb-3">
          Identical pitch on every call — includes your photo survey estimate.
        </p>
        <p className="text-sm text-zinc-300 mb-3 font-metric text-xs sm:text-sm break-words">
          {inventorySummary(jobSpec)}
        </p>
        <ul className="space-y-2 text-sm text-zinc-400">
          {pitch.map((line, i) => (
            <li key={i} className="pl-3 border-l-2 border-primary/30">{line}</li>
          ))}
        </ul>
      </div>

      <div className="card p-4">
        <div className="font-semibold text-sm mb-2 text-zinc-100">Current inventory list</div>
        <ul className="grid sm:grid-cols-2 gap-1.5">
          {jobSpec.inventory.map(i => (
            <li key={i.item} className="text-sm text-zinc-400 flex gap-2">
              <span className="text-success">✓</span> {i.qty}× {i.item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
