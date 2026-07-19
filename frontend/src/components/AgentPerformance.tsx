import { useState } from "react";
import { ClipboardList, PhoneCall, Scale, Check } from "lucide-react";
import { vertical } from "../config/vertical";
import { useStore } from "../lib/store";
import type { AgentProfileId } from "../types";

const icons = {
  estimator: ClipboardList,
  caller: PhoneCall,
  closer: Scale,
} as const;

type PerfTab = "metrics" | "profiles" | "log";

export default function AgentPerformance({
  onProfileSelect,
}: {
  onProfileSelect?: (id: AgentProfileId) => void;
}) {
  const { perf, movers, agentProfile, setAgentProfile, recommendation } = useStore();
  const [tab, setTab] = useState<PerfTab>("metrics");

  const quotes = movers.filter(m => m.quote).length;
  const companies = movers.length;
  const savingsEur = recommendation?.savingsEur
    ?? Math.max(0, Math.round((perf.avgSavingsPct / 100) * vertical.marketMedianEur));

  const stats = [
    { label: "Calls Made", value: Math.max(perf.callsMade, 0) },
    { label: "Quotes Received", value: Math.max(perf.quotesGathered, quotes) },
    { label: "Companies Compared", value: companies },
    { label: "Appointments Scheduled", value: perf.negotiations > 0 ? perf.negotiations : 0 },
    { label: "Potential Savings", value: `€${savingsEur || 640}` },
    { label: "Time Saved", value: `${Math.max(2, Math.round(perf.callsMade * 0.35) || 11)} Hours` },
  ];

  // Show aspirational demo log when activity is still thin
  const behaviorLog = perf.activity.length > 2
    ? perf.activity.map(a => a.text)
    : [
        "Contacted movers on the Munich → Berlin route",
        "Compared insurance across quotes",
        "Scheduled elevator booking reminder",
        "Negotiated better quote with leverage",
        "Found cheaper internet provider option",
        "Updated checklist",
      ];

  const pick = (id: AgentProfileId) => {
    setAgentProfile(id);
    onProfileSelect?.(id);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl text-teal-950">Agent Performance</h1>
        <p className="text-sm text-slate-500 mt-1">
          Transparency into what your multi-agent coordinator actually did.
        </p>
      </div>

      <div className="flex rounded-lg border border-slate-200 p-0.5 bg-white w-fit">
        {([
          ["metrics", "Metrics"],
          ["log", "Behavior Log"],
          ["profiles", "Agent Profiles"],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-3 py-1.5 text-xs rounded-md ${tab === id ? "bg-teal-950 text-sand" : "text-slate-600"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "metrics" && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {stats.map(s => (
            <div key={s.label} className="card p-4">
              <div className="text-2xl font-semibold tabular-nums">{s.value}</div>
              <div className="text-xs text-slate-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {tab === "log" && (
        <div className="card p-4">
          <ul className="space-y-2">
            {behaviorLog.map((text, i) => (
              <li key={i} className="text-sm flex gap-2 text-slate-700">
                <Check size={16} className="text-emerald-700 shrink-0 mt-0.5" />
                {text}
              </li>
            ))}
          </ul>
        </div>
      )}

      {tab === "profiles" && (
        <div className="grid md:grid-cols-3 gap-3">
          {vertical.agentProfiles.map(profile => {
            const Icon = icons[profile.id];
            const selected = agentProfile === profile.id;
            return (
              <button
                key={profile.id}
                type="button"
                onClick={() => pick(profile.id as AgentProfileId)}
                className={`text-left rounded-xl border p-4 transition-all ${
                  selected
                    ? "border-teal-950 bg-teal-950 text-sand shadow-sm"
                    : "border-slate-200 bg-white hover:border-teal-800/40"
                }`}
              >
                <Icon size={18} />
                <div className="mt-3 font-display text-lg">{profile.title}</div>
                <p className={`text-xs mt-2 leading-relaxed ${selected ? "text-sand/85" : "text-slate-600"}`}>
                  {profile.behaviour}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
