import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../lib/store";
import { defaultJobSpec, hashJobSpec } from "../mock/data";
import { JobSpec } from "../types";
import { inventorySummary } from "../lib/store";

type Step = {
  key: keyof JobSpec | "inventoryRooms";
  q: string;
  type: "number" | "text";
};

const steps: Step[] = [
  { key: "originCity", q: "Where are you moving from? (city)", type: "text" },
  { key: "originStairs", q: "How many flights of stairs at the origin?", type: "number" },
  { key: "destCity", q: "Where are you moving to? (city)", type: "text" },
  { key: "destStairs", q: "How many flights of stairs at the destination?", type: "number" },
  { key: "distanceMiles", q: "Roughly how many miles / km is the move? (e.g. 363 for Munich→Berlin)", type: "number" },
  { key: "longCarryFt", q: "Long carry from truck to door (feet)?", type: "number" },
  { key: "inventoryRooms", q: "Inventory — e.g. king bed, two desks, sofa, piano, 30 boxes", type: "text" },
  { key: "dateWindow", q: "Date window? (YYYY-MM-DD to YYYY-MM-DD)", type: "text" },
];

export default function Onboarding() {
  const { completeOnboarding } = useStore();
  const nav = useNavigate();
  const [i, setI] = useState(0);
  const [spec, setSpec] = useState<JobSpec>(defaultJobSpec);
  const [val, setVal] = useState("");
  const [confirm, setConfirm] = useState(false);
  const step = steps[i];

  const next = () => {
    let updated = { ...spec };
    if (step.key === "inventoryRooms") {
      // keep default inventory; optionally note
      updated = { ...updated, notes: val || updated.notes };
    } else if (step.key === "dateWindow") {
      const parts = (val || `${spec.dateWindow[0]} to ${spec.dateWindow[1]}`)
        .split(/\s+to\s+|\s*[-–]\s*/i).map(s => s.trim());
      updated = { ...updated, dateWindow: [parts[0], parts[1] || parts[0]] };
    } else if (step.type === "number") {
      const n = parseInt(val || "0", 10) || (spec[step.key as keyof JobSpec] as number);
      updated = { ...updated, [step.key]: n };
    } else {
      updated = { ...updated, [step.key]: val || spec[step.key as keyof JobSpec] };
    }
    const { specHash: _, ...rest } = updated;
    updated = { ...updated, specHash: hashJobSpec(rest) };
    setSpec(updated);
    setVal("");
    if (i + 1 < steps.length) setI(i + 1);
    else setConfirm(true);
  };

  const lockIn = () => {
    completeOnboarding(spec);
    nav("/");
  };

  if (confirm) {
    return (
      <div className="welcome-stage min-h-screen flex items-center justify-center p-6">
        <div className="card p-8 w-full max-w-lg relative z-10">
          <p className="text-primary text-sm font-medium mb-1">atlas.ai · Confirm job spec</p>
          <h1 className="text-xl font-medium mb-2">This is exactly what I&apos;ll tell every company</h1>
          <p className="text-xs text-zinc-400 mb-4">
            Review your brief, then open the dashboard. You can start calling from The Caller when ready.
          </p>
          <ul className="text-sm space-y-2 text-zinc-300 mb-6">
            <li><strong>Route:</strong> {spec.originCity} ({spec.originStairs} fl) → {spec.destCity} ({spec.destStairs} fl)</li>
            <li><strong>Distance:</strong> {spec.distanceMiles} mi · long carry {spec.longCarryFt} ft</li>
            <li><strong>Inventory:</strong> {inventorySummary(spec)}</li>
            <li><strong>Dates:</strong> {spec.dateWindow[0]} → {spec.dateWindow[1]}</li>
            <li><strong>Services:</strong> {spec.services.join(", ")}</li>
          </ul>
          <button onClick={lockIn} className="w-full bg-teal-950 text-sand rounded-lg py-2.5 text-sm font-medium">
            Confirm — freeze spec & open dashboard
          </button>
          <button onClick={() => { setConfirm(false); setI(0); }} className="w-full mt-2 text-sm text-zinc-400">
            Edit answers
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="welcome-stage min-h-screen flex items-center justify-center p-6">
      <div className="card p-8 w-full max-w-lg relative z-10">
        <p className="text-primary text-sm font-medium mb-1">atlas.ai · Job Spec</p>
        <div className="text-xs text-zinc-500 mb-2">Step {i + 1} of {steps.length}</div>
        <h1 className="text-xl font-medium mb-5">{step.q}</h1>
        <input
          autoFocus
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => e.key === "Enter" && next()}
          type={step.type === "number" ? "number" : "text"}
          className="w-full border border-zinc-700 rounded-lg px-4 py-2.5 outline-none focus:border-zinc-500"
        />
        <button onClick={next} className="mt-6 w-full bg-teal-950 text-sand rounded-lg py-2.5 text-sm">
          {i + 1 < steps.length ? "Next" : "Review job spec"}
        </button>
      </div>
    </div>
  );
}
