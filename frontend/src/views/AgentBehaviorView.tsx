import {
  Activity, ArrowRight, Bot, ClipboardList, Clock3, MessageSquareText,
  Mic2, PhoneCall, Scale, Sparkles, Wand2,
} from "lucide-react";
import { useAgentConversation } from "../lib/agentConversation";
import { vertical } from "../config/vertical";
import type { NavId } from "../lib/nav";
import { useStore } from "../lib/store";

export default function AgentBehaviorView({ onNavigate }: { onNavigate: (id: NavId) => void }) {
  const { guidelines, metrics, messages, sessionActive } = useAgentConversation();
  const {
    jobSpecReady, movers, wavesRunning, recommendation, phase, setPhase,
  } = useStore();

  const quotes = movers.filter(m => m.quote?.comparability === "valid").length;
  const styles = new Set(movers.flatMap(m => m.calls.map(c => c.persona))).size;

  const modules = [
    {
      id: "estimator" as NavId,
      phase: "intake" as const,
      title: "The Estimator",
      icon: ClipboardList,
      blurb: "Capture your move by interview, documents, or room photos — then confirm before any calls.",
      ready: jobSpecReady,
      meta: jobSpecReady ? "Brief confirmed" : "Needs your confirmation",
    },
    {
      id: "caller" as NavId,
      phase: "calls" as const,
      title: "The Caller",
      icon: PhoneCall,
      blurb: "Calls movers with the same details every time and collects comparable, itemised quotes.",
      ready: jobSpecReady && quotes >= 3 && styles >= 3,
      meta: !jobSpecReady
        ? "Confirm brief first"
        : wavesRunning
          ? "Calling now…"
          : quotes
            ? `${quotes} quotes gathered`
            : "Brief ready · start waves",
    },
    {
      id: "closer" as NavId,
      phase: "close" as const,
      title: "The Closer",
      icon: Scale,
      blurb: "Negotiates with real leverage, flags risky lowballs, and recommends a deal with evidence.",
      ready: !!recommendation,
      meta: recommendation
        ? `Leading pick · ${recommendation.title}`
        : quotes
          ? "Quotes ready to negotiate"
          : "Waiting on quotes",
    },
  ];

  const talkStats = [
    { icon: Mic2, label: "Voice sessions", value: metrics.voiceSessions },
    { icon: MessageSquareText, label: "User turns", value: metrics.userTurns },
    { icon: Bot, label: "Agent turns", value: metrics.agentTurns },
    { icon: Clock3, label: "Listening time", value: `${metrics.listeningSeconds}s` },
    { icon: Activity, label: "Intents detected", value: metrics.intentsDetected },
    { icon: Wand2, label: "Guideline updates", value: metrics.guidelineUpdates },
    { icon: Sparkles, label: "Sessions started", value: metrics.sessionsStarted },
    { icon: MessageSquareText, label: "Avg user message", value: `${metrics.avgUserChars} chars` },
  ];

  return (
    <div className="space-y-5">
      <div className="pipeline-module">
        <p className="text-[11px] uppercase tracking-[0.14em] text-primary font-medium">Agent lab</p>
        <h2 className="text-xl sm:text-2xl font-semibold text-zinc-100 mt-1">Behavior & talk metrics</h2>
        <p className="text-sm text-zinc-400 mt-1 max-w-2xl">
          Pipeline agents, guidelines synced into the call pitch, and conversation telemetry.
          {sessionActive ? " Chat is active on Home." : ""}
        </p>
      </div>

      <div>
        <div className="flex items-baseline justify-between gap-2 mb-2.5">
          <h3 className="text-sm font-semibold text-zinc-100">Your agents</h3>
          <p className="text-xs text-zinc-500">Estimator · Caller · Closer</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {modules.map(m => {
            const Icon = m.icon;
            const active = phase === m.phase;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setPhase(m.phase);
                  onNavigate(m.id);
                }}
                className={`module-card module-card-compact text-left ${active ? "module-card-active" : ""}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="w-8 h-8 rounded-lg bg-zinc-100 text-zinc-900 grid place-items-center shrink-0">
                    <Icon size={15} />
                  </span>
                  <span className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded ${
                    m.ready ? "bg-emerald-950/50 text-emerald-400" : "bg-zinc-800 text-zinc-400"
                  }`}>
                    {m.ready ? "ready" : "open"}
                  </span>
                </div>
                <h3 className="text-base font-semibold text-zinc-100 leading-tight mt-2.5">{m.title}</h3>
                <p className="text-xs text-zinc-400 mt-1 leading-snug line-clamp-2">{m.blurb}</p>
                <p className="text-[11px] text-zinc-400 mt-2 truncate">{m.meta}</p>
                <span className="inline-flex items-center gap-1 text-xs text-primary mt-2 font-medium">
                  Open <ArrowRight size={11} />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-zinc-100 mb-2.5">Talk metrics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {talkStats.map(({ icon: Icon, label, value }) => (
            <div key={label} className="card p-4">
              <span className="inline-grid place-items-center w-8 h-8 rounded-lg bg-zinc-800/50 text-zinc-400">
                <Icon size={15} />
              </span>
              <div className="text-xl font-semibold mt-2 tabular-nums text-zinc-100">{value}</div>
              <div className="text-xs text-zinc-400 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-zinc-800 flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">Current behavioral guidelines</h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Defaults plus rules learned from your conversation · {vertical.name}
            </p>
          </div>
        </div>
        <ul className="divide-y divide-zinc-800">
          {guidelines.map(g => (
            <li key={g.id} className="px-4 sm:px-5 py-3.5 flex gap-3">
              <span className={`mt-0.5 text-[10px] uppercase tracking-wide font-medium px-1.5 py-0.5 rounded h-fit ${
                g.source === "learned"
                  ? "bg-primary/10 text-primary"
                  : "bg-zinc-800 text-zinc-400"
              }`}>
                {g.source === "learned" ? "learned" : "default"}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-100">{g.title}</p>
                <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{g.text}</p>
                {g.updatedAt > 0 && (
                  <p className="text-[10px] text-zinc-500 mt-1">
                    Updated {new Date(g.updatedAt).toLocaleTimeString()}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-zinc-800">
          <h3 className="text-sm font-semibold text-zinc-100">Latest conversation</h3>
          <p className="text-xs text-zinc-400 mt-0.5">Transcript from your most recent Home session</p>
        </div>
        {messages.length === 0 ? (
          <p className="px-5 py-8 text-sm text-zinc-400 text-center">
            No conversation yet. On Home, tap the mic and say “I’m looking for a moving company.”
          </p>
        ) : (
          <ul className="divide-y divide-zinc-800 max-h-80 overflow-y-auto">
            {messages.map(m => (
              <li key={m.id} className="px-4 sm:px-5 py-3 text-sm">
                <span className="text-[10px] uppercase tracking-wide text-zinc-500 font-medium">
                  {m.role === "user" ? "You" : "Corridoor AI"}
                </span>
                <p className="text-zinc-200 mt-0.5">{m.text}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
