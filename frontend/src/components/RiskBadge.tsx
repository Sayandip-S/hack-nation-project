import { RiskLabel } from "../types";

const risk: Record<RiskLabel, string> = {
  low: "bg-emerald-50 text-emerald-700",
  medium: "bg-amber-50 text-amber-700",
  high: "bg-rose-50 text-rose-700",
};

export const RiskBadge = ({ label }: { label: RiskLabel }) =>
  <span className={`pill ${risk[label]}`}>{label} risk</span>;
