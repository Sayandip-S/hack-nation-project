import type { AgentProfileId, PhaseId, PersonaId } from "./config/vertical";

export type RiskLabel = "low" | "medium" | "high";
export type CallStatus =
  | "queued" | "dialing" | "in_progress" | "completed" | "failed" | "declined" | "negotiating";
export type TerminalOutcome =
  | "answered_quote" | "callback" | "declined" | "no_answer" | "negotiated" | null;

export interface Fact {
  id: string;
  key: string;
  label: string;
  value: string;
  sourceType: "transcript" | "listing" | "user" | "document";
  sourceRef: string;
  quote: string;
  confidence: number;
}

export interface RiskFlag {
  id: string;
  ruleId: string;
  severity: RiskLabel;
  explanation: string;
  evidenceFactId?: string;
}

export interface TranscriptTurn {
  id: string;
  speaker: "agent" | "counterpart";
  text: string;
  t: number;
  priceDeltaEur?: number;
}

export interface QuoteLineItem {
  key: string;
  label: string;
  amountEur: number;
  factId: string;
}

export interface Quote {
  totalEur: number;
  lineItems: QuoteLineItem[];
  comparability: "valid" | "invalid";
  invalidReason?: string;
  rank?: number;
  vsMedianPct: number;
  rationale: string;
}

export interface Call {
  id: string;
  moverId: string;
  status: CallStatus;
  terminalOutcome: TerminalOutcome;
  durationSec?: number;
  confidence?: number;
  summary?: string;
  transcript: TranscriptTurn[];
  persona: PersonaId;
  pitchDelivered?: string[];
  quoteLines: { id: string; label: string; amountEur: number; note?: string }[];
  quotedTotalEur?: number;
  negotiatedTotalEur?: number;
  recordingUrl?: string;
  wave: 1 | 2 | 3;
  initialQuoteEur?: number;
  finalQuoteEur?: number;
  citedQuoteId?: string;
  citedQuoteEur?: number;
}

export interface Mover {
  id: string;
  companyName: string;
  phone: string;
  rating: number;
  reviewCount: number;
  source?: string;
  status: "new" | "queued" | "called" | "quoted" | "negotiated" | "rejected";
  facts: Fact[];
  calls: Call[];
  quote?: Quote;
  risks: RiskFlag[];
  neighborhood?: string;
  mapX?: number;
  mapY?: number;
  accent?: string;
}

/** Frozen move — confirmed before any calls. */
export interface JobSpec {
  specHash: string;
  originCity: string;
  originStairs: number;
  destCity: string;
  destStairs: number;
  distanceMiles: number;
  inventory: { item: string; qty: number }[];
  longCarryFt: number;
  dateWindow: [string, string];
  services: string[];
  notes?: string;
  /** Set when inventory was estimated from room photos / camera. */
  inventorySource?: "manual" | "photo_survey" | "mixed";
  photoSurveyCount?: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface IntakeDocument {
  id: string;
  type: "photo" | "quote" | "bill" | "inventory";
  name: string;
  extractedNotes: string;
  uploadedAt: string;
}

/** Room photo used for vision-based inventory estimation. */
export interface InventoryPhoto {
  id: string;
  name: string;
  previewUrl: string;
  roomGuess: string;
  detectedItems: { item: string; qty: number; confidence: number }[];
  uploadedAt: string;
  source: "upload" | "camera";
}

export interface VoiceTurn {
  id: string;
  speaker: "agent" | "user";
  text: string;
}

export interface DealRecommendation {
  moverId: string;
  title: string;
  finalPriceEur: number;
  vsMedian: number;
  savingsEur: number;
  why: string;
  evidence: string[];
  risksCalledOut: string[];
}

export interface ActivityItem { id: string; t: string; text: string; }

export interface Performance {
  callsMade: number;
  quotesGathered: number;
  negotiations: number;
  priceMoves: number;
  lowballsCaught: number;
  avgSavingsPct: number;
  activity: ActivityItem[];
}

export type { AgentProfileId, PhaseId, PersonaId };
