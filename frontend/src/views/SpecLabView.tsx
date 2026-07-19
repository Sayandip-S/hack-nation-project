import { Copy, Hash, Lock, Unlock } from "lucide-react";
import { useMemo, useState } from "react";
import { vertical } from "../config/vertical";
import { inventorySummary, useStore } from "../lib/store";
import { hashJobSpec } from "../mock/data";
import { buildPitch } from "../mock/engine";

export default function SpecLabView() {
  const { jobSpec, jobSpecReady, callGuidelines, finalizeIntake, updateJobSpec } = useStore();
  const [copied, setCopied] = useState(false);

  const payload = useMemo(() => ({
    vertical: vertical.id,
    currency: vertical.currency,
    marketMedianEur: vertical.marketMedianEur,
    lowballThreshold: vertical.lowballThreshold,
    jobSpec: {
      ...jobSpec,
      inventorySummary: inventorySummary(jobSpec),
      recomputedHash: (() => {
        const { specHash: _h, ...rest } = jobSpec;
        return hashJobSpec(rest);
      })(),
    },
    callPitch: buildPitch(jobSpec, callGuidelines),
    callGuidelines,
    redFlagRules: vertical.redFlagRules,
    negotiationLevers: vertical.negotiationLevers.map(l => ({ id: l.id, label: l.label })),
    counterpartPersonas: vertical.counterpartPersonas.map(p => ({ id: p.id, label: p.label })),
  }), [callGuidelines, jobSpec]);

  const copy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-5">
      <div className="pipeline-module">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-primary font-metric">
              Config-driven vertical · {vertical.id}
            </p>
            <h2 className="text-xl sm:text-2xl font-semibold text-zinc-100 mt-1">Spec Lab</h2>
            <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
              Technical surface for the frozen JobSpec. Switching movers → auto body should mean swapping{" "}
              <span className="font-metric text-zinc-300">vertical.ts</span>, not rewriting agents.
            </p>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border ${
            jobSpecReady
              ? "bg-emerald-950/50 text-emerald-800 border-emerald-200"
              : "bg-amber-50 text-amber-800 border-amber-200"
          }`}>
            {jobSpecReady ? <Lock size={13} /> : <Unlock size={13} />}
            {jobSpecReady ? "Confirmed — dial allowed" : "Draft — dial gated"}
          </span>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-zinc-100">Canonical JobSpec</h3>
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-zinc-700 hover:border-primary/40"
            >
              <Copy size={12} /> {copied ? "Copied" : "Copy JSON"}
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-400 font-metric">
            <Hash size={12} /> {jobSpec.specHash}
          </div>
          <pre className="text-[11px] leading-relaxed bg-slate-950 text-zinc-200 rounded-xl p-4 overflow-auto max-h-[28rem] font-metric">
            {JSON.stringify(payload.jobSpec, null, 2)}
          </pre>
          {!jobSpecReady && (
            <button
              type="button"
              onClick={finalizeIntake}
              className="w-full rounded-xl bg-zinc-100 text-zinc-900 py-2.5 text-sm font-medium"
            >
              Confirm spec for outbound calls
            </button>
          )}
        </div>

        <div className="space-y-4">
          <div className="card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-zinc-100">Live pitch (verbatim across calls)</h3>
            <ol className="space-y-2 text-sm text-zinc-300 list-decimal pl-4">
              {payload.callPitch.map((line, i) => <li key={i}>{line}</li>)}
            </ol>
          </div>

          <div className="card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-zinc-100">Mutate draft fields</h3>
            <p className="text-xs text-zinc-400">Edits re-hash the brief — prove every company heard the same job.</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Field label="Origin stairs" value={jobSpec.originStairs} onChange={v => updateJobSpec({ originStairs: v })} />
              <Field label="Dest stairs" value={jobSpec.destStairs} onChange={v => updateJobSpec({ destStairs: v })} />
              <Field label="Distance (mi)" value={jobSpec.distanceMiles} onChange={v => updateJobSpec({ distanceMiles: v })} />
              <Field label="Long carry (ft)" value={jobSpec.longCarryFt} onChange={v => updateJobSpec({ longCarryFt: v })} />
            </div>
          </div>

          <div className="card p-5 space-y-2">
            <h3 className="text-sm font-semibold text-zinc-100">Vertical config snapshot</h3>
            <pre className="text-[11px] bg-zinc-800/50 rounded-xl p-3 overflow-auto max-h-48 font-metric text-zinc-300">
{JSON.stringify({
  redFlagRules: payload.redFlagRules,
  negotiationLevers: payload.negotiationLevers,
  counterpartPersonas: payload.counterpartPersonas,
}, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange,
}: {
  label: string; value: number; onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-[11px] text-zinc-500 font-metric">{label}</span>
      <input
        type="number"
        value={value}
        onChange={e => onChange(parseInt(e.target.value || "0", 10))}
        className="mt-1 w-full border border-zinc-700 rounded-xl px-3 py-2 outline-none focus:border-primary/40"
      />
    </label>
  );
}
