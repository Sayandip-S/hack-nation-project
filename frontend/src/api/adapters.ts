import type { Call, DealRecommendation, JobSpec, Mover, Quote } from "../types";
import type {
  JobSpecificationDto,
  ProviderCallBatchCreateRequest,
  ProviderCallDto,
  ProviderCallStatus,
  ProviderCallUpdateRequest,
  ProviderDto,
  QuoteDto,
  RecommendationDto,
  SpecificationUpsertRequest,
  TranscriptSpeaker,
} from "./types";
import { normalizeDecimal } from "./types";

const MILES_TO_KM = 1.609344;

function hasService(services: string[], pattern: RegExp): boolean {
  return services.some(service => pattern.test(service));
}

function parseLongCarry(accessNotes: string | null | undefined): number {
  const match = accessNotes?.match(/long carry[^\d]*(\d+(?:\.\d+)?)\s*ft/i);
  return match ? Number(match[1]) : 0;
}

export function jobSpecToSpecificationRequest(spec: JobSpec): SpecificationUpsertRequest {
  return {
    origin_address: spec.originCity,
    destination_address: spec.destCity,
    move_date: spec.dateWindow[0] || null,
    origin_floor: spec.originStairs,
    destination_floor: spec.destStairs,
    distance_km: spec.distanceMiles * MILES_TO_KM,
    packing_required: hasService(spec.services, /pack/i),
    disassembly_required: hasService(spec.services, /disassembl/i),
    reassembly_required: hasService(spec.services, /reassembl/i),
    storage_required: hasService(spec.services, /storag/i),
    inventory: spec.inventory.map(item => ({
      name: item.item,
      quantity: item.qty,
      category: null,
      notes: null,
    })),
    special_items: [],
    access_notes: spec.longCarryFt > 0 ? `Long carry: ${spec.longCarryFt} ft` : null,
    additional_notes: spec.notes?.trim() || null,
  };
}

export function specificationToJobSpec(specification: JobSpecificationDto): JobSpec {
  const services = [
    "loading",
    "transport",
    "unloading",
    specification.packing_required && "packing",
    specification.disassembly_required && "disassembly",
    specification.reassembly_required && "reassembly",
    specification.storage_required && "storage",
  ].filter((service): service is string => Boolean(service));
  const moveDate = specification.move_date ?? "";

  return {
    specHash: `backend:${specification.id}:v${specification.version}`,
    originCity: specification.origin_address,
    originStairs: specification.origin_floor ?? 0,
    destCity: specification.destination_address,
    destStairs: specification.destination_floor ?? 0,
    distanceMiles: (specification.distance_km ?? 0) / MILES_TO_KM,
    inventory: [
      ...specification.inventory.map(item => ({ item: item.name, qty: item.quantity })),
      ...specification.special_items.map(item => ({ item: item.name, qty: item.quantity })),
    ],
    longCarryFt: parseLongCarry(specification.access_notes),
    dateWindow: [moveDate, moveDate],
    services,
    notes: specification.additional_notes ?? undefined,
    inventorySource: "manual",
  };
}

export function providerToMover(provider: ProviderDto): Mover {
  return {
    id: provider.id,
    companyName: provider.name,
    phone: provider.phone ?? "",
    rating: 0,
    reviewCount: 0,
    source: "The Negotiator API",
    status: "new",
    facts: [],
    calls: [],
    risks: [],
  };
}

function callStatusToUi(status: ProviderCallStatus): Call["status"] {
  if (status === "pending") return "queued";
  return status;
}

function transcriptSpeakerToUi(speaker: TranscriptSpeaker): "agent" | "counterpart" {
  return speaker === "agent" ? "agent" : "counterpart";
}

export function providerCallToCall(providerCall: ProviderCallDto): Call {
  return {
    id: providerCall.id,
    moverId: providerCall.provider_id,
    status: callStatusToUi(providerCall.status),
    terminalOutcome: providerCall.status === "completed" ? "answered_quote" : null,
    durationSec: providerCall.duration_seconds ?? undefined,
    summary: providerCall.summary ?? undefined,
    transcript: providerCall.transcript.map((turn, index) => ({
      id: `${providerCall.id}-turn-${turn.sequence ?? index}`,
      speaker: transcriptSpeakerToUi(turn.speaker),
      text: turn.text,
      t: turn.timestamp_seconds ?? 0,
    })),
    persona: "cooperative",
    quoteLines: [],
    recordingUrl: providerCall.recording_url ?? undefined,
    wave: 1,
  };
}

function callStatusToBackend(status: Call["status"]): ProviderCallStatus {
  if (status === "completed") return "completed";
  if (status === "failed" || status === "declined") return "failed";
  if (status === "in_progress" || status === "negotiating" || status === "dialing") {
    return "in_progress";
  }
  return "pending";
}

export function callToProviderCallUpdateRequest(call: Call): ProviderCallUpdateRequest {
  const recordingUrl = call.recordingUrl && /^https?:\/\//i.test(call.recordingUrl)
    ? call.recordingUrl
    : undefined;

  return {
    status: callStatusToBackend(call.status),
    duration_seconds: call.durationSec ?? null,
    transcript: call.transcript.map((turn, index) => ({
      speaker: turn.speaker === "counterpart" ? "provider" : "agent",
      text: turn.text,
      timestamp_seconds: turn.t,
      sequence: index,
    })),
    recording_url: recordingUrl,
    summary: call.summary ?? null,
  };
}

export function quoteDtoToQuote(quote: QuoteDto, marketMedianEur = 1850): Quote {
  const totalEur = normalizeDecimal(quote.total_amount);
  return {
    totalEur,
    lineItems: quote.items.map(item => ({
      key: item.id,
      label: item.description,
      amountEur: normalizeDecimal(item.total_price),
      factId: item.id,
    })),
    comparability: "valid",
    vsMedianPct: Math.round(((totalEur - marketMedianEur) / marketMedianEur) * 100),
    rationale: quote.terms ?? `Structured ${quote.currency} quote from ${quote.provider.name}.`,
  };
}

export function recommendationDtoToDealRecommendation(
  recommendation: RecommendationDto,
  provider?: Pick<ProviderDto, "id" | "name">,
  marketMedianEur = 1850,
): DealRecommendation {
  const finalPriceEur = normalizeDecimal(recommendation.final_price);
  return {
    moverId: recommendation.recommended_provider_id,
    title: provider?.id === recommendation.recommended_provider_id
      ? provider.name
      : recommendation.recommended_provider_id,
    finalPriceEur,
    vsMedian: finalPriceEur - marketMedianEur,
    savingsEur: normalizeDecimal(recommendation.total_savings),
    why: recommendation.rationale,
    evidence: [recommendation.summary],
    risksCalledOut: [],
  };
}

export function providerIdsToCallBatch(providerIds: string[]): ProviderCallBatchCreateRequest {
  const selected = [...new Set(providerIds)].slice(0, 3);
  if (selected.length !== 3) {
    throw new Error("A backend provider-call batch requires three distinct provider IDs.");
  }
  return { provider_ids: [selected[0]!, selected[1]!, selected[2]!] };
}
