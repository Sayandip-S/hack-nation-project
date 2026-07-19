import {
  CheckCircle2, ClipboardList, Download, ListTree, MessageSquareText, Sparkles,
} from "lucide-react";
import { useMemo } from "react";
import { useAgentConversation } from "../lib/agentConversation";
import { useStore } from "../lib/store";
import { vertical } from "../config/vertical";

function fmtTime(ts: number) {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SummaryView() {
  const {
    messages, transcriptArchive, guidelines, metrics, intentLog, achievements, sessionActive,
  } = useAgentConversation();
  const transcript = transcriptArchive.length ? transcriptArchive : messages;
  const { jobSpec, jobSpecReady, movers, recommendation } = useStore();

  const learned = guidelines.filter(g => g.source === "learned");
  const quotes = movers.filter(m => m.quote?.comparability === "valid").length;

  const narrative = useMemo(() => {
    const parts: string[] = [];
    if (metrics.sessionsStarted === 0 && transcript.length === 0) {
      return "No conversation yet. Start on Home — Corridoor AI will greet you and learn from what you say.";
    }
    parts.push(
      `You ran ${metrics.sessionsStarted} session${metrics.sessionsStarted === 1 ? "" : "s"} ` +
      `(${metrics.voiceSessions} voice) with ${metrics.userTurns} user turns and ${metrics.agentTurns} agent replies.`,
    );
    if (achievements.length) {
      parts.push(`Achieved: ${achievements.map(a => a.title).join("; ")}.`);
    }
    if (learned.length) {
      parts.push(`${learned.length} behavioural guideline${learned.length === 1 ? "" : "s"} learned from chat.`);
    }
    if (jobSpecReady) {
      parts.push(`Move brief confirmed for ${jobSpec.originCity} → ${jobSpec.destCity}.`);
    } else {
      parts.push(`Move context: ${jobSpec.originCity} → ${jobSpec.destCity} (brief not confirmed yet).`);
    }
    if (quotes) parts.push(`${quotes} comparable quote${quotes === 1 ? "" : "s"} on file.`);
    if (recommendation) parts.push(`Closer leading pick: ${recommendation.title}.`);
    return parts.join(" ");
  }, [
    achievements, jobSpec.destCity, jobSpec.originCity, jobSpecReady,
    learned.length, transcript.length, metrics, quotes, recommendation,
  ]);

  const exportPayload = useMemo(() => ({
    exportedAt: new Date().toISOString(),
    vertical: vertical.name,
    summary: narrative,
    achievements,
    talkMetrics: metrics,
    learnedGuidelines: learned,
    allGuidelines: guidelines,
    intentLog,
    transcript,
    move: {
      origin: jobSpec.originCity,
      destination: jobSpec.destCity,
      dateWindow: jobSpec.dateWindow,
      briefConfirmed: jobSpecReady,
      quotesCollected: quotes,
      recommendation: recommendation?.title ?? null,
    },
    sessionActive,
  }), [
    achievements, guidelines, intentLog, jobSpec, jobSpecReady, learned,
    transcript, metrics, narrative, quotes, recommendation, sessionActive,
  ]);

  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `corridoor-conversation-summary-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="pipeline-module flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-primary font-medium">Recap</p>
          <h2 className="text-xl sm:text-2xl font-semibold text-zinc-100 mt-1">Conversation summary</h2>
          <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
            Everything achieved in chat — guidelines learned, intents, full transcript, and move context.
          </p>
        </div>
        <button
          type="button"
          onClick={downloadJson}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm font-medium text-zinc-300 hover:border-primary/40 shrink-0"
        >
          <Download size={15} />
          Export data
        </button>
      </div>

      <div className="card p-5">
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
            <Sparkles size={17} />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">What was achieved</h3>
            <p className="text-sm text-zinc-400 mt-1.5 leading-relaxed">{narrative}</p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-zinc-100 mb-2.5">Achievements</h3>
        {achievements.length === 0 ? (
          <div className="card p-6 text-sm text-zinc-400 text-center">
            Talk on Home to unlock achievements (e.g. “I’m looking for a moving company”).
          </div>
        ) : (
          <ul className="space-y-2">
            {achievements.map(a => (
              <li key={a.id} className="card px-4 py-3.5 flex gap-3">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-100">{a.title}</p>
                  <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{a.detail}</p>
                  <p className="text-[10px] text-zinc-500 mt-1">{fmtTime(a.at)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {[
          { label: "User turns", value: metrics.userTurns },
          { label: "Agent turns", value: metrics.agentTurns },
          { label: "Intents", value: metrics.intentsDetected },
          { label: "Guidelines learned", value: learned.length },
          { label: "Voice sessions", value: metrics.voiceSessions },
          { label: "Listening", value: `${metrics.listeningSeconds}s` },
          { label: "Quotes on file", value: quotes },
          { label: "Brief", value: jobSpecReady ? "Confirmed" : "Open" },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <div className="text-xl font-semibold tabular-nums text-zinc-100">{s.value}</div>
            <div className="text-xs text-zinc-400 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-zinc-800 flex items-center gap-2">
          <ListTree size={15} className="text-zinc-500" />
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">Intent log</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Every detected user intent and agent reply</p>
          </div>
        </div>
        {intentLog.length === 0 ? (
          <p className="px-5 py-8 text-sm text-zinc-400 text-center">No intents logged yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-800 max-h-72 overflow-y-auto">
            {[...intentLog].reverse().map(ev => (
              <li key={ev.id} className="px-4 sm:px-5 py-3.5">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="text-[10px] uppercase tracking-wide font-medium px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400">
                    {ev.intent.replace(/_/g, " ")}
                  </span>
                  <span className="text-[10px] text-zinc-500">{fmtTime(ev.at)}</span>
                  {ev.guidelineId && (
                    <span className="text-[10px] text-primary">guideline updated</span>
                  )}
                </div>
                <p className="text-sm text-zinc-200"><span className="text-zinc-500">You · </span>{ev.userText}</p>
                <p className="text-sm text-zinc-400 mt-1"><span className="text-zinc-500">Corridoor AI · </span>{ev.agentReply}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-zinc-800 flex items-center gap-2">
          <ClipboardList size={15} className="text-zinc-500" />
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">Learned guidelines</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Rules written from this conversation</p>
          </div>
        </div>
        {learned.length === 0 ? (
          <p className="px-5 py-8 text-sm text-zinc-400 text-center">No learned guidelines yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-800">
            {learned.map(g => (
              <li key={g.id} className="px-4 sm:px-5 py-3.5">
                <p className="text-sm font-medium text-zinc-100">{g.title}</p>
                <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{g.text}</p>
                {g.updatedAt > 0 && (
                  <p className="text-[10px] text-zinc-500 mt-1">{fmtTime(g.updatedAt)}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-zinc-800 flex items-center gap-2">
          <MessageSquareText size={15} className="text-zinc-500" />
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">Full transcript</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              {transcript.length} message{transcript.length === 1 ? "" : "s"} across sessions
              {metrics.lastSessionAt ? ` · last session ${fmtTime(metrics.lastSessionAt)}` : ""}
            </p>
          </div>
        </div>
        {transcript.length === 0 ? (
          <p className="px-5 py-8 text-sm text-zinc-400 text-center">Transcript is empty.</p>
        ) : (
          <ul className="divide-y divide-zinc-800 max-h-96 overflow-y-auto">
            {transcript.map(m => (
              <li key={m.id} className="px-4 sm:px-5 py-3 text-sm">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] uppercase tracking-wide text-zinc-500 font-medium">
                    {m.role === "user" ? "You" : "Corridoor AI"}
                  </span>
                  <span className="text-[10px] text-zinc-600">{fmtTime(m.at)}</span>
                </div>
                <p className="text-zinc-200 whitespace-pre-wrap">{m.text}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold text-zinc-100 mb-2">Move context snapshot</h3>
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div className="flex justify-between gap-3 border-b border-zinc-800 py-1.5">
            <dt className="text-zinc-400">Route</dt>
            <dd className="text-zinc-100 font-medium text-right">{jobSpec.originCity} → {jobSpec.destCity}</dd>
          </div>
          <div className="flex justify-between gap-3 border-b border-zinc-800 py-1.5">
            <dt className="text-zinc-400">Dates</dt>
            <dd className="text-zinc-100 font-medium text-right">
              {jobSpec.dateWindow[0]} – {jobSpec.dateWindow[1]}
            </dd>
          </div>
          <div className="flex justify-between gap-3 border-b border-zinc-800 py-1.5">
            <dt className="text-zinc-400">Brief</dt>
            <dd className="text-zinc-100 font-medium text-right">{jobSpecReady ? "Confirmed" : "Not confirmed"}</dd>
          </div>
          <div className="flex justify-between gap-3 border-b border-zinc-800 py-1.5">
            <dt className="text-zinc-400">Quotes</dt>
            <dd className="text-zinc-100 font-medium text-right">{quotes}</dd>
          </div>
          <div className="flex justify-between gap-3 border-b border-zinc-800 py-1.5 sm:col-span-2">
            <dt className="text-zinc-400">Recommendation</dt>
            <dd className="text-zinc-100 font-medium text-right">{recommendation?.title ?? "—"}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
