import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import AgentPanel from "../components/AgentPanel";
import CallBoard from "../components/CallBoard";
import QuoteMatrix from "../components/QuoteMatrix";
import MissionControl from "../views/MissionControl";
import UniverseView from "../views/UniverseView";
import InventoryView from "../views/InventoryView";
import TimelineView from "../views/TimelineView";
import BudgetView from "../views/BudgetView";
import AnalyticsView from "../views/AnalyticsView";
import DocumentsView from "../views/DocumentsView";
import { SettingsView } from "../views/SimpleViews";
import { useStore } from "../lib/store";
import type { NavId } from "../lib/nav";

export default function Dashboard() {
  const { user, signOut, setPhase, setAgentProfile } = useStore();
  const nav = useNavigate();
  const [section, setSection] = useState<NavId>("dashboard");
  const [flatDesk, setFlatDesk] = useState(false);

  const go = (id: NavId) => {
    setSection(id);
    if (id === "dashboard") setFlatDesk(false);
    if (id === "companies" || id === "calls") {
      setAgentProfile("caller");
      setPhase("calls");
    }
    if (id === "inventory" || id === "timeline") {
      setAgentProfile("estimator");
      setPhase("intake");
    }
  };

  const immersive = section === "dashboard" && !flatDesk;

  return (
    <AppShell
      active={section}
      onNavigate={go}
      userName={user?.name}
      onSignOut={() => { signOut(); nav("/auth"); }}
      immersive={immersive}
    >
      {section === "dashboard" && (
        flatDesk ? (
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setFlatDesk(false)}
              className="text-sm text-primary font-medium hover:underline"
            >
              ← Back to Moving Universe
            </button>
            <MissionControl onNavigate={go} />
          </div>
        ) : (
          <UniverseView onNavigate={go} onOpenFlat={() => setFlatDesk(true)} />
        )
      )}
      {section === "assistant" && <AgentPanel onNavigate={go} variant="hero" />}
      {section === "timeline" && <TimelineView />}
      {section === "inventory" && <InventoryView />}
      {section === "companies" && <QuoteMatrix />}
      {section === "calls" && (
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Calls</h1>
            <p className="text-sm text-slate-500 mt-1">
              Every atlas.ai call — transcript, audio, extraction, follow-ups.
            </p>
          </div>
          <CallBoard />
        </div>
      )}
      {section === "budget" && <BudgetView />}
      {section === "documents" && <DocumentsView />}
      {section === "analytics" && <AnalyticsView />}
      {section === "settings" && <SettingsView />}
    </AppShell>
  );
}
