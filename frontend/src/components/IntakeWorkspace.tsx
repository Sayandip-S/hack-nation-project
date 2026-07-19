import { useState } from "react";
import { FileText, Mic, CheckCircle2, Upload } from "lucide-react";
import { vertical } from "../config/vertical";
import { inventorySummary, useStore } from "../lib/store";
import { buildPitch } from "../mock/engine";

export default function IntakeWorkspace({ onOpenCaller }: { onOpenCaller?: () => void }) {
  const {
    jobSpec, intakeDocs, voiceLog, voiceStep, jobSpecReady, callGuidelines,
    addDocument, advanceVoiceInterview, finalizeIntake, updateJobSpec,
  } = useStore();
  const [answer, setAnswer] = useState("");
  const voiceDone = voiceStep >= vertical.voiceInterview.length;
  const pitch = buildPitch(jobSpec, callGuidelines);
  const step = vertical.voiceInterview[voiceStep];

  const submitVoice = () => {
    if (!answer.trim() || !step) return;
    advanceVoiceInterview(answer.trim());
    setAnswer("");
  };

  return (
    <div className="space-y-4">
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5 space-y-3">
          <div className="flex items-center gap-2 font-medium text-sm">
            <Mic size={16} className="text-primary" /> Voice interview
          </div>
          <div className="max-h-56 overflow-y-auto space-y-2 bg-zinc-800/50 rounded-lg p-3">
            {!voiceLog.length && (
              <p className="text-sm text-zinc-400">Start the interview — one question at a time.</p>
            )}
            {voiceLog.map(t => (
              <div key={t.id} className={`text-sm ${t.speaker === "agent" ? "text-zinc-100" : "text-zinc-400 pl-3 border-l-2 border-primary/30"}`}>
                <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
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
                  className="flex-1 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary/40"
                  placeholder="Type your answer…"
                />
                <button type="button" onClick={submitVoice} className="px-3 py-2 rounded-lg bg-zinc-100 text-zinc-900 text-sm">
                  Send
                </button>
              </div>
              <p className="text-xs text-zinc-500">Step {voiceStep + 1} of {vertical.voiceInterview.length} · typed interview</p>
            </>
          )}
          {voiceDone && <p className="text-sm text-emerald-400">Interview complete.</p>}
        </div>

        <div className="card p-5 space-y-3">
          <div className="flex items-center gap-2 font-medium text-sm">
            <Upload size={16} className="text-primary" /> Documents
          </div>
          <p className="text-xs text-zinc-400">
            Photos, existing quotes, bills, or inventory lists — folded into the same move brief.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {vertical.documentTypes.map(d => (
              <button
                key={d.id}
                type="button"
                onClick={() => addDocument(d.id, `${d.label} upload`)}
                className="border border-zinc-700 rounded-lg px-3 py-3 text-left text-sm hover:border-primary/40 transition-colors"
              >
                <FileText size={14} className="text-zinc-500 mb-1" />
                {d.label}
              </button>
            ))}
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {intakeDocs.map(doc => (
              <div key={doc.id} className="text-xs bg-zinc-800/50 rounded-lg p-2">
                <div className="font-medium text-zinc-300">{doc.name}</div>
                <div className="text-zinc-400 mt-0.5">{doc.extractedNotes}</div>
              </div>
            ))}
            {!intakeDocs.length && <p className="text-xs text-zinc-500">No documents yet.</p>}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <div className="font-medium text-sm mb-3">Your move brief</div>
          <dl className="space-y-2.5 text-sm">
            <Row label="Route" value={`${jobSpec.originCity} → ${jobSpec.destCity}`} />
            <Row label="Stairs" value={`${jobSpec.originStairs} origin · ${jobSpec.destStairs} destination`} />
            <Row label="Distance" value={`${jobSpec.distanceMiles} miles`} />
            <Row label="Long carry" value={`${jobSpec.longCarryFt} ft`} />
            <Row label="Dates" value={`${jobSpec.dateWindow[0]} → ${jobSpec.dateWindow[1]}`} />
            <Row label="Inventory" value={inventorySummary(jobSpec)} />
          </dl>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <label>
              <span className="text-xs text-zinc-500">Origin stairs</span>
              <input
                type="number"
                value={jobSpec.originStairs}
                onChange={e => updateJobSpec({ originStairs: parseInt(e.target.value || "0", 10) })}
                className="mt-1 w-full border border-zinc-700 rounded-lg px-3 py-2 outline-none"
              />
            </label>
            <label>
              <span className="text-xs text-zinc-500">Long carry (ft)</span>
              <input
                type="number"
                value={jobSpec.longCarryFt}
                onChange={e => updateJobSpec({ longCarryFt: parseInt(e.target.value || "0", 10) })}
                className="mt-1 w-full border border-zinc-700 rounded-lg px-3 py-2 outline-none"
              />
            </label>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="font-medium text-sm">What every company will hear</div>
            {jobSpecReady
              ? <span className="pill bg-emerald-950/50 text-emerald-400"><CheckCircle2 size={12} /> Confirmed</span>
              : <span className="pill bg-amber-950/40 text-amber-300">Draft</span>}
          </div>
          <p className="text-xs text-zinc-400 mb-3">
            {jobSpecReady
              ? "Brief locked. Editing fields updates the draft for the next confirm; outbound calls use the locked pitch until you re-confirm."
              : "Confirm this pitch — Corridoor AI will reuse it word-for-word on every call."}
          </p>
          <ol className="space-y-2 text-sm text-zinc-300 list-decimal pl-4">
            {pitch.map((line, i) => <li key={i}>{line}</li>)}
          </ol>
          {jobSpecReady ? (
            <button
              type="button"
              onClick={() => onOpenCaller?.()}
              className="mt-5 w-full rounded-xl bg-primary text-white py-2.5 text-sm font-medium transition-colors"
            >
              Continue to The Caller
            </button>
          ) : (
            <button
              type="button"
              onClick={finalizeIntake}
              className="mt-5 w-full rounded-xl bg-zinc-100 text-zinc-900 py-2.5 text-sm font-medium hover:bg-zinc-200 transition-colors"
            >
              Confirm — this is what I&apos;ll tell every company
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-zinc-500 shrink-0">{label}</dt>
      <dd className="text-zinc-200 text-right">{value}</dd>
    </div>
  );
}
