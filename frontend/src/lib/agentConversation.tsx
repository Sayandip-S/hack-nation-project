import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from "react";
import type { NavId } from "./nav";
import { useStore } from "./store";

export type ChatRole = "user" | "agent";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text: string;
  at: number;
}

export interface BehaviorGuideline {
  id: string;
  title: string;
  text: string;
  source: "default" | "learned";
  updatedAt: number;
}

export interface TalkMetrics {
  sessionsStarted: number;
  voiceSessions: number;
  userTurns: number;
  agentTurns: number;
  avgUserChars: number;
  intentsDetected: number;
  guidelineUpdates: number;
  lastSessionAt: number | null;
  listeningSeconds: number;
}

export interface IntentEvent {
  id: string;
  intent: string;
  userText: string;
  agentReply: string;
  guidelineId?: string;
  at: number;
}

export interface ConversationAchievement {
  id: string;
  title: string;
  detail: string;
  at: number;
}

interface DetectResult {
  intent: string;
  reply: string;
  guideline?: Omit<BehaviorGuideline, "updatedAt">;
  navigateTo?: NavId;
}

interface AgentConversationValue {
  messages: ChatMessage[];
  /** Full transcript across sessions (for Summary). */
  transcriptArchive: ChatMessage[];
  guidelines: BehaviorGuideline[];
  metrics: TalkMetrics;
  intentLog: IntentEvent[];
  achievements: ConversationAchievement[];
  sessionActive: boolean;
  listening: boolean;
  speaking: boolean;
  startVoiceSession: () => void;
  startTextSession: () => void;
  sendUserMessage: (text: string) => NavId | null;
  pendingNavigate: NavId | null;
  clearPendingNavigate: () => void;
  stopListening: () => void;
  endSession: () => void;
  resetSession: () => void;
}

const DEFAULT_GUIDELINES: BehaviorGuideline[] = [
  {
    id: "g-disclose",
    title: "Always disclose",
    text: "Identify as an AI calling on the customer’s behalf; answer “are you a robot?” honestly.",
    source: "default",
    updatedAt: 0,
  },
  {
    id: "g-honesty",
    title: "Never invent leverage",
    text: "May cite real competing quotes — never fake inventory, fake bids, or change job details.",
    source: "default",
    updatedAt: 0,
  },
  {
    id: "g-same-brief",
    title: "Same brief every call",
    text: "After confirmation, every company hears the identical move description.",
    source: "default",
    updatedAt: 0,
  },
  {
    id: "g-outcomes",
    title: "Clear call endings",
    text: "End each call with an itemised quote, a callback, or a documented decline.",
    source: "default",
    updatedAt: 0,
  },
];

const AgentConversationContext = createContext<AgentConversationValue | null>(null);

function uid() {
  return `m-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function detectIntent(q: string, jobSpecReady: boolean): DetectResult {
  const t = q.toLowerCase().trim();

  if (/looking for a moving company|need a mover|find a mover|moving company/.test(t)) {
    return {
      intent: "seek_mover",
      reply: "What exactly are you looking for — full-service movers, packing only, or a budget-focused quote?",
      guideline: {
        id: "g-seek-mover",
        title: "Focus: find movers",
        text: "User is actively shopping for a moving company. Prioritise clarifying scope before dialing.",
        source: "learned",
      },
    };
  }

  if (/budget|cheap|under €|under \$|save money|affordable/.test(t)) {
    return {
      intent: "budget",
      reply: "Got it — I’ll prioritise competitive pricing and flag anything that looks like a lowball with hidden fees. What’s your ceiling?",
      guideline: {
        id: "g-budget",
        title: "Prioritise budget",
        text: "Optimise for lower total cost; still reject quotes ~30%+ below market as risky.",
        source: "learned",
      },
    };
  }

  // Custom rules before generic “insurance/pack” so chips like “Always ask about insurance” learn correctly
  if (/always (ask|mention)|never |don't |do not |make sure|from now on|update (your )?rules|guideline/.test(t)) {
    return {
      intent: "rule_update",
      reply: "I’ve added that to my call guidelines. It will be included in the pitch on the next outbound calls.",
      guideline: {
        id: `g-custom-${Date.now()}`,
        title: "Custom instruction",
        text: q.trim(),
        source: "learned",
      },
    };
  }

  if (/be (more )?formal|professional tone|sound professional/.test(t)) {
    return {
      intent: "tone_formal",
      reply: "Understood — I’ll keep a calm, professional tone on every call. That instruction is now in my call guidelines.",
      guideline: {
        id: "g-tone",
        title: "Tone: professional",
        text: "Use formal, concise language with dispatchers; avoid casual slang.",
        source: "learned",
      },
    };
  }

  if (/be (more )?friendly|warmer|casual/.test(t)) {
    return {
      intent: "tone_friendly",
      reply: "Sure — I’ll keep things warm and approachable while staying clear about the job. That’s now in my call guidelines.",
      guideline: {
        id: "g-tone",
        title: "Tone: friendly",
        text: "Use a warm, approachable tone without losing clarity on the job spec.",
        source: "learned",
      },
    };
  }

  if (/pack|fragile|piano|insurance/.test(t)) {
    return {
      intent: "special_needs",
      reply: "I’ll make sure packing, fragile handling, and insurance show up in every comparable quote. Anything else I should lock into the brief?",
      guideline: {
        id: "g-special",
        title: "Special handling required",
        text: "Always ask for packing / fragile / piano / insurance line items on every call.",
        source: "learned",
      },
    };
  }

  if (/full.?service|door.?to.?door|packing and unpacking/.test(t)) {
    return {
      intent: "scope_full",
      reply: "Full-service it is — packing, transport, and unloading. Want me to open The Estimator so you can confirm the brief?",
      guideline: {
        id: "g-scope",
        title: "Scope: full-service",
        text: "Request packing + transport + unloading on every outbound pitch.",
        source: "learned",
      },
    };
  }

  if (/open (the )?estimator|confirm (my )?(brief|job ?spec)/.test(t)) {
    return {
      intent: "open_estimator",
      reply: "Opening The Estimator so you can confirm your move brief.",
      navigateTo: "estimator",
    };
  }

  if (/open (the )?caller|call (them|movers)|start calling|get quotes|dial/.test(t)) {
    if (jobSpecReady) {
      return {
        intent: "start_calls",
        reply: "Opening The Caller so you can start gathering quotes.",
        navigateTo: "caller",
      };
    }
    return {
      intent: "start_calls",
      reply: "Your brief isn’t confirmed yet — opening The Estimator first. Confirm there, then we can call movers.",
      navigateTo: "estimator",
    };
  }

  if (/open (the )?closer|recommend|negotiate/.test(t)) {
    return {
      intent: "open_closer",
      reply: "Opening The Closer.",
      navigateTo: "closer",
    };
  }

  return {
    intent: "general",
    reply: "Thanks — tell me a bit more about the move (cities, date, or what matters most) and I’ll adjust how I work for you.",
  };
}

function achievementForIntent(
  intent: string,
  guideline?: Omit<BehaviorGuideline, "updatedAt">,
): ConversationAchievement | null {
  const at = Date.now();
  const map: Record<string, { title: string; detail: string }> = {
    seek_mover: {
      title: "Move search started",
      detail: "User asked to find a moving company; agent began clarifying scope.",
    },
    budget: {
      title: "Budget preference captured",
      detail: "Call guidelines now prioritise competitive pricing and flag risky lowballs.",
    },
    special_needs: {
      title: "Special handling noted",
      detail: "Packing, fragile, piano, or insurance requirements added to call guidelines.",
    },
    tone_formal: {
      title: "Tone set to professional",
      detail: "Outbound pitch includes a professional-tone instruction.",
    },
    tone_friendly: {
      title: "Tone set to friendly",
      detail: "Outbound pitch includes a warm, clear-tone instruction.",
    },
    rule_update: {
      title: "Custom rule learned",
      detail: guideline?.text ?? "A new behavioural instruction was added from chat.",
    },
    scope_full: {
      title: "Full-service scope set",
      detail: "Packing, transport, and unloading requested on every pitch.",
    },
    start_calls: {
      title: "Routed to quote gathering",
      detail: "User asked to start calling; agent opened Estimator or Caller as appropriate.",
    },
    open_estimator: {
      title: "Opened Estimator",
      detail: "User was taken to confirm the move brief.",
    },
    open_closer: {
      title: "Opened Closer",
      detail: "User was taken to negotiate and recommend.",
    },
  };
  const hit = map[intent];
  if (!hit) return null;
  return { id: `ach-${intent}-${at}`, title: hit.title, detail: hit.detail, at };
}

export function AgentConversationProvider({ children }: { children: React.ReactNode }) {
  const { jobSpecReady, setCallGuidelines } = useStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [transcriptArchive, setTranscriptArchive] = useState<ChatMessage[]>([]);
  const [guidelines, setGuidelines] = useState<BehaviorGuideline[]>(DEFAULT_GUIDELINES);
  const [intentLog, setIntentLog] = useState<IntentEvent[]>([]);
  const [achievements, setAchievements] = useState<ConversationAchievement[]>([]);
  const [sessionActive, setSessionActive] = useState(false);
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [pendingNavigate, setPendingNavigate] = useState<NavId | null>(null);
  const [metrics, setMetrics] = useState<TalkMetrics>({
    sessionsStarted: 0,
    voiceSessions: 0,
    userTurns: 0,
    agentTurns: 0,
    avgUserChars: 0,
    intentsDetected: 0,
    guidelineUpdates: 0,
    lastSessionAt: null,
    listeningSeconds: 0,
  });
  const userCharTotal = useRef(0);
  const listenTimer = useRef<number | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;

  useEffect(() => {
    const learned = guidelines.filter(g => g.source === "learned").map(g => g.text);
    setCallGuidelines(learned);
  }, [guidelines, setCallGuidelines]);

  const pushAgent = useCallback((text: string) => {
    const msg: ChatMessage = { id: uid(), role: "agent", text, at: Date.now() };
    setMessages(m => [...m, msg]);
    setTranscriptArchive(a => [...a, msg]);
    setMetrics(m => ({ ...m, agentTurns: m.agentTurns + 1 }));
  }, []);

  const applyGuideline = useCallback((g: Omit<BehaviorGuideline, "updatedAt">) => {
    const next: BehaviorGuideline = { ...g, updatedAt: Date.now() };
    setGuidelines(prev => {
      const idx = prev.findIndex(x => x.id === next.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = next;
        return copy;
      }
      return [next, ...prev];
    });
    setMetrics(m => ({ ...m, guidelineUpdates: m.guidelineUpdates + 1 }));
  }, []);

  const stopListening = useCallback(() => {
    setListening(false);
    if (listenTimer.current != null) {
      window.clearInterval(listenTimer.current);
      listenTimer.current = null;
    }
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    recognitionRef.current = null;
  }, []);

  const sendUserMessage = useCallback((raw: string): NavId | null => {
    const text = raw.trim();
    if (!text) return null;
    stopListening();
    setSessionActive(true);
    const userMsg: ChatMessage = { id: uid(), role: "user", text, at: Date.now() };
    setMessages(m => [...m, userMsg]);
    setTranscriptArchive(a => [...a, userMsg]);
    userCharTotal.current += text.length;

    const { intent, reply, guideline, navigateTo } = detectIntent(text, jobSpecReady);
    const at = Date.now();
    const meaningful = intent !== "general";
    setMetrics(m => ({
      ...m,
      userTurns: m.userTurns + 1,
      intentsDetected: m.intentsDetected + (meaningful ? 1 : 0),
      avgUserChars: Math.round(userCharTotal.current / (m.userTurns + 1)),
    }));

    if (meaningful) {
      setIntentLog(log => [
        ...log,
        {
          id: uid(),
          intent,
          userText: text,
          agentReply: reply,
          guidelineId: guideline?.id,
          at,
        },
      ]);
    }

    if (guideline) applyGuideline(guideline);

    const achievement = achievementForIntent(intent, guideline);
    if (achievement) {
      setAchievements(prev => {
        if (prev.some(a => a.title === achievement.title && intent !== "rule_update")) return prev;
        return [achievement, ...prev];
      });
    }

    setSpeaking(true);
    window.setTimeout(() => {
      pushAgent(reply);
      setSpeaking(false);
    }, 550);

    if (navigateTo) setPendingNavigate(navigateTo);
    return navigateTo ?? null;
  }, [applyGuideline, jobSpecReady, pushAgent, stopListening]);

  const startMic = useCallback(() => {
    setListening(true);
    if (listenTimer.current == null) {
      listenTimer.current = window.setInterval(() => {
        setMetrics(m => ({ ...m, listeningSeconds: m.listeningSeconds + 1 }));
      }, 1000);
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    recognitionRef.current = rec;
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (event: SpeechRecognitionEvent) => {
      const said = event.results[0]?.[0]?.transcript?.trim();
      if (said) sendUserMessage(said);
    };
    rec.onerror = () => {
      setListening(false);
    };
    rec.onend = () => {
      setListening(false);
    };
    try {
      rec.start();
    } catch {
      /* mic blocked — user can type */
    }
  }, [sendUserMessage]);

  const beginSession = useCallback((voice: boolean) => {
    stopListening();
    setSessionActive(true);
    setMessages([]);
    setSpeaking(true);
    setMetrics(m => ({
      ...m,
      sessionsStarted: m.sessionsStarted + 1,
      voiceSessions: m.voiceSessions + (voice ? 1 : 0),
      lastSessionAt: Date.now(),
    }));

    window.setTimeout(() => {
      pushAgent("Hey, how can I help you today?");
      setSpeaking(false);
      if (voice) startMic();
    }, 400);
  }, [pushAgent, startMic, stopListening]);

  const startVoiceSession = useCallback(() => {
    if (messagesRef.current.length > 0) {
      setSessionActive(true);
      stopListening();
      startMic();
      return;
    }
    beginSession(true);
  }, [beginSession, startMic, stopListening]);

  const startTextSession = useCallback(() => {
    if (messagesRef.current.length > 0) {
      setSessionActive(true);
      return;
    }
    if (sessionActive) return;
    beginSession(false);
  }, [beginSession, sessionActive]);

  const endSession = useCallback(() => {
    stopListening();
    setSessionActive(false);
    setSpeaking(false);
  }, [stopListening]);

  const resetSession = useCallback(() => {
    endSession();
    setMessages([]);
  }, [endSession]);

  const clearPendingNavigate = useCallback(() => setPendingNavigate(null), []);

  const value = useMemo(
    () => ({
      messages,
      transcriptArchive,
      guidelines,
      metrics,
      intentLog,
      achievements,
      sessionActive,
      listening,
      speaking,
      startVoiceSession,
      startTextSession,
      sendUserMessage,
      pendingNavigate,
      clearPendingNavigate,
      stopListening,
      endSession,
      resetSession,
    }),
    [
      messages, transcriptArchive, guidelines, metrics, intentLog, achievements,
      sessionActive, listening, speaking, pendingNavigate,
      startVoiceSession, startTextSession, sendUserMessage, clearPendingNavigate,
      stopListening, endSession, resetSession,
    ],
  );

  return (
    <AgentConversationContext.Provider value={value}>
      {children}
    </AgentConversationContext.Provider>
  );
}

export function useAgentConversation() {
  const ctx = useContext(AgentConversationContext);
  if (!ctx) throw new Error("useAgentConversation must be used within AgentConversationProvider");
  return ctx;
}
