import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, ClipboardList, PhoneCall, Scale,
  FileText, Settings, Bot, NotebookPen,
} from "lucide-react";

/** Internal sections may not appear in the sidebar. */
export type NavId =
  | "dashboard"
  | "estimator"
  | "caller"
  | "closer"
  | "agent"
  | "summary"
  | "evidence"
  | "settings";

export const NAV_ITEMS: { id: NavId; label: string; icon: LucideIcon; hint?: string }[] = [
  { id: "dashboard", label: "Home", icon: LayoutDashboard },
  { id: "agent", label: "Agent", icon: Bot },
  { id: "summary", label: "Summary", icon: NotebookPen },
  { id: "evidence", label: "Documents", icon: FileText },
  { id: "settings", label: "Settings", icon: Settings },
];

/** Used when deep-linking into pipeline modules from Home cards. */
export const PIPELINE_ITEMS: { id: NavId; label: string; icon: LucideIcon }[] = [
  { id: "estimator", label: "Estimator", icon: ClipboardList },
  { id: "caller", label: "Caller", icon: PhoneCall },
  { id: "closer", label: "Closer", icon: Scale },
];
