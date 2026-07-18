import { useStore } from "../lib/store";

export function SettingsView() {
  const { user, jobSpec } = useStore();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">Account and active move defaults.</p>
      </div>
      <div className="card p-4 space-y-3 text-sm">
        <div className="flex justify-between gap-3"><span className="text-slate-500">Name</span><span>{user?.name}</span></div>
        <div className="flex justify-between gap-3"><span className="text-slate-500">Email</span><span>{user?.email}</span></div>
        <div className="flex justify-between gap-3"><span className="text-slate-500">Active move</span><span>{jobSpec.originCity} → {jobSpec.destCity}</span></div>
        <div className="flex justify-between gap-3"><span className="text-slate-500">Move date</span><span className="font-metric">August 14</span></div>
        <div className="flex justify-between gap-3"><span className="text-slate-500">Budget limit</span><span className="font-metric">€1800</span></div>
        <div className="flex justify-between gap-3"><span className="text-slate-500">Principle</span><span>One AI. One Move. Complete Visibility.</span></div>
      </div>
    </div>
  );
}
