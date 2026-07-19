import { useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, LogOut, Menu, Mic, Settings, User, X } from "lucide-react";
import { NAV_ITEMS, type NavId } from "../lib/nav";
import { useStore } from "../lib/store";

const DEMO_NOTIFICATIONS = [
  {
    id: "n1",
    title: "3 new mover quotes ready",
    body: "Compare MoveFast, CityMove, and Berlin Express in The Closer.",
    time: "12 min ago",
    unread: true,
  },
  {
    id: "n2",
    title: "Call wave finished",
    body: "Atlas finished gathering quotes for your Munich → Berlin move.",
    time: "1 hr ago",
    unread: true,
  },
  {
    id: "n3",
    title: "Parking permit reminder",
    body: "Book a permit near your Berlin address before Aug 14.",
    time: "Yesterday",
    unread: false,
  },
];

export default function AppShell({
  active,
  pageTitle: pageTitleProp,
  onNavigate,
  userName,
  onSignOut,
  children,
}: {
  active: NavId;
  pageTitle?: string;
  onNavigate: (id: NavId) => void;
  userName?: string;
  onSignOut: () => void;
  children: React.ReactNode;
}) {
  const { user } = useStore();
  const [open, setOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [notifications, setNotifications] = useState(DEMO_NOTIFICATIONS);
  const notifRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const accountCloseTimer = useRef<number | null>(null);

  const initials = (userName ?? "U").split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase();
  const pageTitle = pageTitleProp ?? NAV_ITEMS.find(i => i.id === active)?.label ?? "Home";
  const unreadCount = notifications.filter(n => n.unread).length;

  const clearAccountCloseTimer = () => {
    if (accountCloseTimer.current != null) {
      window.clearTimeout(accountCloseTimer.current);
      accountCloseTimer.current = null;
    }
  };

  const openAccount = () => {
    clearAccountCloseTimer();
    setAccountOpen(true);
    setNotifOpen(false);
  };

  const scheduleAccountClose = () => {
    clearAccountCloseTimer();
    accountCloseTimer.current = window.setTimeout(() => setAccountOpen(false), 160);
  };

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (notifRef.current && !notifRef.current.contains(target)) setNotifOpen(false);
      if (accountRef.current && !accountRef.current.contains(target)) setAccountOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      clearAccountCloseTimer();
    };
  }, []);

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  };

  const NavList = ({ compact }: { compact?: boolean }) => (
    <nav className={`flex flex-col gap-0.5 ${compact ? "px-2" : "px-3"} pb-6`} aria-label="Main">
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
                : "text-zinc-400 hover:bg-primary/15 hover:text-primary"
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
    <div className="flex h-dvh overflow-hidden dashboard-shell">
      <aside className="hidden lg:flex w-52 shrink-0 flex-col border-r min-h-0 border-zinc-700 bg-zinc-900">
        <div className="px-5 pt-6 pb-4">
          <p className="text-lg font-semibold tracking-tight text-primary">
            atlas.ai
          </p>
          <p className="text-[11px] mt-0.5 text-zinc-400">
            One AI. One Move.
          </p>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0"><NavList /></div>
      </aside>

      <aside className="hidden md:flex lg:hidden w-[4.25rem] shrink-0 flex-col border-r items-stretch border-zinc-700 bg-zinc-900">
        <div className="grid place-items-center py-5">
          <span className="w-9 h-9 rounded-xl bg-primary text-white text-sm font-bold grid place-items-center">A</span>
        </div>
        <div className="flex-1 overflow-y-auto"><NavList compact /></div>
      </aside>

      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="relative w-64 max-w-[85%] bg-zinc-900 h-full shadow-xl flex flex-col border-r border-zinc-700">
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <p className="text-lg font-semibold text-primary">atlas.ai</p>
              <button type="button" onClick={() => setOpen(false)} className="p-1 text-zinc-500"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto"><NavList /></div>
            <button type="button" onClick={onSignOut} className="m-3 text-left text-xs px-3 py-2 text-zinc-400">
              Sign out
            </button>
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 min-h-0 flex flex-col pb-20 md:pb-0">
        <header className="z-30 sticky top-0 shrink-0 border-b border-zinc-700 bg-zinc-900/95 backdrop-blur">
          <div className="flex items-center gap-3 px-4 sm:px-6 lg:px-8 py-4">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="md:hidden p-2 rounded-xl border border-zinc-700"
            >
              <Menu size={18} />
            </button>
            <h1 className="min-w-0 flex-1 text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-100 truncate">
              {pageTitle}
            </h1>

            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => {
                  setNotifOpen(v => !v);
                  setAccountOpen(false);
                }}
                className={`relative p-2 rounded-xl border transition-colors ${
                  notifOpen ? "border-primary/40 bg-primary/15 text-primary" : "border-zinc-700 text-zinc-400"
                }`}
                aria-label="Notifications"
                aria-expanded={notifOpen}
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-warning" />
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-zinc-700 bg-zinc-900 shadow-lg shadow-black/40 overflow-hidden z-50">
                  <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-zinc-800">
                    <div>
                      <p className="text-sm font-semibold text-zinc-100">Notifications</p>
                      <p className="text-[11px] text-zinc-400">
                        {unreadCount ? `${unreadCount} unread` : "You're all caught up"}
                      </p>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllRead}
                        className="text-xs font-medium text-primary hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <ul className="max-h-80 overflow-y-auto divide-y divide-zinc-800">
                    {notifications.map(n => (
                      <li key={n.id}>
                        <button
                          type="button"
                          onClick={() => {
                            setNotifications(prev =>
                              prev.map(item => item.id === n.id ? { ...item, unread: false } : item),
                            );
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-zinc-800 transition-colors"
                        >
                          <div className="flex items-start gap-2.5">
                            {n.unread ? (
                              <span className="mt-1.5 w-2 h-2 rounded-full bg-primary shrink-0" />
                            ) : (
                              <span className="mt-1.5 w-2 h-2 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className={`text-sm ${n.unread ? "font-semibold text-zinc-100" : "font-medium text-zinc-300"}`}>
                                {n.title}
                              </p>
                              <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{n.body}</p>
                              <p className="text-[11px] text-zinc-500 mt-1.5 font-metric">{n.time}</p>
                            </div>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div
              className="relative"
              ref={accountRef}
              onMouseEnter={openAccount}
              onMouseLeave={scheduleAccountClose}
            >
              <button
                type="button"
                onClick={() => {
                  clearAccountCloseTimer();
                  setAccountOpen(v => !v);
                  setNotifOpen(false);
                }}
                className={`flex items-center gap-2 rounded-xl border pl-1 pr-2.5 py-1 transition-colors ${
                  accountOpen ? "border-primary/40 bg-primary/15" : "border-zinc-700"
                }`}
                aria-label="Account menu"
                aria-expanded={accountOpen}
              >
                <span className="w-8 h-8 rounded-lg bg-primary/20 text-primary text-xs font-semibold grid place-items-center">
                  {initials}
                </span>
                <span className="hidden sm:block text-xs max-w-[8rem] truncate text-zinc-400">
                  {userName}
                </span>
                <ChevronDown size={14} className={`hidden sm:block text-zinc-500 transition-transform ${accountOpen ? "rotate-180" : ""}`} />
              </button>

              {accountOpen && (
                <div
                  className="absolute right-0 mt-2 w-64 rounded-2xl border border-zinc-700 bg-zinc-900 shadow-lg shadow-black/40 overflow-hidden z-50"
                  onMouseEnter={openAccount}
                  onMouseLeave={scheduleAccountClose}
                >
                  <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-800/50">
                    <div className="flex items-center gap-3">
                      <span className="w-10 h-10 rounded-xl bg-primary/15 text-primary text-sm font-semibold grid place-items-center">
                        {initials}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-100 truncate">{userName ?? "Account"}</p>
                        <p className="text-xs text-zinc-400 truncate">{user?.email ?? "—"}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setAccountOpen(false);
                        onNavigate("settings");
                      }}
                      className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800"
                    >
                      <User size={16} className="text-zinc-500" />
                      Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAccountOpen(false);
                        onNavigate("settings");
                      }}
                      className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800"
                    >
                      <Settings size={16} className="text-zinc-500" />
                      Settings
                    </button>
                    <div className="my-1 border-t border-zinc-800" />
                    <button
                      type="button"
                      onClick={() => {
                        setAccountOpen(false);
                        onSignOut();
                      }}
                      className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-red-600 hover:bg-red-950/40"
                    >
                      <LogOut size={16} />
                      Log out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 min-h-0 p-4 sm:p-6 lg:p-8 overflow-x-hidden overflow-y-auto flex flex-col">
          <div className="max-w-5xl mx-auto dash-enter w-full flex-1 min-h-0 flex flex-col">
            {children}
          </div>
        </main>
      </div>

      <button
        type="button"
        onClick={() => onNavigate("dashboard")}
        className="md:hidden mic-fab fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-14 h-14 rounded-full bg-primary text-white grid place-items-center"
        aria-label="Go to Home to talk"
        title="Go to Home to talk"
      >
        <Mic size={22} />
      </button>
    </div>
  );
}
