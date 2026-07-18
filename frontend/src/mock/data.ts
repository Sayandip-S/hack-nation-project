import { JobSpec, Mover, Performance } from "../types";

/** John’s move: Munich → Berlin in three weeks (demo scenario). */
export const defaultJobSpec: JobSpec = {
  specHash: "sha256:mf-muc-ber",
  originCity: "Munich",
  originStairs: 2,
  destCity: "Berlin",
  destStairs: 1,
  distanceMiles: 363,
  inventory: [
    { item: "King-size bed", qty: 1 },
    { item: "Mattress", qty: 1 },
    { item: "Wardrobe", qty: 2 },
    { item: "Desk", qty: 2 },
    { item: "Dining table", qty: 1 },
    { item: "Sofa", qty: 1 },
    { item: "Piano", qty: 1 },
    { item: "Fridge", qty: 1 },
    { item: "TV", qty: 1 },
    { item: "Coffee table", qty: 1 },
    { item: "Microwave", qty: 1 },
    { item: "Boxes", qty: 42 },
  ],
  longCarryFt: 40,
  dateWindow: ["2026-08-14", "2026-08-14"],
  services: ["loading", "transport", "unloading", "packing", "insurance"],
  notes: "New job in Berlin. Need elevator booking at destination. Piano requires special handling.",
};

export const seedMovers: Mover[] = [
  {
    id: "mov-a",
    companyName: "MoveFast",
    phone: "+49 30 000001",
    rating: 4.9,
    reviewCount: 312,
    source: "Google Places",
    status: "new",
    facts: [],
    calls: [],
    risks: [],
    neighborhood: "Berlin",
    mapX: 42,
    mapY: 48,
    accent: "linear-gradient(145deg,#1a6b62 0%,#d4e05c 100%)",
  },
  {
    id: "mov-b",
    companyName: "CityMove",
    phone: "+49 30 000002",
    rating: 4.6,
    reviewCount: 188,
    source: "Yelp",
    status: "new",
    facts: [],
    calls: [],
    risks: [],
    neighborhood: "Berlin",
    mapX: 58,
    mapY: 40,
    accent: "linear-gradient(145deg,#0d3f3a 0%,#5b8a84 55%,#e8d9a8 100%)",
  },
  {
    id: "mov-c",
    companyName: "Berlin Express",
    phone: "+49 30 000003",
    rating: 5.0,
    reviewCount: 96,
    source: "Google Places",
    status: "new",
    facts: [],
    calls: [],
    risks: [],
    neighborhood: "Berlin",
    mapX: 48,
    mapY: 68,
    accent: "linear-gradient(145deg,#0369a1 0%,#7dd3fc 55%,#fef3c7 100%)",
  },
  {
    id: "mov-d",
    companyName: "München Umzüge",
    phone: "+49 89 000004",
    rating: 4.4,
    reviewCount: 141,
    source: "Yelp",
    status: "new",
    facts: [],
    calls: [],
    risks: [],
    neighborhood: "Munich",
    mapX: 72,
    mapY: 52,
    accent: "linear-gradient(145deg,#3d2c29 0%,#8b5a3c 50%,#c4a574 100%)",
  },
];

export const marketPool: Mover[] = [
  {
    id: "mov-e",
    companyName: "Pack & Go DE",
    phone: "+49 30 000005",
    rating: 4.2,
    reviewCount: 74,
    source: "Google Places",
    status: "new",
    facts: [],
    calls: [],
    risks: [],
    neighborhood: "Berlin",
    mapX: 30,
    mapY: 35,
    accent: "linear-gradient(145deg,#14524b 0%,#2a9d8f 60%,#e9c46a 100%)",
  },
];

/** Room-grouped inventory for the Inventory dashboard. */
export const inventoryRooms: { room: string; items: string[] }[] = [
  { room: "Living Room", items: ["Sofa", "TV", "Coffee table", "Piano"] },
  { room: "Bedroom", items: ["King-size bed", "Mattress", "Wardrobe"] },
  { room: "Office", items: ["Desk", "Desk"] },
  { room: "Kitchen", items: ["Fridge", "Microwave", "Dining table"] },
  { room: "Packed", items: ["Boxes ×42"] },
];

export const moveTimeline: { date: string; label: string; done?: boolean }[] = [
  { date: "Today", label: "Inventory completed", done: true },
  { date: "Tomorrow", label: "Call movers" },
  { date: "Jul 20", label: "Receive quotes" },
  { date: "Jul 24", label: "Choose company" },
  { date: "Aug 10", label: "Begin packing" },
  { date: "Aug 14", label: "Moving day" },
  { date: "Aug 15", label: "Utilities activated" },
];

export const costBreakdown: { label: string; amountEur: number }[] = [
  { label: "Moving Company", amountEur: 780 },
  { label: "Boxes", amountEur: 110 },
  { label: "Cleaning", amountEur: 240 },
  { label: "Internet Setup", amountEur: 50 },
  { label: "Parking Permit", amountEur: 35 },
  { label: "Insurance", amountEur: 60 },
];

export const seedPerformance: Performance = {
  callsMade: 0,
  quotesGathered: 0,
  negotiations: 0,
  priceMoves: 0,
  lowballsCaught: 0,
  avgSavingsPct: 0,
  activity: [
    { id: "i0", t: "08:00", text: "Loaded Munich → Berlin move plan for John" },
    { id: "i1", t: "08:01", text: "Inventory estimated: ~18 m³ truck, 2–3 movers" },
  ],
};

export function inventorySummary(spec: JobSpec): string {
  const list = spec.inventory.map(i => `${i.qty}× ${i.item}`).join(", ");
  if (spec.inventorySource === "photo_survey" || spec.inventorySource === "mixed") {
    const n = spec.photoSurveyCount ?? 0;
    return `${list} [estimated from ${n} room photo${n === 1 ? "" : "s"}]`;
  }
  return list;
}

export function estimateFromInventory(spec: JobSpec) {
  const items = spec.inventory.reduce((n, i) => n + i.qty, 0);
  const boxes = spec.inventory.find(i => /box/i.test(i.item))?.qty ?? 30;
  const hasPiano = spec.inventory.some(i => /piano/i.test(i.item));
  const weightKg = Math.round(items * 28 + boxes * 12 + (hasPiano ? 220 : 0));
  const volumeM3 = Math.min(35, Math.round(8 + items * 0.55 + (hasPiano ? 2 : 0)));
  const moversNeeded = hasPiano || volumeM3 > 16 ? 3 : 2;
  const hours = Math.max(4, Math.round(volumeM3 / 3.5));
  const estCostEur = Math.round(420 + volumeM3 * 28 + spec.distanceMiles * 0.35 + (hasPiano ? 120 : 0));
  return { items, boxes, weightKg, volumeM3, moversNeeded, hours, estCostEur };
}

export function hashJobSpec(spec: Omit<JobSpec, "specHash">): string {
  const raw = JSON.stringify(spec);
  let h = 0;
  for (let i = 0; i < raw.length; i++) h = (Math.imul(31, h) + raw.charCodeAt(i)) | 0;
  return `sha256:${(h >>> 0).toString(16).padStart(8, "0")}`;
}

/** Score for ranking table (demo heuristic). */
export function moverScore(m: Mover): number | null {
  if (!m.quote || m.quote.comparability !== "valid") return null;
  const priceScore = Math.max(0, 100 - Math.abs(m.quote.vsMedianPct) * 1.2);
  const ratingScore = (m.rating / 5) * 100;
  const riskPenalty = m.risks.some(r => r.severity === "high") ? 12 : m.risks.length ? 5 : 0;
  return Math.round(priceScore * 0.45 + ratingScore * 0.55 - riskPenalty);
}

export function moverEtaHours(m: Mover): number {
  // Stable demo ETA from id hash
  const n = m.id.charCodeAt(m.id.length - 1) % 5;
  return 3 + n;
}
