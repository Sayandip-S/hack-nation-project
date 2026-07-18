import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, Bot, CalendarRange, Package, Truck,
  Phone, Wallet, FileText, BarChart3, Settings,
} from "lucide-react";

export type NavId =
  | "dashboard"
  | "assistant"
  | "timeline"
  | "inventory"
  | "companies"
  | "calls"
  | "budget"
  | "documents"
  | "analytics"
  | "settings";

export const NAV_ITEMS: { id: NavId; label: string; icon: LucideIcon }[] = [
  { id: "dashboard", label: "Universe", icon: LayoutDashboard },
  { id: "assistant", label: "AI Assistant", icon: Bot },
  { id: "timeline", label: "Timeline", icon: CalendarRange },
  { id: "inventory", label: "Inventory", icon: Package },
  { id: "companies", label: "Moving Companies", icon: Truck },
  { id: "calls", label: "Calls", icon: Phone },
  { id: "budget", label: "Budget", icon: Wallet },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "settings", label: "Settings", icon: Settings },
];
