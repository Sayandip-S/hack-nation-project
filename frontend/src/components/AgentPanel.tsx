import { useState } from "react";
import { useStore } from "../lib/store";
import { Mic, Keyboard, Send, Loader2 } from "lucide-react";
import type { NavId } from "../lib/nav";

type Mode = "voice" | "chat";
type Variant = "command" | "hero" | "card";

const SUGGESTIONS = [
  "Plan my move",
  "Call moving companies",
  "Compare quotes",
  "Find storage",
  "Scan my rooms with photos",
  "Track inventory",
  "Build packing checklist",
];

export default function AgentPanel({
  onNavigate,
  variant = "card",
}: {
  onNavigate?: (id: NavId) => void;
  variant?: Variant;
}) {
  const {
    user, runWaves, runMarketSearch, finalizeIntake,
    jobSpecReady, refreshRecommendation, setAgentProfile, searching, wavesRunning,
  } = useStore();
  const firstName = user?.name?.split(" ")[0] ?? "there";
  const [mode, setMode] = useState<Mode>("chat");
  const [text, setText] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "atlas"; text: string }[]>([]);
  const [liveCards, setLiveCards] = useState<string[]>([]);
  const [listening, setListening] = useState(false);

  const pushLive = (cards: string[]) => {
    setLiveCards(cards);
    window.setTimeout(() => setLiveCards([]), 4000);
  };

  const say = (text: string) => setMessages(m => [...m, { role: "atlas", text }]);

  const route = (raw: string) => {
    const q = raw.toLowerCase().trim();
    setMessages(m => [...m, { role: "user", text: raw }]);

    if (/photo|camera|scan my room|room photo|survey|picture|image/.test(q)) {
      say("Opening Inventory — upload or photograph rooms and I'll estimate what movers need to know.");
      onNavigate?.("inventory");
      return;
    }
    if (/plan|timeline|schedule/.test(q)) {
      say("Opening your move timeline — milestones from inventory to utilities.");
      onNavigate?.("timeline");
      return;
    }
    if (/pack|checklist/.test(q)) {
      say("Building a packing checklist from your inventory.");
      onNavigate?.("inventory");
      return;
    }
    if (/inventor|piano|sofa|desk|boxes|track/.test(q)) {
      say("Opening inventory — truck size, weight, and crew estimates.");
      onNavigate?.("inventory");
      return;
    }
    if (/storage/.test(q)) {
      say("Searching short-term storage near Berlin.");
      onNavigate?.("budget");
      return;
    }
    if (/budget|cost|expense|save/.test(q)) {
      say("Opening budget — spend vs limit with savings opportunities.");
      onNavigate?.("budget");
      return;
    }
    if (/compare|rank|best|quot/.test(q)) {
      say("Opening quote comparison across movers.");
      refreshRecommendation();
      setAgentProfile("closer");
      onNavigate?.("companies");
      return;
    }
    if (/find mover|moving compan|search compan/.test(q)) {
      if (!jobSpecReady) finalizeIntake();
      pushLive(["Searching companies…", "Ranking by rating…", "Queuing outbound calls…"]);
      say("Searching… Found companies on your Munich → Berlin route. Calling the highest-rated ones now.");
      runMarketSearch();
      setAgentProfile("caller");
      onNavigate?.("companies");
      return;
    }
    if (/call|book transport|service provider|get me quote|august/.test(q)) {
      if (!jobSpecReady) finalizeIntake();
      pushLive(["Dialing MoveFast…", "Dialing CityMove…", "Extracting structured quotes…"]);
      say("Calling the highest-rated movers now — I'll use your photo survey inventory in the pitch.");
      setAgentProfile("caller");
      onNavigate?.("calls");
      runWaves();
      return;
    }
    if (/document|contract|invoice/.test(q)) {
      say("Opening your document vault.");
      onNavigate?.("documents");
      return;
    }
    if (/analytic|performance|how much/.test(q)) {
      say("Opening analytics — time and money atlas.ai has saved you.");
      onNavigate?.("analytics");
      return;
    }
    say(`Got it, ${firstName}. I'll fold that into your move and keep Mission Control updated.`);
  };

  const submit = (raw?: string) => {
    const q = (raw ?? text).trim();
    if (!q) return;
    route(q);
    setText("");
  };

  const tapVoice = () => {
    setMode("voice");
    setListening(true);
    window.setTimeout(() => {
      setListening(false);
      submit("Find me movers for August 14");
    }, 1000);
  };

  const busy = searching || wavesRunning || liveCards.length > 0;

  if (variant === "hero") {
    return (
      <div className="space-y-5">
        <div>
          <p className="text-sm font-medium text-primary">atlas.ai</p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-semibold text-slate-900">What can I help you with?</h1>
        </div>

        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => submit(s)}
              className="text-sm px-3.5 py-2 rounded-full border border-slate-200 bg-white text-slate-700 hover:border-primary/40 hover:text-primary transition-colors"
            >
              ○ {s}
            </button>
          ))}
        </div>

        {(liveCards.length > 0 || busy) && (
          <div className="grid sm:grid-cols-3 gap-2">
            {(liveCards.length ? liveCards : ["Working…", "Updating Mission Control…", "Standing by…"]).map(c => (
              <div key={c} className="card px-3 py-3 flex items-center gap-2 text-sm text-slate-700">
                <Loader2 size={14} className="animate-spin text-primary shrink-0" />
                {c}
              </div>
            ))}
          </div>
        )}

        <div className="card p-4 min-h-[240px] flex flex-col">
          <div className="flex-1 space-y-3 overflow-y-auto max-h-[360px] mb-4">
            {messages.length === 0 && (
              <p className="text-sm text-slate-400">Conversation with atlas.ai will appear here.</p>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`text-sm ${m.role === "user" ? "text-right" : ""}`}>
                <span className="text-[11px] font-medium text-slate-400 block mb-0.5">
                  {m.role === "user" ? "You" : "atlas.ai"}
                </span>
                <span className={`inline-block rounded-2xl px-3.5 py-2 max-w-[90%] text-left ${
                  m.role === "user" ? "bg-primary text-white" : "bg-slate-100 text-slate-800"
                }`}>
                  {m.text}
                </span>
              </div>
            ))}
          </div>

          <div className="flex gap-2 mb-3">
            <button
              type="button"
              onClick={tapVoice}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-medium ${
                mode === "voice" || listening ? "bg-primary text-white" : "border border-slate-200 text-slate-700"
              }`}
            >
              <Mic size={16} /> Voice
            </button>
            <button
              type="button"
              onClick={() => { setMode("chat"); setListening(false); }}
              className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-medium ${
                mode === "chat" && !listening ? "bg-primary text-white" : "border border-slate-200 text-slate-700"
              }`}
            >
              <Keyboard size={16} /> Type Message
            </button>
          </div>

          {mode === "chat" && (
            <div className="flex items-center gap-2">
              <input
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && submit()}
                placeholder="Find me movers for August 14…"
                className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-primary/50"
              />
              <button type="button" onClick={() => submit()} className="p-3 rounded-xl bg-primary text-white">
                <Send size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Command center (dashboard) + compact card
  return (
    <div className={`agent-panel-glow bg-white p-5 sm:p-7 ${variant === "command" ? "h-full" : ""}`}>
      <p className="text-xs font-semibold tracking-wide uppercase text-primary mb-2">AI Command Center</p>
      <p className="text-xl sm:text-2xl font-semibold text-slate-900 mb-5">
        What can I help you with today?
      </p>

      {(liveCards.length > 0 || busy) && (
        <div className="flex flex-wrap gap-2 mb-4">
          {(liveCards.length ? liveCards : ["atlas.ai is working…"]).map(c => (
            <span key={c} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-primary/5 text-primary">
              <Loader2 size={12} className="animate-spin" /> {c}
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={tapVoice}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-3 py-3.5 text-sm font-medium transition-colors ${
            mode === "voice" || listening ? "bg-primary text-white" : "border border-slate-200 text-slate-700 hover:border-primary/40"
          }`}
        >
          <Mic size={16} /> Voice
        </button>
        <button
          type="button"
          onClick={() => { setMode("chat"); setListening(false); }}
          className={`flex-1 flex items-center justify-center gap-2 rounded-xl px-3 py-3.5 text-sm font-medium transition-colors ${
            mode === "chat" && !listening ? "bg-primary text-white" : "border border-slate-200 text-slate-700 hover:border-primary/40"
          }`}
        >
          <Keyboard size={16} /> Type Message
        </button>
      </div>

      {mode === "chat" && (
        <div className="flex items-center gap-2">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && submit()}
            placeholder="Ask atlas.ai to plan, call, compare, or pack…"
            className="flex-1 border border-slate-200 rounded-xl px-3 py-3 text-sm outline-none focus:border-primary/50"
          />
          <button type="button" onClick={() => submit()} className="p-3 rounded-xl bg-primary text-white">
            <Send size={16} />
          </button>
        </div>
      )}

      {mode === "voice" && (
        <p className="text-xs text-slate-500 text-center py-2">
          {listening ? "Listening…" : "Tap Voice to speak with atlas.ai."}
        </p>
      )}
    </div>
  );
}
