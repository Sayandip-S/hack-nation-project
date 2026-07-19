export type DecimalValue = string | number;

export type JobStatus =
  | "draft"
  | "intake_received"
  | "specification_ready"
  | "specification_confirmed"
  | "calls_in_progress"
  | "quotes_received"
  | "negotiation_complete"
  | "recommendation_ready"
  | "completed"
  | "failed";

export type IntakeType = "text" | "document" | "voice";
export type SpecificationStatus = "draft" | "confirmed";
export type ProviderCallStatus = "pending" | "in_progress" | "completed" | "failed";
export type TranscriptSpeaker = "agent" | "provider" | "system" | "unknown";
export type QuoteExtractionSource = "manual" | "elevenlabs_analysis" | "transcript_parser";
export type NegotiationLeverageType =
  | "competing_quote"
  | "flexible_date"
  | "reduced_scope"
  | "bundled_services"
  | "other";
export type NegotiationOutcome =
  | "price_reduced"
  | "terms_improved"
  | "price_and_terms_improved"
  | "no_change"
  | "rejected"
  | "other";
export type RecommendationStatus = "draft" | "final";

export interface JobCreateRequest {
  title: string;
  service_type?: "residential_moving";
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
}

export interface JobDto {
  id: string;
  title: string;
  service_type: string;
  status: JobStatus;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface TextIntakeCreateRequest {
  text: string;
}

export interface VoiceReferenceCreateRequest {
  conversation_id?: string | null;
  transcript?: string | null;
}

export interface IntakeDto {
  id: string;
  job_id: string;
  sequence: number;
  intake_type: IntakeType;
  raw_text: string | null;
  original_filename: string | null;
  content_type: string | null;
  file_path: string | null;
  external_reference: string | null;
  created_at: string;
}

export interface InventoryItemDto {
  name: string;
  quantity: number;
  category: string | null;
  notes: string | null;
}

export interface SpecialItemDto {
  name: string;
  quantity: number;
  handling_notes: string | null;
}

export interface SpecificationUpsertRequest {
  origin_address: string;
  destination_address: string;
  move_date?: string | null;
  property_type?: string | null;
  origin_floor?: number | null;
  destination_floor?: number | null;
  origin_has_elevator?: boolean | null;
  destination_has_elevator?: boolean | null;
  bedrooms?: number | null;
  estimated_volume_m3?: number | null;
  distance_km?: number | null;
  packing_required?: boolean;
  disassembly_required?: boolean;
  reassembly_required?: boolean;
  storage_required?: boolean;
  inventory?: InventoryItemDto[];
  special_items?: SpecialItemDto[];
  access_notes?: string | null;
  additional_notes?: string | null;
}

export interface JobSpecificationDto {
  id: string;
  job_id: string;
  version: number;
  status: SpecificationStatus;
  origin_address: string;
  destination_address: string;
  move_date: string | null;
  property_type: string | null;
  origin_floor: number | null;
  destination_floor: number | null;
  origin_has_elevator: boolean | null;
  destination_has_elevator: boolean | null;
  bedrooms: number | null;
  estimated_volume_m3: number | null;
  distance_km: number | null;
  packing_required: boolean;
  disassembly_required: boolean;
  reassembly_required: boolean;
  storage_required: boolean;
  inventory: InventoryItemDto[];
  special_items: SpecialItemDto[];
  access_notes: string | null;
  additional_notes: string | null;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProviderCreateRequest {
  name: string;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
}

export interface ProviderSummaryDto {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  website: string | null;
}

export interface ProviderDto extends ProviderSummaryDto {
  created_at: string;
  updated_at: string;
}

export interface TranscriptTurnDto {
  speaker: TranscriptSpeaker;
  text: string;
  timestamp_seconds: number | null;
  sequence: number | null;
}

export interface ProviderCallBatchCreateRequest {
  provider_ids: [string, string, string];
}

export interface ProviderCallUpdateRequest {
  status?: ProviderCallStatus;
  external_call_id?: string | null;
  elevenlabs_conversation_id?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  duration_seconds?: number | null;
  transcript_text?: string | null;
  transcript?: TranscriptTurnDto[] | null;
  recording_url?: string | null;
  summary?: string | null;
  error_message?: string | null;
}

export interface ProviderCallDto {
  id: string;
  job_id: string;
  provider_id: string;
  status: ProviderCallStatus;
  external_call_id: string | null;
  elevenlabs_conversation_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
  transcript_text: string | null;
  transcript: TranscriptTurnDto[];
  recording_url: string | null;
  summary: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  provider: ProviderSummaryDto;
}

export interface QuoteItemCreateRequest {
  category: string;
  description: string;
  quantity: DecimalValue;
  unit?: string | null;
  unit_price: DecimalValue;
  total_price?: DecimalValue | null;
}

export interface QuoteCreateRequest {
  currency?: string;
  items: QuoteItemCreateRequest[];
  tax_amount?: DecimalValue;
  total_amount: DecimalValue;
  valid_until?: string | null;
  availability_confirmed?: boolean;
  estimated_duration_hours?: DecimalValue | null;
  inclusions?: string[];
  exclusions?: string[];
  terms?: string | null;
  extraction_source?: QuoteExtractionSource;
  extraction_confidence?: DecimalValue | null;
}

export interface QuoteItemDto {
  id: string;
  sequence: number;
  category: string;
  description: string;
  quantity: DecimalValue;
  unit: string | null;
  unit_price: DecimalValue;
  total_price: DecimalValue;
  created_at: string;
}

export interface QuoteSummaryDto {
  id: string;
  provider_id: string;
  currency: string;
  total_amount: DecimalValue;
}

export interface QuoteDto {
  id: string;
  job_id: string;
  provider_id: string;
  provider_call_id: string;
  currency: string;
  subtotal: DecimalValue;
  tax_amount: DecimalValue;
  total_amount: DecimalValue;
  valid_until: string | null;
  availability_confirmed: boolean;
  estimated_duration_hours: DecimalValue | null;
  inclusions: string[];
  exclusions: string[];
  terms: string | null;
  extraction_source: QuoteExtractionSource;
  extraction_confidence: DecimalValue | null;
  items: QuoteItemDto[];
  provider: ProviderSummaryDto;
  created_at: string;
  updated_at: string;
}

export interface NegotiationCreateRequest {
  leverage_type: NegotiationLeverageType;
  leverage_description: string;
  competing_quote_id?: string | null;
  before_total: DecimalValue;
  requested_total?: DecimalValue | null;
  after_total: DecimalValue;
  before_terms?: Record<string, unknown> | null;
  after_terms?: Record<string, unknown> | null;
  outcome: NegotiationOutcome;
}

export interface NegotiationDto {
  id: string;
  job_id: string;
  provider_id: string;
  provider_call_id: string;
  quote_id: string;
  leverage_type: NegotiationLeverageType;
  leverage_description: string;
  competing_quote_id: string | null;
  before_total: DecimalValue;
  requested_total: DecimalValue | null;
  after_total: DecimalValue;
  savings_amount: DecimalValue;
  savings_percentage: DecimalValue;
  before_terms: Record<string, unknown> | null;
  after_terms: Record<string, unknown> | null;
  outcome: NegotiationOutcome;
  provider: ProviderSummaryDto;
  quote: QuoteSummaryDto;
  competing_quote: QuoteSummaryDto | null;
  created_at: string;
  updated_at: string;
}

export interface ProviderRankingDto {
  id: string;
  job_id: string;
  provider_id: string;
  quote_id: string;
  rank: number;
  total_score: DecimalValue;
  price_score: DecimalValue;
  completeness_score: DecimalValue;
  availability_score: DecimalValue;
  negotiation_score: DecimalValue;
  confidence_score: DecimalValue;
  final_price: DecimalValue;
  reasons: string[];
  warnings: string[];
  created_at: string;
  updated_at: string;
}

export interface RecommendationDto {
  id: string;
  job_id: string;
  recommended_provider_id: string;
  recommended_quote_id: string;
  status: RecommendationStatus;
  summary: string;
  rationale: string;
  original_price: DecimalValue;
  final_price: DecimalValue;
  total_savings: DecimalValue;
  created_at: string;
  updated_at: string;
}

export interface TranscriptReferenceDto {
  provider_call_id: string;
  transcript_text: string | null;
  transcript: TranscriptTurnDto[];
}

export interface RecordingReferenceDto {
  provider_call_id: string;
  recording_url: string;
}

export interface JobWorkflowSummaryDto {
  current_status: JobStatus;
  intake_received: boolean;
  specification_confirmed: boolean;
  provider_call_count: number;
  completed_call_count: number;
  quote_count: number;
  all_three_quotes_received: boolean;
  negotiation_count: number;
  has_genuine_negotiation: boolean;
  ranking_ready: boolean;
  recommendation_ready: boolean;
  missing_steps: string[];
}

export interface JobDetailsDto {
  job: JobDto;
  intakes: IntakeDto[];
  specification: JobSpecificationDto | null;
  provider_calls: ProviderCallDto[];
  providers: ProviderDto[];
  transcripts: TranscriptReferenceDto[];
  recording_references: RecordingReferenceDto[];
  quotes: QuoteDto[];
  negotiations: NegotiationDto[];
  rankings: ProviderRankingDto[];
  recommendation: RecommendationDto | null;
  workflow_summary: JobWorkflowSummaryDto;
}

export function normalizeDecimal(value: DecimalValue): number {
  const normalized = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(normalized)) {
    throw new TypeError(`Invalid decimal value: ${String(value)}`);
  }
  return normalized;
}
