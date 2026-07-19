import { useStore } from "../lib/store";

export function SettingsView() {
  const { user, jobSpec } = useStore();
  return (
    <div className="space-y-5">
      <div className="card p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Profile</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Your account details for this move.</p>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-zinc-400">Name</span>
            <span className="text-zinc-100">{user?.name}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-zinc-400">Email</span>
            <span className="text-zinc-100">{user?.email}</span>
          </div>
        </div>
      </div>

      <div className="card p-5 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-100">Move defaults</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Active job preferences used by Corridoor AI.</p>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-zinc-400">Active move</span>
            <span>{jobSpec.originCity} → {jobSpec.destCity}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-zinc-400">Move window</span>
            <span className="font-metric text-right">
              {jobSpec.dateWindow[0]} → {jobSpec.dateWindow[1]}
            </span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-zinc-400">Services</span>
            <span className="text-right max-w-[60%]">{jobSpec.services.join(", ")}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-zinc-400">Principle</span>
            <span className="text-right">Your AI corridor to a smoother move.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
