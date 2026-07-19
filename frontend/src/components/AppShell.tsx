import { useEffect, useState } from "react";
import { Bell, Menu, Mic, X } from "lucide-react";
import { NAV_ITEMS, type NavId } from "../lib/nav";

export default function AppShell({
  active,
  onNavigate,
  userName,
  onSignOut,
  immersive = false,
  children,
}: {
  active: NavId;
  onNavigate: (id: NavId) => void;
  userName?: string;
  onSignOut: () => void;
  immersive?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!immersive) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [immersive]);
  const initials = (userName ?? "U").split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();

  const NavList = ({ compact }: { compact?: boolean }) => (
    <nav className={`flex flex-col gap-0.5 ${compact ? "px-2" : "px-3"} pb-6`} aria-label="Mission control">
      {NAV_ITEMS.map(item => {
        const Icon = item.icon;
        const on = active === item.id;
        return (
          <button
            key={item.id}
            type="button"
            title={item.label}
            onClick={() => { onNavigate(item.id); setOpen(false); }}
            className={`flex items-center gap-3 rounded-xl transition-colors ${
              compact ? "justify-center p-3" : "px-3 py-2.5 text-sm"
            } ${
              on
                ? "bg-primary text-white font-medium"
                : immersive
                  ? "text-slate-400 hover:bg-white/5 hover:text-white"
                  : "text-slate-600 hover:bg-primary/5 hover:text-primary"
            }`}
          >
            <Icon size={compact ? 20 : 18} strokeWidth={on ? 2.25 : 1.75} />
            {!compact && <span>{item.label}</span>}
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className={`flex ${immersive ? "h-dvh max-h-dvh overflow-hidden bg-[#030712]" : "min-h-screen dashboard-shell"}`}>
      <aside className={`hidden lg:flex w-52 shrink-0 flex-col border-r min-h-0 ${
        immersive ? "border-white/10 bg-[#020617]/90" : "border-slate-200 bg-white"
      }`}>
        <div className={immersive ? "px-4 pt-4 pb-3" : "px-5 pt-6 pb-4"}>
          <p className={`text-lg font-semibold tracking-tight ${immersive ? "text-white" : "text-primary"}`}>
            atlas.ai
          </p>
          <p className="text-[11px] mt-0.5 text-slate-500">
            One AI. One Move.
          </p>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0"><NavList /></div>
      </aside>

      <aside className={`hidden md:flex lg:hidden w-[4.25rem] shrink-0 flex-col border-r items-stretch ${
        immersive ? "border-white/10 bg-[#020617]" : "border-slate-200 bg-white"
      }`}>
        <div className="grid place-items-center py-5">
          <span className="w-9 h-9 rounded-xl bg-primary text-white text-sm font-bold grid place-items-center">A</span>
        </div>
        <div className="flex-1 overflow-y-auto"><NavList compact /></div>
      </aside>

      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="relative w-64 max-w-[85%] bg-[#020617] h-full shadow-xl flex flex-col border-r border-white/10">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <p className="text-lg font-semibold text-white">atlas.ai</p>
              <button type="button" onClick={() => setOpen(false)} className="p-1 text-slate-400"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto"><NavList /></div>
            <button type="button" onClick={onSignOut} className="m-3 text-left text-xs px-3 py-2 text-slate-500">
              Sign out
            </button>
          </aside>
        </div>
      )}

      <div className={`flex-1 min-w-0 min-h-0 flex flex-col ${immersive ? "overflow-hidden" : "pb-20 md:pb-0"}`}>
        <header className={`z-30 flex items-center gap-3 px-3 sm:px-5 shrink-0 border-b backdrop-blur ${
          immersive
            ? "bg-[#020617]/90 border-white/10 py-2"
            : "sticky top-0 bg-white/90 border-slate-200/80 py-3 px-4 sm:px-6 lg:px-8"
        }`}>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={`md:hidden p-2 rounded-xl border ${immersive ? "border-white/15 text-white" : "border-slate-200"}`}
          >
            <Menu size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-semibold truncate ${immersive ? "text-white" : "text-slate-900"}`}>
              {immersive ? "Moving Universe" : "Mission Control"}
            </p>
            <p className={`text-[11px] truncate ${immersive ? "text-slate-500" : "text-slate-500"}`}>
              {NAV_ITEMS.find(i => i.id === active)?.label}
            </p>
          </div>
          <button
            type="button"
            className={`relative p-2 rounded-xl border ${immersive ? "border-white/15 text-slate-300" : "border-slate-200 text-slate-600"}`}
            aria-label="Notifications"
          >
            <Bell size={18} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-warning" />
          </button>
          <button
            type="button"
            onClick={onSignOut}
            className={`flex items-center gap-2 rounded-xl border pl-1 pr-2.5 py-1 ${
              immersive ? "border-white/15" : "border-slate-200"
            }`}
            title="Profile / Sign out"
          >
            <span className="w-8 h-8 rounded-lg bg-primary/20 text-primary text-xs font-semibold grid place-items-center">
              {initials}
            </span>
            <span className={`hidden sm:block text-xs max-w-[8rem] truncate ${immersive ? "text-slate-300" : "text-slate-600"}`}>
              {userName}
            </span>
          </button>
        </header>

        <main className={`flex-1 min-h-0 ${immersive ? "p-0 overflow-hidden" : "p-4 sm:p-6 lg:p-8 overflow-x-hidden"}`}>
          <div className={immersive ? "h-full min-h-0 overflow-hidden" : "max-w-5xl mx-auto dash-enter"}>
            {children}
          </div>
        </main>
      </div>

      {!immersive && (
        <button
          type="button"
          onClick={() => onNavigate("assistant")}
          className="md:hidden mic-fab fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-14 h-14 rounded-full bg-primary text-white grid place-items-center"
          aria-label="Talk to atlas.ai"
        >
          <Mic size={22} />
        </button>
      )}
    </div>
  );
}
