import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Logo3D from "../components/Logo3D";
import { useStore } from "../lib/store";

const WELCOME =
  "Moving isn't just transporting furniture — it's coordinating dozens of tasks. I plan your move, call providers, compare quotes, manage inventory, and keep every milestone in one place.";

export default function Welcome() {
  const { dismissWelcome } = useStore();
  const nav = useNavigate();
  const [typed, setTyped] = useState("");
  const [ready, setReady] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setTyped(WELCOME.slice(0, i));
      if (i >= WELCOME.length) {
        window.clearInterval(id);
        setReady(true);
      }
    }, 22);
    return () => window.clearInterval(id);
  }, []);

  const continueOn = () => {
    setLeaving(true);
    window.setTimeout(() => {
      dismissWelcome();
      nav("/auth");
    }, 380);
  };

  return (
    <div className={`welcome-stage min-h-screen flex flex-col items-center justify-center px-6 py-12 ${leaving ? "welcome-leave" : ""}`}>
      <div className="welcome-glow" aria-hidden />

      <div className="relative z-10 flex flex-col items-center text-center max-w-xl w-full">
        <Logo3D size="lg" interactive />

        <p className="mt-8 text-5xl md:text-6xl font-semibold tracking-tight text-primary welcome-brand">
          atlas.ai
        </p>
        <p className="mt-2 text-sm md:text-base font-medium text-slate-500">
          One AI. One Move. Complete Visibility.
        </p>

        <p className="mt-5 text-lg md:text-xl text-slate-600 leading-relaxed min-h-[5.5rem] welcome-copy">
          {typed}
          <span className={`welcome-caret ${ready ? "opacity-0" : ""}`} aria-hidden>|</span>
        </p>

        <p className={`mt-2 text-sm text-slate-400 transition-opacity duration-500 ${ready ? "opacity-100" : "opacity-0"}`}>
          Hire a relocation manager — not another checklist
        </p>

        <button
          onClick={continueOn}
          disabled={!ready}
          className={`mt-8 group inline-flex items-center gap-2 rounded-xl bg-primary text-white px-6 py-3 text-sm font-medium
            transition-all duration-300 hover:bg-primary-700 hover:gap-3 disabled:opacity-40 disabled:pointer-events-none
            ${ready ? "welcome-cta-in" : ""}`}
        >
          Sign in or create account
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  );
}
