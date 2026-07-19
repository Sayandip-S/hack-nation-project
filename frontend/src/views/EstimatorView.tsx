import BackToHome from "../components/BackToHome";
import IntakeWorkspace from "../components/IntakeWorkspace";
import PhotoInventoryCapture from "../components/PhotoInventoryCapture";
import { vertical } from "../config/vertical";
import { useStore } from "../lib/store";

export default function EstimatorView({
  onBack,
  onOpenCaller,
}: {
  onBack: () => void;
  onOpenCaller: () => void;
}) {
  const { jobSpecReady, intakeDocs, voiceStep } = useStore();
  const interviewDone = voiceStep >= vertical.voiceInterview.length;

  return (
    <div className="space-y-5">
      <BackToHome onBack={onBack} />
      <div className="pipeline-module">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-primary font-medium">Agent 01</p>
            <h2 className="text-xl sm:text-2xl font-semibold text-zinc-100 mt-1">The Estimator</h2>
            <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
              Capture your move through a short interview, uploaded documents, or room photos.
              Confirm the brief before Corridoor AI calls anyone.
            </p>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-lg border ${
            jobSpecReady
              ? "bg-emerald-950/50 text-emerald-400 border-emerald-800"
              : "bg-amber-950/40 text-amber-300 border-amber-800"
          }`}>
            {jobSpecReady ? "Brief confirmed" : "Confirmation needed"}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Stat
            label="Interview"
            value={interviewDone ? "Done" : `Step ${Math.min(voiceStep + 1, vertical.voiceInterview.length)}`}
            ok={interviewDone}
          />
          <Stat label="Documents" value={String(intakeDocs.length)} ok={intakeDocs.length > 0} />
          <Stat label="Calls unlocked" value={jobSpecReady ? "Yes" : "No"} ok={jobSpecReady} />
        </div>
      </div>

      <IntakeWorkspace onOpenCaller={onOpenCaller} />

      <div className="card p-5 space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">Room photos</h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Upload or photograph rooms so movers hear a realistic inventory on every call.
          </p>
        </div>
        <PhotoInventoryCapture />
      </div>
    </div>
  );
}

function Stat({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className={`rounded-xl border px-3 py-2 ${ok ? "border-emerald-800 bg-emerald-950/40" : "border-zinc-700 bg-zinc-900"}`}>
      <div className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</div>
      <div className={`text-sm font-semibold mt-0.5 ${ok ? "text-emerald-400" : "text-zinc-300"}`}>{value}</div>
    </div>
  );
}
