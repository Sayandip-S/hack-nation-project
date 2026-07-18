import { useState } from "react";
import { FileText, Mic, CheckCircle2, Upload } from "lucide-react";
import { vertical } from "../config/vertical";
import { inventorySummary, useStore } from "../lib/store";
import { buildPitch } from "../mock/engine";

export default function IntakeWorkspace() {
  const {
    jobSpec, intakeDocs, voiceLog, voiceStep, jobSpecReady,
    addDocument, advanceVoiceInterview, finalizeIntake, updateJobSpec,
  } = useStore();
  const [answer, setAnswer] = useState("");
  const voiceDone = voiceStep >= vertical.voiceInterview.length;
  const pitch = buildPitch(jobSpec);
  const step = vertical.voiceInterview[voiceStep];

  const submitVoice = () => {
    if (!answer.trim() || !step) return;
    advanceVoiceInterview(answer.trim());
    setAnswer("");
  };

  const specJson = {
    specHash: jobSpec.specHash,
    origin: { city: jobSpec.originCity, stairs: jobSpec.originStairs },
    destination: { city: jobSpec.destCity, stairs: jobSpec.destStairs },
    distanceMiles: jobSpec.distanceMiles,
    longCarryFt: jobSpec.longCarryFt,
    inventory: jobSpec.inventory,
    dateWindow: jobSpec.dateWindow,
    services: jobSpec.services,
  };

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl text-teal-950">01 · The Estimator — {vertical.jobNoun}</h2>
            <p className="text-sm text-slate-500 mt-1">
              Voice interview (ElevenLabs-ready) and documents produce the same structured JSON job spec.
              Confirm it before any calls — that is how quotes stay comparable.
            </p>
          </div>
          {jobSpecReady
            ? <span className="pill bg-emerald-50 text-emerald-700"><CheckCircle2 size={12} /> Spec locked</span>
            : <span className="pill bg-amber-50 text-amber-700">Awaiting confirmation</span>}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5 space-y-3">
          <div className="flex items-center gap-2 font-medium text-sm">
            <Mic size={16} className="text-teal-900" /> Voice interview · ElevenLabs Agents
          </div>
          <div className="max-h-56 overflow-y-auto space-y-2 bg-slate-50 rounded-lg p-3">
            {!voiceLog.length && (
              <p className="text-sm text-slate-500">Start the interview — one estimator question at a time.</p>
            )}
            {voiceLog.map(t => (
              <div key={t.id} className={`text-sm ${t.speaker === "agent" ? "text-teal-950" : "text-slate-600 pl-3 border-l-2 border-[#d4e05c]"}`}>
                <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  {t.speaker === "agent" ? "Agent" : "You"} ·{" "}
                </span>
                {t.text}
              </div>
            ))}
          </div>
          {!voiceDone && step && (
            <>
              <p className="text-sm font-medium">{step.q}</p>
              <div className="flex gap-2">
                <input
                  value={answer}
                  onChange={e => setAnswer(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && submitVoice()}
                  className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-800/40"
                  placeholder="Speak or type your answer…"
                />
                <button onClick={submitVoice} className="px-3 py-2 rounded-lg bg-teal-950 text-sand text-sm">Send</button>
              </div>
              <p className="text-xs text-slate-400">Step {voiceStep + 1} of {vertical.voiceInterview.length}</p>
            </>
          )}
          {voiceDone && <p className="text-sm text-emerald-700">Voice intake complete.</p>}
        </div>

        <div className="card p-5 space-y-3">
          <div className="flex items-center gap-2 font-medium text-sm">
            <Upload size={16} className="text-teal-900" /> Documents
          </div>
          <p className="text-xs text-slate-500">Photos, existing quotes, bills, inventory — parsed into the same JSON spec.</p>
          <div className="grid grid-cols-2 gap-2">
            {vertical.documentTypes.map(d => (
              <button
                key={d.id}
                type="button"
                onClick={() => addDocument(d.id, `${d.label} upload`)}
                className="border border-slate-200 rounded-lg px-3 py-3 text-left text-sm hover:border-teal-800/40 transition-colors"
              >
                <FileText size={14} className="text-slate-400 mb-1" />
                {d.label}
              </button>
            ))}
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {intakeDocs.map(doc => (
              <div key={doc.id} className="text-xs bg-slate-50 rounded-lg p-2">
                <div className="font-medium text-slate-700">{doc.name}</div>
                <div className="text-slate-500 mt-0.5">{doc.extractedNotes}</div>
              </div>
            ))}
            {!intakeDocs.length && <p className="text-xs text-slate-400">No documents yet.</p>}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="font-medium text-sm mb-2">Structured job spec (JSON)</div>
          <pre className="text-[11px] bg-slate-50 rounded-lg p-3 overflow-auto max-h-64 text-slate-700">
            {JSON.stringify(specJson, null, 2)}
          </pre>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <label>
              <span className="text-xs text-slate-400">Origin stairs</span>
              <input type="number" value={jobSpec.originStairs}
                onChange={e => updateJobSpec({ originStairs: parseInt(e.target.value || "0", 10) })}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 outline-none" />
            </label>
            <label>
              <span className="text-xs text-slate-400">Long carry (ft)</span>
              <input type="number" value={jobSpec.longCarryFt}
                onChange={e => updateJobSpec({ longCarryFt: parseInt(e.target.value || "0", 10) })}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 outline-none" />
            </label>
          </div>
          <p className="text-xs text-slate-500 mt-2">Inventory: {inventorySummary(jobSpec)}</p>
        </div>

        <div className="card p-5">
          <div className="font-medium text-sm mb-2">Identical call pitch (preview)</div>
          <p className="text-xs text-slate-500 mb-3">
            Confirm — this is exactly what I&apos;ll tell every company. Hash: <span className="font-mono">{jobSpec.specHash}</span>
          </p>
          <ol className="space-y-2 text-sm text-slate-700 list-decimal pl-4">
            {pitch.map((line, i) => <li key={i}>{line}</li>)}
          </ol>
          <button
            onClick={finalizeIntake}
            className="mt-5 w-full rounded-lg bg-teal-950 text-sand py-2.5 text-sm font-medium hover:bg-teal-900 transition-colors"
          >
            Confirm — this is exactly what I&apos;ll tell every company
          </button>
        </div>
      </div>
    </div>
  );
}
