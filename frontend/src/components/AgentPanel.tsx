import { useEffect, useRef, useState } from "react";
import { ArrowUp, Loader2, Mic, Square } from "lucide-react";
import { useAgentConversation } from "../lib/agentConversation";
import type { NavId } from "../lib/nav";

const SUGGESTIONS = [
  "I'm looking for a moving company",
  "Prioritise budget over speed",
  "Be more professional on calls",
  "Always ask about insurance",
];

export default function AgentPanel({
  onNavigate,
  variant = "card",
}: {
  onNavigate?: (id: NavId) => void;
  variant?: "command" | "hero" | "card";
}) {
  const {
    messages,
    sessionActive,
    listening,
    speaking,
    startVoiceSession,
    startTextSession,
    sendUserMessage,
    stopListening,
  } = useAgentConversation();

  const [text, setText] = useState("");
  const scroller = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const compact = variant === "command";
  const empty = messages.length === 0 && !sessionActive;
  void onNavigate;

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, listening, speaking]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [text]);

  const send = (raw: string) => {
    const q = raw.trim();
    if (!q) return;
    setText("");
    if (!sessionActive) {
      startTextSession();
      window.setTimeout(() => { sendUserMessage(q); }, 900);
    } else {
      sendUserMessage(q);
    }
  };

  const submit = () => send(text);

  const tapMic = () => {
    if (listening) {
      stopListening();
      return;
    }
    startVoiceSession();
  };

  return (
    <div className={`chat-shell ${compact ? "chat-shell-compact" : ""}`}>
      <div ref={scroller} className="chat-thread min-h-0">
        {empty ? (
          <div className="chat-empty">
            <div className="chat-empty-mark" aria-hidden>
              C
            </div>
            <h2 className="chat-empty-title">Corridoor AI</h2>
            <p className="chat-empty-sub">How can I help you today?</p>
            <div className="chat-suggestions">
              {SUGGESTIONS.map(s => (
                <button key={s} type="button" className="chat-chip" onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="chat-messages">
            {messages.map(m => (
              <div
                key={m.id}
                className={`chat-row ${m.role === "user" ? "chat-row-user" : "chat-row-agent"}`}
              >
                {m.role === "agent" && (
                  <div className="chat-avatar" aria-hidden>
                    C
                  </div>
                )}
                <div className="chat-bubble">
                  {m.role === "agent" && (
                    <p className="chat-role">Corridoor AI</p>
                  )}
                  <p className="chat-text">{m.text}</p>
                </div>
              </div>
            ))}

            {speaking && (
              <div className="chat-row chat-row-agent">
                <div className="chat-avatar" aria-hidden>C</div>
                <div className="chat-bubble chat-typing">
                  <Loader2 size={14} className="animate-spin" />
                  <span>Thinking…</span>
                </div>
              </div>
            )}

            {listening && !speaking && (
              <div className="chat-listening">
                <span className="chat-listening-dot" />
                Listening — speak, or keep typing
              </div>
            )}
          </div>
        )}
      </div>

      <div className="chat-composer-wrap">
        <div className={`chat-composer ${listening ? "chat-composer-live" : ""}`}>
          <button
            type="button"
            onClick={tapMic}
            className={`chat-icon-btn ${listening ? "chat-icon-btn-live" : ""}`}
            aria-label={listening ? "Stop listening" : "Talk with voice"}
          >
            {listening ? <Square size={16} /> : <Mic size={17} />}
          </button>
          <textarea
            ref={inputRef}
            rows={1}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={listening ? "Listening… or type instead" : "Message Corridoor AI"}
            className="chat-input"
          />
          <button
            type="button"
            onClick={submit}
            disabled={!text.trim()}
            className="chat-send"
            aria-label="Send message"
          >
            <ArrowUp size={18} strokeWidth={2.25} />
          </button>
        </div>
        <p className="chat-footnote">
          Learned rules are added to the outbound call pitch · Mic listens (type if speech isn’t available)
        </p>
      </div>
    </div>
  );
}
