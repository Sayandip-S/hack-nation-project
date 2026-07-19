import { Bot, ShieldCheck, AudioLines, Flag } from "lucide-react";
import { buildPitch } from "../mock/engine";
import { useStore } from "../lib/store";

const CONTRACT = [
  {
    id: "disclose",
    icon: Bot,
    title: "AI disclosure",
    rule: "Agent identifies as Corridoor AI calling on behalf of the customer. Answers “are you a robot?” honestly without abandoning the quote.",
    check: (ctx: Ctx) => ctx.hasDisclosurePitch,
  },
  {
    id: "friction",
    icon: AudioLines,
    title: "Friction survival",
    rule: "Handles interruptions, vague answers, and “someone will call you back” with structured outcomes — not silence.",
    check: (ctx: Ctx) => ctx.stylesCovered >= 2,
  },
  {
    id: "honesty",
    icon: ShieldCheck,
    title: "Honesty line",
    rule: "May leverage real competing bids. Never invents inventory, fake bids, or misrepresents the frozen job spec.",
    check: (ctx: Ctx) => ctx.jobSpecReady && ctx.leverageUsed,
  },
  {
    id: "outcome",
    icon: Flag,
    title: "Structured endings",
    rule: "Every call ends as itemised quote, callback commitment, or documented decline — never a vague range.",
    check: (ctx: Ctx) => ctx.structuredEnds > 0,
  },
] as const;

type Ctx = {
  jobSpecReady: boolean;
  hasDisclosurePitch: boolean;
  stylesCovered: number;
  leverageUsed: boolean;
  structuredEnds: number;
};

export default function ConversationContract() {
  const { jobSpec, jobSpecReady, movers } = useStore();
  const calls = movers.flatMap(m => m.calls);
  const stylesCovered = new Set(calls.map(c => c.persona)).size;
  const leverageUsed = calls.some(c => c.wave >= 2 && (c.citedQuoteEur != null || c.negotiatedTotalEur != null));
  const structuredEnds = calls.filter(c =>
    c.status === "completed" || c.terminalOutcome === "callback" || c.terminalOutcome === "declined",
  ).length;
  const hasDisclosurePitch = /Corridoor AI|corridoor|AI moving coordinator/i.test(
    buildPitch(jobSpec).join(" "),
  );

  const ctx: Ctx = {
    jobSpecReady,
    hasDisclosurePitch,
    stylesCovered,
    leverageUsed,
    structuredEnds,
  };

  const passed = CONTRACT.filter(c => c.check(ctx)).length;

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-800 flex items-start justify-between gap-3 bg-zinc-800/40">
        <div>
          <h3 className="text-base font-semibold text-zinc-100">On-call guardrails</h3>
          <p className="text-xs text-zinc-400 mt-1">
            Live checks for how Corridoor AI behaves during outbound calls.
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl font-semibold font-metric text-primary">{passed}/{CONTRACT.length}</div>
          <div className="text-[11px] text-zinc-500">checks live</div>
        </div>
      </div>
      <ul className="divide-y divide-zinc-800">
        {CONTRACT.map(item => {
          const Icon = item.icon;
          const ok = item.check(ctx);
          return (
            <li key={item.id} className="px-5 py-3.5 flex gap-3">
              <span className={`mt-0.5 w-8 h-8 rounded-lg grid place-items-center shrink-0 ${
                ok ? "bg-emerald-950/50 text-emerald-400" : "bg-zinc-800 text-zinc-500"
              }`}>
                <Icon size={15} />
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-zinc-100">{item.title}</p>
                  <span className={`text-[10px] uppercase tracking-wide font-metric px-1.5 py-0.5 rounded ${
                    ok ? "bg-emerald-950/50 text-emerald-400" : "bg-amber-50 text-amber-700"
                  }`}>
                    {ok ? "live" : "pending"}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{item.rule}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
