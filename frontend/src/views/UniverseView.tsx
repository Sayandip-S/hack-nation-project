import { useEffect, useMemo, useState } from "react";
import { Mic, Play, LayoutDashboard, X } from "lucide-react";
import MovingUniverseScene, {
  type ProviderNode,
  type UniverseFocus,
} from "../universe/scene/MovingUniverseScene";
import { useStore } from "../lib/store";
import { estimateFromInventory } from "../mock/data";
import type { NavId } from "../lib/nav";

const DEMO_LINES = [
  "Welcome to Atlas. I will coordinate your move from planning to arrival.",
  "I have analyzed your move. Estimating volume from your inventory…",
  "Searching the marketplace and calling top-rated movers now.",
  "Three offers returned. Ranking by price, reliability, and availability.",
  "MoveFast saves the most while keeping a high reliability score.",
];

export default function UniverseView({
  onNavigate,
  onOpenFlat,
}: {
  onNavigate: (id: NavId) => void;
  onOpenFlat?: () => void;
}) {
  const {
    user, jobSpec, movers, wavesRunning, searching, recommendation,
    runWaves, runMarketSearch, finalizeIntake, jobSpecReady, refreshRecommendation,
  } = useStore();

  const firstName = user?.name?.split(" ")[0] ?? "there";
  const est = estimateFromInventory(jobSpec);
  const quotes = movers.filter(m => m.quote?.comparability === "valid").length;

  let progress = 22;
  if (jobSpec.photoSurveyCount) progress = 32;
  if (quotes >= 1) progress = 48;
  if (quotes >= 3) progress = 62;
  if (recommendation) progress = 78;
  if (wavesRunning || searching) progress = Math.max(progress, 42);

  const [focus, setFocus] = useState<UniverseFocus>(null);
  const [focusMeta, setFocusMeta] = useState<string | undefined>();
  const [caption, setCaption] = useState(`Hi ${firstName}. Your move universe is ready.`);
  const [demoStep, setDemoStep] = useState(-1);
  const [demoRunning, setDemoRunning] = useState(false);
  const [demoProviders, setDemoProviders] = useState<ProviderNode[]>([]);
  const [demoProgress, setDemoProgress] = useState<number | null>(null);

  const liveProviders: ProviderNode[] = useMemo(() => {
    return movers.slice(0, 3).map((m, i) => {
      const last = [...m.calls].reverse()[0];
      let status: ProviderNode["status"] = "waiting";
      if (last) {
        if (["dialing", "in_progress", "negotiating"].includes(last.status)) status = "calling";
        else if (last.status === "completed") status = "done";
      }
      return { id: m.id, name: m.companyName, status, x: (i - 1) * 1.45 };
    });
  }, [movers]);

  const providers = demoProviders.length ? demoProviders : (wavesRunning || quotes > 0 ? liveProviders : []);
  const shownProgress = demoProgress ?? progress;
  const busy = wavesRunning || searching || demoRunning;

  const onFocus = (f: UniverseFocus, meta?: string) => {
    setFocus(f);
    setFocusMeta(meta);
  };

  const runDemo = () => {
    if (demoRunning) return;
    setDemoRunning(true);
    setDemoStep(0);
    setCaption(DEMO_LINES[0]);
    setDemoProviders([]);
    setDemoProgress(18);

    window.setTimeout(() => {
      setDemoStep(1);
      setCaption(DEMO_LINES[1]);
      setDemoProgress(35);
    }, 2800);
    window.setTimeout(() => {
      setDemoStep(2);
      setCaption(DEMO_LINES[2]);
      setDemoProgress(48);
      setDemoProviders([
        { id: "d1", name: "MoveFast", status: "calling", x: -1.45 },
        { id: "d2", name: "CityMove", status: "calling", x: 0 },
        { id: "d3", name: "Berlin Express", status: "waiting", x: 1.45 },
      ]);
      if (!jobSpecReady) finalizeIntake();
      runMarketSearch();
    }, 5600);
    window.setTimeout(() => {
      setDemoProviders([
        { id: "d1", name: "MoveFast", status: "done", x: -1.45 },
        { id: "d2", name: "CityMove", status: "done", x: 0 },
        { id: "d3", name: "Berlin Express", status: "done", x: 1.45 },
      ]);
      setDemoStep(3);
      setCaption(DEMO_LINES[3]);
      setDemoProgress(68);
      runWaves();
    }, 9000);
    window.setTimeout(() => {
      setDemoStep(4);
      setCaption(DEMO_LINES[4]);
      setDemoProgress(88);
      refreshRecommendation();
    }, 13000);
    window.setTimeout(() => {
      setDemoRunning(false);
      setDemoStep(-1);
      setDemoProgress(null);
      setCaption("Demo complete — supervise the rest from Mission Control.");
    }, 16000);
  };

  useEffect(() => {
    if (demoRunning) return;
    if (wavesRunning) setCaption("Atlas network is live — coordinating movers now.");
  }, [wavesRunning, demoRunning]);

  const card = (() => {
    if (focus === "oldHome") {
      return {
        title: jobSpec.originCity,
        lines: [
          `~${est.items} objects · ${est.volumeM3} m³`,
          `Truck: ${est.volumeM3 <= 22 ? "Medium" : "Large"}`,
        ],
        cta: { label: "Inventory", nav: "inventory" as NavId },
      };
    }
    if (focus === "newHome") {
      return {
        title: jobSpec.destCity,
        lines: [`Arrival ${jobSpec.dateWindow[0]}`, "Utilities still open"],
        cta: { label: "Timeline", nav: "timeline" as NavId },
      };
    }
    if (focus === "truck") {
      return {
        title: "Transit",
        lines: [
          `${Math.round(shownProgress)}% complete`,
          recommendation ? "Deal recommendation ready" : "Awaiting confirmed mover",
        ],
        cta: { label: "Companies", nav: "companies" as NavId },
      };
    }
    if (focus === "orb") {
      return {
        title: "Atlas AI",
        lines: [busy ? "Coordinating…" : "Standing by", "Speak to orchestrate"],
        cta: { label: "Talk", nav: "assistant" as NavId },
      };
    }
    if (focus === "provider") {
      const p = providers.find(x => x.id === focusMeta) ?? providers[0];
      return {
        title: p?.name ?? "Provider",
        lines: [`Status: ${p?.status ?? "—"}`, "Open Calls for details"],
        cta: { label: "Calls", nav: "calls" as NavId },
      };
    }
    return null;
  })();

  return (
    <div className="universe-stage relative h-full w-full overflow-hidden bg-[#030712]">
      <MovingUniverseScene
        progress={shownProgress}
        itemCount={est.items}
        busy={busy}
        providers={providers}
        onFocus={onFocus}
      />

      {/* Top HUD */}
      <div className="absolute top-0 inset-x-0 z-10 px-3 py-2 sm:px-4 flex items-center justify-between gap-2 pointer-events-none">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.22em] text-sky-300/80 leading-none">Your move</p>
          <h1 className="text-sm sm:text-base font-semibold text-white tracking-tight truncate mt-0.5">
            {jobSpec.originCity} → {jobSpec.destCity}
          </h1>
        </div>
        <div className="flex gap-1.5 pointer-events-auto shrink-0">
          <button
            type="button"
            onClick={() => runDemo()}
            disabled={demoRunning}
            className="inline-flex items-center gap-1 rounded-lg bg-slate-950/80 hover:bg-slate-900 border border-white/20 text-white text-[11px] px-2.5 py-1.5 disabled:opacity-50"
          >
            <Play size={12} /> Demo
          </button>
          {onOpenFlat && (
            <button
              type="button"
              onClick={onOpenFlat}
              className="inline-flex items-center gap-1 rounded-lg bg-slate-950/80 hover:bg-slate-900 border border-white/20 text-white text-[11px] px-2.5 py-1.5"
            >
              <LayoutDashboard size={12} /> 2D
            </button>
          )}
        </div>
      </div>

      {/* Map-style place labels (2D — sharp Inter, not Html-in-canvas) */}
      <div className="absolute inset-x-0 top-[42%] z-10 px-3 sm:px-8 pointer-events-none flex justify-between items-start">
        <button
          type="button"
          onClick={() => onFocus("oldHome")}
          className="pointer-events-auto text-left rounded-xl bg-white px-3 py-2 shadow-lg max-w-[9.5rem] border border-black/5"
        >
          <p className="text-[10px] uppercase tracking-[0.14em] font-semibold" style={{ color: "#EA4335" }}>Origin</p>
          <p className="text-sm font-semibold text-slate-900 truncate">{jobSpec.originCity}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">{est.items} objects</p>
        </button>
        <div className="self-center rounded-full bg-white px-3 py-1.5 shadow-lg border border-black/5">
          <p className="text-[10px] uppercase tracking-wider text-center leading-none" style={{ color: "#4285F4" }}>Transit</p>
          <p className="font-mono text-sm font-semibold text-slate-900 text-center tabular-nums">
            {Math.round(shownProgress)}%
          </p>
        </div>
        <button
          type="button"
          onClick={() => onFocus("newHome")}
          className="pointer-events-auto text-right rounded-xl bg-white px-3 py-2 shadow-lg max-w-[9.5rem] border border-black/5"
        >
          <p className="text-[10px] uppercase tracking-[0.14em] font-semibold" style={{ color: "#34A853" }}>Destination</p>
          <p className="text-sm font-semibold text-slate-900 truncate">{jobSpec.destCity}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Arrival hub</p>
        </button>
      </div>

      {/* Provider status strip when calling */}
      {providers.length > 0 && (
        <div className="absolute top-14 inset-x-0 z-10 flex justify-center gap-2 px-3 pointer-events-none">
          {providers.map(p => (
            <button
              key={p.id}
              type="button"
              onClick={() => onFocus("provider", p.id)}
              className="pointer-events-auto rounded-lg bg-slate-950/90 border border-white/15 px-2.5 py-1.5 text-left shadow-md"
            >
              <p className="text-[11px] font-medium text-white leading-none">{p.name}</p>
              <p className={`text-[10px] mt-0.5 capitalize ${
                p.status === "done" ? "text-emerald-400" : p.status === "calling" ? "text-amber-400" : "text-slate-400"
              }`}>
                {p.status === "done" ? "Done" : p.status === "calling" ? "Calling…" : "Waiting"}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* Bottom dock: caption + mic in one band */}
      <div className="absolute bottom-0 inset-x-0 z-10 px-3 pb-2.5 pt-2 pointer-events-none">
        <div className="max-w-lg mx-auto flex flex-col items-center gap-2">
          <div className="w-full rounded-xl bg-slate-950/90 border border-white/20 backdrop-blur-md px-3 py-2.5 text-center shadow-[0_8px_32px_rgba(0,0,0,0.45)]">
            <p className="text-xs sm:text-sm text-white leading-snug line-clamp-2 font-medium">{caption}</p>
            {demoStep >= 0 && (
              <p className="text-[9px] uppercase tracking-widest text-blue-300/55 mt-0.5">
                Scene {demoStep + 1}/{DEMO_LINES.length}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onNavigate("assistant")}
            className="pointer-events-auto flex items-center gap-2 rounded-full bg-primary pl-2 pr-3.5 py-1.5 text-white shadow-[0_0_28px_rgba(37,99,235,0.45)] hover:brightness-110"
          >
            <span className="w-8 h-8 rounded-full bg-white/15 grid place-items-center">
              <Mic size={16} />
            </span>
            <span className="text-xs font-medium">Talk to Atlas</span>
          </button>
        </div>
        <div className="absolute bottom-0 inset-x-0 h-0.5 bg-white/5">
          <div
            className="h-full bg-primary transition-all duration-700"
            style={{ width: `${shownProgress}%` }}
          />
        </div>
      </div>

      {/* Selection card — compact, top-left, max height constrained */}
      {card && (
        <div className="absolute left-2 sm:left-3 top-12 z-20 w-[min(calc(100%-1rem),15rem)] max-h-[40%] overflow-hidden">
          <div className="rounded-xl bg-slate-950/90 border border-white/15 backdrop-blur-md p-3 text-white shadow-xl">
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <h2 className="text-sm font-semibold tracking-tight truncate">{card.title}</h2>
              <button type="button" onClick={() => setFocus(null)} className="text-white/40 hover:text-white shrink-0">
                <X size={14} />
              </button>
            </div>
            <ul className="space-y-0.5 text-xs text-white/70 mb-2">
              {card.lines.map(l => <li key={l}>• {l}</li>)}
            </ul>
            <button
              type="button"
              onClick={() => onNavigate(card.cta.nav)}
              className="w-full rounded-lg bg-primary py-1.5 text-xs font-medium"
            >
              {card.cta.label}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
