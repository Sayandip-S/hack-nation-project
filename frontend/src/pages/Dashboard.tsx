import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/AppShell";
import MissionControl from "../views/MissionControl";
import EstimatorView from "../views/EstimatorView";
import CallerView from "../views/CallerView";
import CloserView from "../views/CloserView";
import DocumentsView from "../views/DocumentsView";
import AgentBehaviorView from "../views/AgentBehaviorView";
import SummaryView from "../views/SummaryView";
import { SettingsView } from "../views/SimpleViews";
import { useAgentConversation } from "../lib/agentConversation";
import { useStore } from "../lib/store";
import type { NavId } from "../lib/nav";
import type { PhaseId } from "../types";

const phaseForNav: Partial<Record<NavId, PhaseId>> = {
  estimator: "intake",
  caller: "calls",
  closer: "close",
};

const PAGE_TITLE: Partial<Record<NavId, string>> = {
  dashboard: "Home",
  estimator: "Estimator",
  caller: "Caller",
  closer: "Closer",
  agent: "Agent",
  summary: "Summary",
  evidence: "Documents",
  settings: "Settings",
};

export default function Dashboard() {
  const { user, signOut, setPhase, setAgentProfile } = useStore();
  const { pendingNavigate, clearPendingNavigate, endSession } = useAgentConversation();
  const nav = useNavigate();
  const [section, setSection] = useState<NavId>("dashboard");

  const go = (id: NavId) => {
    setSection(id);
    const phase = phaseForNav[id];
    if (phase) {
      setPhase(phase);
      setAgentProfile(
        phase === "intake" ? "estimator" : phase === "calls" ? "caller" : "closer",
      );
    }
    if (id !== "dashboard") endSession();
  };

  useEffect(() => {
    if (!pendingNavigate) return;
    const t = window.setTimeout(() => {
      go(pendingNavigate);
      clearPendingNavigate();
    }, 700);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to pendingNavigate
  }, [pendingNavigate, clearPendingNavigate]);

  const shellActive: NavId =
    section === "estimator" || section === "caller" || section === "closer"
      ? "agent"
      : section;

  return (
    <AppShell
      active={shellActive}
      pageTitle={PAGE_TITLE[section]}
      onNavigate={go}
      userName={user?.name}
      onSignOut={() => { signOut(); nav("/auth"); }}
    >
      {section === "dashboard" && <MissionControl onNavigate={go} />}
      {section === "estimator" && (
        <EstimatorView onBack={() => go("dashboard")} onOpenCaller={() => go("caller")} />
      )}
      {section === "caller" && (
        <CallerView onBack={() => go("dashboard")} onOpenEstimator={() => go("estimator")} />
      )}
      {section === "closer" && (
        <CloserView onBack={() => go("dashboard")} onOpenCaller={() => go("caller")} />
      )}
      {section === "agent" && <AgentBehaviorView onNavigate={go} />}
      {section === "summary" && <SummaryView />}
      {section === "evidence" && <DocumentsView />}
      {section === "settings" && <SettingsView />}
    </AppShell>
  );
}
