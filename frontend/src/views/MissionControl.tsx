import AgentPanel from "../components/AgentPanel";
import type { NavId } from "../lib/nav";
import { useStore } from "../lib/store";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function daysUntil(iso: string) {
  const target = new Date(iso + "T12:00:00").getTime();
  return Math.max(0, Math.ceil((target - Date.now()) / 86400000));
}

export default function MissionControl({ onNavigate }: { onNavigate: (id: NavId) => void }) {
  const { user, jobSpec } = useStore();
  const firstName = user?.name?.split(" ")[0] ?? "there";
  const days = daysUntil(jobSpec.dateWindow[0]);

  return (
    <div className="home-fit flex flex-col gap-3 min-h-0">
      <div className="min-w-0 shrink-0">
        <h2 className="text-lg sm:text-xl font-semibold text-zinc-100 tracking-tight truncate">
          {greeting()}, {firstName}
        </h2>
        <p className="text-sm text-zinc-400 truncate">
          {jobSpec.originCity} → {jobSpec.destCity} · move in{" "}
          <span className="font-medium text-zinc-300">{days} days</span>
        </p>
      </div>

      <div className="flex-1 min-h-0 flex flex-col">
        <AgentPanel onNavigate={onNavigate} variant="command" />
      </div>
    </div>
  );
}
