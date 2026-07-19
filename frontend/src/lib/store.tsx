import React, { createContext, useContext, useReducer, useCallback, useEffect, useRef } from "react";
import {
  AgentProfileId, Call, DealRecommendation, Fact, IntakeDocument, InventoryPhoto, JobSpec,
  Mover, Performance, PhaseId, User, VoiceTurn,
} from "../types";
import { vertical } from "../config/vertical";
import {
  defaultJobSpec, hashJobSpec, inventorySummary, marketPool, seedMovers, seedPerformance,
} from "../mock/data";
import { DEMO_ACCOUNTS, AccountRecord, clearSession, loadSession, saveSession } from "../mock/auth";
import { buildQuote, detectMoverRisks, runCall } from "../mock/engine";
import { analyzeRoomPhoto, mergePhotoInventory } from "../mock/vision";
import {
  ApiError,
  confirmSpecification,
  createJob,
  createNegotiation,
  createProvider,
  createProviderCallBatch,
  createQuote,
  createTextIntake,
  generateRecommendation,
  getJobDetails,
  rankProviders,
  saveSpecification,
  updateProviderCall,
} from "./api";
import {
  callToProviderCallUpdateRequest,
  jobSpecToSpecificationRequest,
  providerCallToCall,
  providerIdsToCallBatch,
  providerToMover,
  quoteDtoToQuote,
  recommendationDtoToDealRecommendation,
  specificationToJobSpec,
} from "../api/adapters";
import { normalizeDecimal, type JobDetailsDto } from "../api/types";

const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === "true";
const ACTIVE_JOB_KEY = "corridoor.activeJobId";

interface State {
  welcomed: boolean;
  user: User | null;
  onboarded: boolean;
  jobSpec: JobSpec;
  movers: Mover[];
  perf: Performance;
  searching: boolean;
  savedIds: string[];
  lastSearchAt: string | null;
  phase: PhaseId;
  agentProfile: AgentProfileId;
  intakeDocs: IntakeDocument[];
  inventoryPhotos: InventoryPhoto[];
  voiceLog: VoiceTurn[];
  voiceStep: number;
  jobSpecReady: boolean;
  /** Learned behavioural lines from Home chat — appended to every call pitch. */
  callGuidelines: string[];
  recommendation: DealRecommendation | null;
  wavesRunning: boolean;
  analyzingPhotos: boolean;
  activeJobId: string | null;
  loading: boolean;
  backendError: string | null;
  providerIdMap: Record<string, string>;
  providerCallIdMap: Record<string, string>;
  quoteIdMap: Record<string, string>;
}

interface BackendHydration {
  jobSpec: JobSpec;
  jobSpecReady: boolean;
  movers: Mover[];
  recommendation: DealRecommendation | null;
  intakeDocs: IntakeDocument[];
  providerIdMap: Record<string, string>;
  providerCallIdMap: Record<string, string>;
  quoteIdMap: Record<string, string>;
  callGuidelines?: string[];
}

type Action =
  | { type: "DISMISS_WELCOME" }
  | { type: "SIGN_IN"; user: User; onboarded: boolean; jobSpec: JobSpec }
  | { type: "SIGN_UP"; user: User }
  | { type: "SIGN_OUT" }
  | { type: "COMPLETE_ONBOARDING"; jobSpec: JobSpec }
  | { type: "UPDATE_JOB_SPEC"; patch: Partial<JobSpec> }
  | { type: "UPSERT_CALL"; call: Partial<Call> & { id: string; moverId: string }; facts: Fact[] }
  | { type: "LOG_ACTIVITY"; text: string }
  | { type: "SET_SEARCHING"; searching: boolean }
  | { type: "ADD_MOVERS"; movers: Mover[] }
  | { type: "TOGGLE_SAVE"; id: string }
  | { type: "SET_PHASE"; phase: PhaseId }
  | { type: "SET_AGENT_PROFILE"; profile: AgentProfileId }
  | { type: "ADD_DOCUMENT"; doc: IntakeDocument }
  | { type: "ADD_INVENTORY_PHOTOS"; photos: InventoryPhoto[] }
  | { type: "SET_ANALYZING_PHOTOS"; analyzing: boolean }
  | { type: "ADD_VOICE_TURN"; turn: VoiceTurn }
  | { type: "SET_VOICE_STEP"; step: number }
  | { type: "SET_JOB_SPEC_READY"; ready: boolean }
  | { type: "SET_CALL_GUIDELINES"; guidelines: string[] }
  | { type: "SET_RECOMMENDATION"; rec: DealRecommendation | null }
  | { type: "SET_WAVES_RUNNING"; running: boolean }
  | { type: "SET_ACTIVE_JOB"; jobId: string | null }
  | { type: "SET_LOADING"; loading: boolean }
  | { type: "SET_BACKEND_ERROR"; error: string | null }
  | { type: "SET_BACKEND_MAPS"; providerIds?: Record<string, string>; callIds?: Record<string, string>; quoteIds?: Record<string, string> }
  | { type: "HYDRATE_BACKEND"; hydration: BackendHydration };

export type AuthResult =
  | { ok: true; onboarded: boolean }
  | { ok: false; error: string };

export type ResetResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

function withDerived(m: Mover): Mover {
  const quote = buildQuote(m);
  const risks = detectMoverRisks(m, quote);
  const status: Mover["status"] =
    m.calls.some(c => c.terminalOutcome === "negotiated") ? "negotiated"
      : m.calls.some(c => c.status === "completed") ? "quoted"
        : m.calls.length ? "called"
          : m.status;
  return { ...m, quote, risks, status };
}

function rankMovers(movers: Mover[]): Mover[] {
  const valid = movers
    .filter(m => m.quote?.comparability === "valid")
    .sort((a, b) => (a.quote!.totalEur) - (b.quote!.totalEur));
  const rankMap = new Map(valid.map((m, i) => [m.id, i + 1]));
  return movers.map(m =>
    m.quote
      ? { ...m, quote: { ...m.quote, rank: rankMap.get(m.id) } }
      : m,
  );
}

export function bestValidQuote(movers: Mover[]): { moverId: string; totalEur: number; callId: string } | null {
  const ranked = movers
    .filter(m => m.quote?.comparability === "valid" && m.quote.totalEur != null)
    .sort((a, b) => a.quote!.totalEur - b.quote!.totalEur);
  if (!ranked.length) return null;
  const top = ranked[0];
  const call = [...top.calls].reverse().find(c => c.status === "completed");
  if (!call || top.quote == null) return null;
  return { moverId: top.id, totalEur: top.quote.totalEur, callId: call.id };
}

export function buildRecommendation(movers: Mover[], jobSpec: JobSpec): DealRecommendation | null {
  const best = bestValidQuote(movers);
  if (!best) return null;
  const mover = movers.find(m => m.id === best.moverId)!;
  const call = [...mover.calls].reverse().find(c => c.status === "completed")!;
  const first = call.initialQuoteEur ?? best.totalEur;
  const savings = first - best.totalEur;
  return {
    moverId: mover.id,
    title: mover.companyName,
    finalPriceEur: best.totalEur,
    vsMedian: best.totalEur - vertical.marketMedianEur,
    savingsEur: Math.max(0, savings),
    why: `${mover.companyName} is the strongest close at €${best.totalEur} for ${jobSpec.originCity} → ${jobSpec.destCity}`
      + (savings > 0 ? ` after leverage dropped them €${savings} from €${first}.` : ".")
      + ` Spec ${jobSpec.specHash} was reused verbatim.`,
    evidence: [
      ...(call.quoteLines ?? []).map(q => `${q.label}: €${q.amountEur}`),
      call.summary ?? "",
      call.citedQuoteEur != null ? `Leveraged competing quote €${call.citedQuoteEur} (${call.citedQuoteId})` : "",
      call.recordingUrl ? `Recording: ${call.recordingUrl}` : "",
    ].filter(Boolean),
    risksCalledOut: mover.risks.map(r => r.explanation),
  };
}

function recomputePerf(movers: Mover[], activity: Performance["activity"]): Performance {
  const completed = movers.flatMap(m => m.calls.filter(c => c.status === "completed"));
  const quotesGathered = movers.filter(m => m.quote).length;
  const priceMoves = completed.filter(c =>
    c.initialQuoteEur != null && c.finalQuoteEur != null && c.finalQuoteEur < c.initialQuoteEur,
  ).length;
  const lowballsCaught = movers.filter(m => m.risks.some(r => r.ruleId === "below_market")).length;
  const savings = completed
    .filter(c => c.initialQuoteEur != null && c.finalQuoteEur != null && c.initialQuoteEur > 0)
    .map(c => ((c.initialQuoteEur! - c.finalQuoteEur!) / c.initialQuoteEur!) * 100);
  const avgSavingsPct = savings.length
    ? Math.round(savings.reduce((a, b) => a + b, 0) / savings.length)
    : 0;
  return {
    callsMade: completed.length,
    quotesGathered,
    negotiations: completed.filter(c => c.wave >= 2 || c.terminalOutcome === "negotiated").length,
    priceMoves,
    lowballsCaught,
    avgSavingsPct,
    activity,
  };
}

function hydrateBackendDetails(
  details: JobDetailsDto,
  currentMovers: Mover[],
  currentJobSpec: JobSpec,
): BackendHydration {
  const providerIdMap: Record<string, string> = {};
  const providerCallIdMap: Record<string, string> = {};
  const quoteIdMap: Record<string, string> = {};
  const providerToUiId = new Map<string, string>();

  const hydratedMovers = details.providers.map(provider => {
    const known = currentMovers.find(mover =>
      mover.companyName.localeCompare(provider.name, undefined, { sensitivity: "base" }) === 0
      || providerIdMap[mover.id] === provider.id,
    );
    const adapted = providerToMover(provider);
    const uiId = known?.id ?? adapted.id;
    providerIdMap[uiId] = provider.id;
    providerToUiId.set(provider.id, uiId);

    const providerCalls = details.provider_calls
      .filter(call => call.provider_id === provider.id)
      .map(call => ({ ...providerCallToCall(call), moverId: uiId }));
    const backendQuote = details.quotes.find(quote => quote.provider_id === provider.id);
    const ranking = details.rankings.find(row => row.provider_id === provider.id);
    const negotiation = [...details.negotiations]
      .reverse()
      .find(row => row.provider_id === provider.id);

    for (const call of providerCalls) providerCallIdMap[uiId] = call.id;
    if (backendQuote) {
      quoteIdMap[uiId] = backendQuote.id;
      quoteIdMap[backendQuote.provider_call_id] = backendQuote.id;
    }

    const calls = providerCalls.map(call => {
      if (!backendQuote || call.id !== backendQuote.provider_call_id) return call;
      const initial = normalizeDecimal(backendQuote.total_amount);
      const final = negotiation ? normalizeDecimal(negotiation.after_total) : initial;
      return {
        ...call,
        terminalOutcome: negotiation ? "negotiated" as const : call.terminalOutcome,
        quoteLines: backendQuote.items.map(item => ({
          id: item.id,
          label: item.description,
          amountEur: normalizeDecimal(item.total_price),
        })),
        quotedTotalEur: initial,
        initialQuoteEur: initial,
        finalQuoteEur: final,
        negotiatedTotalEur: negotiation ? final : undefined,
      };
    });

    const quote = backendQuote
      ? {
          ...quoteDtoToQuote(backendQuote, vertical.marketMedianEur),
          rank: ranking?.rank,
          totalEur: ranking ? normalizeDecimal(ranking.final_price) : normalizeDecimal(backendQuote.total_amount),
        }
      : undefined;

    return {
      ...(known ?? adapted),
      id: uiId,
      companyName: provider.name,
      phone: provider.phone ?? known?.phone ?? "",
      source: "Corridoor AI API",
      status: negotiation ? "negotiated" as const : quote ? "quoted" as const : calls.length ? "called" as const : "new" as const,
      calls,
      quote,
      facts: [],
      risks: [],
    };
  });

  const movers = hydratedMovers.length ? hydratedMovers : currentMovers;
  const backendRecommendation = details.recommendation;
  const recommendedProvider = backendRecommendation
    ? details.providers.find(provider => provider.id === backendRecommendation.recommended_provider_id)
    : undefined;
  const recommendation = backendRecommendation
    ? {
        ...recommendationDtoToDealRecommendation(
          backendRecommendation,
          recommendedProvider,
          vertical.marketMedianEur,
        ),
        moverId: providerToUiId.get(backendRecommendation.recommended_provider_id)
          ?? backendRecommendation.recommended_provider_id,
      }
    : null;

  const intakeDocs: IntakeDocument[] = details.intakes.map(intake => ({
    id: intake.id,
    type: intake.intake_type === "document" ? "inventory" : "quote",
    name: intake.original_filename ?? `${intake.intake_type} intake ${intake.sequence}`,
    extractedNotes: intake.raw_text ?? intake.external_reference ?? "Stored by Corridoor AI API",
    uploadedAt: intake.created_at,
  }));

  return {
    jobSpec: details.specification ? specificationToJobSpec(details.specification) : currentJobSpec,
    jobSpecReady: details.workflow_summary.specification_confirmed,
    movers,
    recommendation,
    intakeDocs,
    providerIdMap,
    providerCallIdMap,
    quoteIdMap,
  };
}

const now = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "DISMISS_WELCOME":
      return { ...state, welcomed: true };
    case "SIGN_IN":
      {
      const preserveBackend = !USE_MOCK_DATA && !!state.activeJobId;
      return {
        ...state,
        user: action.user,
        onboarded: action.onboarded,
        jobSpec: preserveBackend ? state.jobSpec : action.jobSpec,
        movers: preserveBackend ? state.movers : rankMovers(seedMovers.map(withDerived)),
        searching: false,
        savedIds: [],
        lastSearchAt: null,
        phase: "intake",
        agentProfile: "estimator",
        intakeDocs: preserveBackend ? state.intakeDocs : [],
        inventoryPhotos: [],
        voiceLog: [],
        voiceStep: 0,
        jobSpecReady: preserveBackend ? state.jobSpecReady : action.onboarded,
        callGuidelines: preserveBackend ? state.callGuidelines : [],
        recommendation: preserveBackend ? state.recommendation : null,
        wavesRunning: false,
        analyzingPhotos: false,
        perf: seedPerformance,
      };
      }
    case "SIGN_UP":
      return {
        ...state,
        user: action.user,
        onboarded: false,
        jobSpec: defaultJobSpec,
        movers: rankMovers(seedMovers.map(withDerived)),
        searching: false,
        savedIds: [],
        lastSearchAt: null,
        phase: "intake",
        agentProfile: "estimator",
        intakeDocs: [],
        inventoryPhotos: [],
        voiceLog: [],
        voiceStep: 0,
        jobSpecReady: false,
        callGuidelines: [],
        recommendation: null,
        wavesRunning: false,
        analyzingPhotos: false,
        perf: seedPerformance,
      };
    case "SIGN_OUT":
      return {
        welcomed: true,
        user: null,
        onboarded: false,
        jobSpec: defaultJobSpec,
        movers: rankMovers(seedMovers.map(withDerived)),
        perf: seedPerformance,
        searching: false,
        savedIds: [],
        lastSearchAt: null,
        phase: "intake",
        agentProfile: "estimator",
        intakeDocs: [],
        inventoryPhotos: [],
        voiceLog: [],
        voiceStep: 0,
        jobSpecReady: false,
        callGuidelines: [],
        recommendation: null,
        wavesRunning: false,
        analyzingPhotos: false,
        activeJobId: state.activeJobId,
        loading: state.loading,
        backendError: state.backendError,
        providerIdMap: state.providerIdMap,
        providerCallIdMap: state.providerCallIdMap,
        quoteIdMap: state.quoteIdMap,
      };
    case "COMPLETE_ONBOARDING":
      return {
        ...state,
        onboarded: true,
        jobSpec: action.jobSpec,
        jobSpecReady: true,
        phase: "intake",
        movers: rankMovers(seedMovers.map(withDerived)),
      };
    case "UPDATE_JOB_SPEC": {
      const merged = { ...state.jobSpec, ...action.patch };
      const { specHash: _, ...rest } = merged;
      const jobSpec = { ...merged, specHash: hashJobSpec(rest) };
      return { ...state, jobSpec };
    }
    case "UPSERT_CALL": {
      const movers = rankMovers(state.movers.map(m => {
        if (m.id !== action.call.moverId) return m;
        const existing = m.calls.find(c => c.id === action.call.id);
        const call = {
          ...(existing ?? emptyCall(action.call.id, m.id, action.call.wave ?? 1)),
          ...action.call,
        } as Call;
        const calls = existing ? m.calls.map(c => c.id === call.id ? call : c) : [...m.calls, call];
        const factMap = new Map(m.facts.map(f => [f.key, f]));
        action.facts.forEach(f => factMap.set(f.key, f));
        return withDerived({ ...m, calls, facts: [...factMap.values()] });
      }));
      const completed = action.call.status === "completed";
      let activity = state.perf.activity;
      if (completed) {
        activity = [{
          id: `act-${Date.now()}`,
          t: now(),
          text: `Wave ${action.call.wave} · ${action.call.terminalOutcome} · €${action.call.finalQuoteEur ?? action.call.initialQuoteEur}`,
        }, ...activity];
      }
      const perf = recomputePerf(movers, activity);
      const recommendation = buildRecommendation(movers, state.jobSpec);
      return { ...state, movers, perf, recommendation };
    }
    case "LOG_ACTIVITY":
      return {
        ...state,
        perf: {
          ...state.perf,
          activity: [{ id: `act-${Date.now()}`, t: now(), text: action.text }, ...state.perf.activity],
        },
      };
    case "SET_SEARCHING":
      return { ...state, searching: action.searching };
    case "ADD_MOVERS": {
      const existing = new Set(state.movers.map(m => m.id));
      const fresh = action.movers.filter(m => !existing.has(m.id)).map(withDerived);
      if (!fresh.length) return { ...state, searching: false, lastSearchAt: now() };
      return {
        ...state,
        searching: false,
        lastSearchAt: now(),
        movers: rankMovers([...state.movers, ...fresh]),
        perf: {
          ...state.perf,
          activity: [{
            id: `act-${Date.now()}`,
            t: now(),
            text: `Market scan found ${fresh.length} more mover${fresh.length === 1 ? "" : "s"}`,
          }, ...state.perf.activity],
        },
      };
    }
    case "TOGGLE_SAVE": {
      const has = state.savedIds.includes(action.id);
      return {
        ...state,
        savedIds: has ? state.savedIds.filter(id => id !== action.id) : [...state.savedIds, action.id],
      };
    }
    case "SET_PHASE": {
      const profile = vertical.agentProfiles.find(p => p.phase === action.phase)?.id ?? state.agentProfile;
      return { ...state, phase: action.phase, agentProfile: profile };
    }
    case "SET_AGENT_PROFILE": {
      const meta = vertical.agentProfiles.find(p => p.id === action.profile);
      return { ...state, agentProfile: action.profile, phase: meta?.phase ?? state.phase };
    }
    case "ADD_DOCUMENT":
      return { ...state, intakeDocs: [action.doc, ...state.intakeDocs] };
    case "ADD_INVENTORY_PHOTOS": {
      const inventoryPhotos = [...state.inventoryPhotos, ...action.photos];
      const inventory = mergePhotoInventory(state.jobSpec.inventory, action.photos);
      const source: JobSpec["inventorySource"] =
        state.jobSpec.inventorySource === "manual" || state.jobSpec.inventory.length
          ? "mixed"
          : "photo_survey";
      const merged = {
        ...state.jobSpec,
        inventory,
        inventorySource: source,
        photoSurveyCount: inventoryPhotos.length,
      };
      const { specHash: _h, ...rest } = merged;
      return {
        ...state,
        inventoryPhotos,
        jobSpec: { ...merged, specHash: hashJobSpec(rest) },
      };
    }
    case "SET_ANALYZING_PHOTOS":
      return { ...state, analyzingPhotos: action.analyzing };
    case "ADD_VOICE_TURN":
      return { ...state, voiceLog: [...state.voiceLog, action.turn] };
    case "SET_VOICE_STEP":
      return { ...state, voiceStep: action.step };
    case "SET_JOB_SPEC_READY":
      return { ...state, jobSpecReady: action.ready };
    case "SET_CALL_GUIDELINES":
      return { ...state, callGuidelines: action.guidelines };
    case "SET_RECOMMENDATION":
      return { ...state, recommendation: action.rec };
    case "SET_WAVES_RUNNING":
      return { ...state, wavesRunning: action.running };
    case "SET_ACTIVE_JOB":
      return action.jobId
        ? { ...state, activeJobId: action.jobId }
        : {
            ...state,
            activeJobId: null,
            providerIdMap: {},
            providerCallIdMap: {},
            quoteIdMap: {},
          };
    case "SET_LOADING":
      return { ...state, loading: action.loading };
    case "SET_BACKEND_ERROR":
      return { ...state, backendError: action.error };
    case "SET_BACKEND_MAPS":
      return {
        ...state,
        providerIdMap: action.providerIds ? { ...state.providerIdMap, ...action.providerIds } : state.providerIdMap,
        providerCallIdMap: action.callIds ? { ...state.providerCallIdMap, ...action.callIds } : state.providerCallIdMap,
        quoteIdMap: action.quoteIds ? { ...state.quoteIdMap, ...action.quoteIds } : state.quoteIdMap,
      };
    case "HYDRATE_BACKEND": {
      const hydration = action.hydration;
      const perf = recomputePerf(hydration.movers, state.perf.activity);
      const { callGuidelines: hydratedGuidelines, ...rest } = hydration;
      return {
        ...state,
        ...rest,
        callGuidelines: hydratedGuidelines ?? state.callGuidelines,
        perf,
        backendError: null,
      };
    }
    default:
      return state;
  }
}

const emptyCall = (id: string, moverId: string, wave: 1 | 2 | 3): Call => ({
  id, moverId, status: "queued", terminalOutcome: null, transcript: [],
  persona: "cooperative", quoteLines: [], wave,
});

interface Ctx extends State {
  dismissWelcome: () => void;
  signIn: (email: string, password: string, keepLoggedIn?: boolean) => AuthResult;
  signUp: (name: string, email: string, password: string) => AuthResult;
  signOut: () => void;
  requestPasswordReset: (email: string) => ResetResult;
  resetPassword: (email: string, newPassword: string) => ResetResult;
  completeOnboarding: (jobSpec: JobSpec) => void;
  updateJobSpec: (patch: Partial<JobSpec>) => void;
  callMover: (id: string, wave?: 1 | 2 | 3, cited?: { totalEur: number; callId: string } | null) => void;
  runWaves: () => void;
  runMarketSearch: () => void;
  toggleSave: (id: string) => void;
  setPhase: (phase: PhaseId) => void;
  setAgentProfile: (profile: AgentProfileId) => void;
  addDocument: (type: IntakeDocument["type"], name: string) => void;
  advanceVoiceInterview: (answer: string) => void;
  finalizeIntake: () => void;
  setCallGuidelines: (guidelines: string[]) => void;
  negotiateMover: (moverId: string) => void;
  refreshRecommendation: () => void;
  ingestInventoryMedia: (files: FileList | File[], source: "upload" | "camera") => Promise<void>;
}

const StoreContext = createContext<Ctx | null>(null);

function backendErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return error instanceof Error ? error.message : "Unexpected backend error.";
  }
  if (error.kind === "network") return "Cannot reach Corridoor AI API. Check that the backend is running.";
  if (error.kind === "validation" && error.validationIssues.length) {
    return error.validationIssues
      .map(issue => `${issue.loc.join(".")}: ${issue.msg}`)
      .join("; ");
  }
  if (error.kind === "not_found") return `Backend resource not found: ${error.message}`;
  if (error.kind === "conflict") return `Backend workflow conflict: ${error.message}`;
  return error.message;
}

function apiPhone(phone: string): string | null {
  const normalized = phone.trim().startsWith("+")
    ? `+${phone.replace(/\D/g, "")}`
    : phone.replace(/\D/g, "");
  return /^\+[1-9]\d{7,14}$/.test(normalized) ? normalized : null;
}

function intakeText(spec: JobSpec): string {
  return [
    `Residential move from ${spec.originCity} to ${spec.destCity}.`,
    `Origin stairs: ${spec.originStairs}; destination stairs: ${spec.destStairs}.`,
    `Distance: ${spec.distanceMiles} miles; long carry: ${spec.longCarryFt} ft.`,
    `Move window: ${spec.dateWindow[0]} to ${spec.dateWindow[1]}.`,
    `Services: ${spec.services.join(", ")}.`,
    `Inventory: ${inventorySummary(spec)}.`,
    spec.notes ?? "",
  ].filter(Boolean).join(" ");
}

function buildInitialState(_accounts: AccountRecord[]): State {
  const session = loadSession();
  const account = session
    ? DEMO_ACCOUNTS.find(a => a.user.email.toLowerCase() === session.email.toLowerCase())
    : null;
  if (session && !account) clearSession();
  const activeJobId = USE_MOCK_DATA ? null : localStorage.getItem(ACTIVE_JOB_KEY);

  return {
    welcomed: !!account,
    user: account?.user ?? null,
    onboarded: account?.onboarded ?? false,
    jobSpec: account?.jobSpec ?? defaultJobSpec,
    movers: rankMovers(seedMovers.map(withDerived)),
    perf: seedPerformance,
    searching: false,
    savedIds: [],
    lastSearchAt: null,
    phase: "intake",
    agentProfile: "estimator",
    intakeDocs: [],
    inventoryPhotos: [],
    voiceLog: [],
    voiceStep: 0,
    jobSpecReady: account?.onboarded ?? false,
    callGuidelines: [],
    recommendation: null,
    wavesRunning: false,
    analyzingPhotos: false,
    activeJobId,
    loading: false,
    backendError: null,
    providerIdMap: {},
    providerCallIdMap: {},
    quoteIdMap: {},
  };
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const accountsRef = useRef<AccountRecord[]>(
    DEMO_ACCOUNTS.map(a => ({ ...a, user: { ...a.user }, jobSpec: { ...a.jobSpec } })),
  );
  const [state, dispatch] = useReducer(reducer, undefined, () => buildInitialState(accountsRef.current));
  const moversRef = useRef(state.movers);
  moversRef.current = state.movers;
  const stateRef = useRef(state);
  stateRef.current = state;
  const activeJobIdRef = useRef(state.activeJobId);
  activeJobIdRef.current = state.activeJobId;
  const providerIdMapRef = useRef(state.providerIdMap);
  providerIdMapRef.current = state.providerIdMap;
  const providerCallIdMapRef = useRef(state.providerCallIdMap);
  providerCallIdMapRef.current = state.providerCallIdMap;
  const quoteIdMapRef = useRef(state.quoteIdMap);
  quoteIdMapRef.current = state.quoteIdMap;
  const quoteTotalsRef = useRef<Record<string, number>>({});
  const inFlightRef = useRef(new Set<string>());
  const startupPromiseRef = useRef<Promise<void> | null>(null);
  const workflowPromiseRef = useRef<Promise<string | null> | null>(null);
  const intakeSubmittedRef = useRef(false);
  const specificationConfirmedRef = useRef(false);
  const negotiationCreatedRef = useRef(false);
  const negotiationInFlightRef = useRef(false);
  const wavesStartingRef = useRef(false);

  const runBackendOperation = useCallback(async function runBackendOperation<T>(
    key: string,
    operation: () => Promise<T>,
    onError?: (error: unknown) => boolean,
  ): Promise<T | null> {
    if (USE_MOCK_DATA || inFlightRef.current.has(key)) return null;
    inFlightRef.current.add(key);
    dispatch({ type: "SET_LOADING", loading: true });
    dispatch({ type: "SET_BACKEND_ERROR", error: null });
    try {
      return await operation();
    } catch (error) {
      const handled = onError?.(error) ?? false;
      if (!handled) dispatch({ type: "SET_BACKEND_ERROR", error: backendErrorMessage(error) });
      return null;
    } finally {
      inFlightRef.current.delete(key);
      dispatch({ type: "SET_LOADING", loading: inFlightRef.current.size > 0 });
    }
  }, []);

  const applyBackendDetails = useCallback((details: JobDetailsDto) => {
    const hydration = hydrateBackendDetails(details, moversRef.current, stateRef.current.jobSpec);
    providerIdMapRef.current = hydration.providerIdMap;
    providerCallIdMapRef.current = hydration.providerCallIdMap;
    quoteIdMapRef.current = hydration.quoteIdMap;
    quoteTotalsRef.current = {};
    for (const quote of details.quotes) {
      const uiId = Object.entries(hydration.providerIdMap)
        .find(([, providerId]) => providerId === quote.provider_id)?.[0];
      if (uiId) quoteTotalsRef.current[uiId] = normalizeDecimal(quote.total_amount);
    }
    intakeSubmittedRef.current = details.intakes.length > 0;
    specificationConfirmedRef.current = details.workflow_summary.specification_confirmed;
    negotiationCreatedRef.current = details.negotiations.length > 0;
    dispatch({ type: "HYDRATE_BACKEND", hydration });
  }, []);

  const loadBackendJob = useCallback(async (jobId: string, startup = false): Promise<void> => {
    await runBackendOperation(`load-job:${jobId}`, async () => {
      const details = await getJobDetails(jobId);
      applyBackendDetails(details);
    }, error => {
      if (startup && error instanceof ApiError && error.status === 404) {
        localStorage.removeItem(ACTIVE_JOB_KEY);
        activeJobIdRef.current = null;
        providerIdMapRef.current = {};
        providerCallIdMapRef.current = {};
        quoteIdMapRef.current = {};
        quoteTotalsRef.current = {};
        intakeSubmittedRef.current = false;
        specificationConfirmedRef.current = false;
        negotiationCreatedRef.current = false;
        dispatch({ type: "SET_ACTIVE_JOB", jobId: null });
        dispatch({ type: "SET_BACKEND_MAPS", providerIds: {}, callIds: {}, quoteIds: {} });
        dispatch({ type: "SET_BACKEND_ERROR", error: null });
        return true;
      }
      return false;
    });
  }, [applyBackendDetails, runBackendOperation]);

  const ensureBackendWorkflow = useCallback(async (spec: JobSpec): Promise<string | null> => {
    if (USE_MOCK_DATA) return null;
    if (startupPromiseRef.current) await startupPromiseRef.current;
    if (workflowPromiseRef.current) return workflowPromiseRef.current;

    const promise = runBackendOperation("prepare-backend-workflow", async () => {
      let jobId = activeJobIdRef.current;
      if (!jobId) {
        const user = stateRef.current.user;
        const job = await createJob({
          title: `${spec.originCity} to ${spec.destCity} move`,
          customer_name: user?.name ?? null,
          customer_email: user?.email ?? null,
        });
        jobId = job.id;
        activeJobIdRef.current = jobId;
        localStorage.setItem(ACTIVE_JOB_KEY, jobId);
        dispatch({ type: "SET_ACTIVE_JOB", jobId });
      }

      if (!intakeSubmittedRef.current) {
        await createTextIntake(jobId, { text: intakeText(spec) });
        intakeSubmittedRef.current = true;
      }

      if (!specificationConfirmedRef.current) {
        await saveSpecification(jobId, jobSpecToSpecificationRequest(spec));
        await confirmSpecification(jobId);
        specificationConfirmedRef.current = true;
        dispatch({ type: "SET_JOB_SPEC_READY", ready: true });
      }

      const selectedMovers = moversRef.current.slice(0, 3);
      if (selectedMovers.length !== 3) {
        throw new Error("Three movers are required before creating the backend call batch.");
      }

      const providerIds = { ...providerIdMapRef.current };
      for (const mover of selectedMovers) {
        if (providerIds[mover.id]) continue;
        const provider = await createProvider({
          name: mover.companyName,
          phone: apiPhone(mover.phone),
        });
        providerIds[mover.id] = provider.id;
        providerIdMapRef.current = { ...providerIds };
        dispatch({ type: "SET_BACKEND_MAPS", providerIds: { [mover.id]: provider.id } });
      }

      const existingCallIds = selectedMovers
        .map(mover => providerCallIdMapRef.current[mover.id])
        .filter((id): id is string => Boolean(id));
      if (existingCallIds.length !== 3) {
        const batch = await createProviderCallBatch(
          jobId,
          providerIdsToCallBatch(selectedMovers.map(mover => providerIds[mover.id]!)),
        );
        const callIds: Record<string, string> = {};
        for (const call of batch) {
          const uiMover = selectedMovers.find(mover => providerIds[mover.id] === call.provider_id);
          if (uiMover) callIds[uiMover.id] = call.id;
        }
        providerCallIdMapRef.current = { ...providerCallIdMapRef.current, ...callIds };
        dispatch({ type: "SET_BACKEND_MAPS", callIds });
      }

      return jobId;
    });
    workflowPromiseRef.current = promise;
    try {
      return await promise;
    } finally {
      if (workflowPromiseRef.current === promise) workflowPromiseRef.current = null;
    }
  }, [runBackendOperation]);

  useEffect(() => {
    if (USE_MOCK_DATA || !activeJobIdRef.current) return;
    const promise = loadBackendJob(activeJobIdRef.current, true);
    startupPromiseRef.current = promise;
    void promise.finally(() => {
      if (startupPromiseRef.current === promise) startupPromiseRef.current = null;
    });
  }, [loadBackendJob]);

  const signIn = useCallback((email: string, password: string, keepLoggedIn = false): AuthResult => {
    const account = accountsRef.current.find(a => a.user.email.toLowerCase() === email.toLowerCase());
    if (!account || account.password !== password) {
      return { ok: false, error: "Invalid email or password." };
    }
    dispatch({ type: "DISMISS_WELCOME" });
    dispatch({
      type: "SIGN_IN",
      user: account.user,
      onboarded: account.onboarded,
      jobSpec: account.jobSpec,
    });
    if (keepLoggedIn) saveSession(account.user.email);
    else clearSession();
    return { ok: true, onboarded: account.onboarded };
  }, []);

  const signUp = useCallback((name: string, email: string, password: string): AuthResult => {
    if (accountsRef.current.some(a => a.user.email.toLowerCase() === email.toLowerCase())) {
      return { ok: false, error: "An account with this email already exists. Sign in instead." };
    }
    if (password.length < 6) return { ok: false, error: "Password must be at least 6 characters." };
    const user: User = { id: `user-${Date.now()}`, name, email };
    accountsRef.current.push({ user, password, onboarded: false, jobSpec: defaultJobSpec });
    clearSession();
    dispatch({ type: "DISMISS_WELCOME" });
    dispatch({ type: "SIGN_UP", user });
    return { ok: true, onboarded: false };
  }, []);

  const signOut = useCallback(() => {
    clearSession();
    dispatch({ type: "SIGN_OUT" });
  }, []);

  const requestPasswordReset = useCallback((email: string): ResetResult => {
    const account = accountsRef.current.find(a => a.user.email.toLowerCase() === email.toLowerCase());
    if (!account) return { ok: false, error: "No account found with that email." };
    return {
      ok: true,
      message: `A reset link was sent to ${account.user.email}. Enter a new password below to continue.`,
    };
  }, []);

  const resetPassword = useCallback((email: string, newPassword: string): ResetResult => {
    const account = accountsRef.current.find(a => a.user.email.toLowerCase() === email.toLowerCase());
    if (!account) return { ok: false, error: "No account found with that email." };
    if (newPassword.length < 6) return { ok: false, error: "Password must be at least 6 characters." };
    account.password = newPassword;
    clearSession();
    return { ok: true, message: "Password updated. You can sign in with your new password." };
  }, []);

  const syncCompletedCall = useCallback((mover: Mover, call: Call) => {
    if (USE_MOCK_DATA || call.status !== "completed") return;
    const jobId = activeJobIdRef.current;
    const backendCallId = providerCallIdMapRef.current[mover.id];
    if (!jobId || !backendCallId) return;

    void runBackendOperation(`sync-call:${backendCallId}:wave-${call.wave}`, async () => {
      await updateProviderCall(backendCallId, callToProviderCallUpdateRequest(call));

      let targetQuoteId = quoteIdMapRef.current[mover.id];
      if (!targetQuoteId) {
        const sourceLines = call.quoteLines.length
          ? call.quoteLines
          : [{ id: `${call.id}-total`, label: "Moving service", amountEur: call.finalQuoteEur ?? call.initialQuoteEur ?? 1 }];
        const items = sourceLines.map(line => {
          const amount = Math.max(0, line.amountEur);
          return {
            category: line.label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "service",
            description: line.label,
            quantity: 1,
            unit: "service",
            unit_price: amount,
            total_price: amount,
          };
        });
        const totalAmount = items.reduce((sum, item) => sum + item.total_price, 0);
        if (totalAmount <= 0) throw new Error("A positive itemised quote total is required.");

        const quote = await createQuote(backendCallId, {
          currency: "EUR",
          items,
          tax_amount: 0,
          total_amount: totalAmount,
          availability_confirmed: call.terminalOutcome !== "declined",
          inclusions: call.pitchDelivered ?? [],
          exclusions: [],
          terms: call.summary ?? null,
          extraction_source: "transcript_parser",
          extraction_confidence: call.confidence ?? null,
        });
        targetQuoteId = quote.id;
        quoteTotalsRef.current[mover.id] = normalizeDecimal(quote.total_amount);
        quoteIdMapRef.current = {
          ...quoteIdMapRef.current,
          [mover.id]: quote.id,
          [call.id]: quote.id,
        };
        dispatch({
          type: "SET_BACKEND_MAPS",
          quoteIds: { [mover.id]: quote.id, [call.id]: quote.id },
        });
      }

      const competingQuoteId = call.citedQuoteId
        ? quoteIdMapRef.current[call.citedQuoteId]
        : undefined;
      const beforeTotal = quoteTotalsRef.current[mover.id];
      const afterTotal = call.finalQuoteEur;
      const canNegotiate = call.wave >= 2
        && !negotiationCreatedRef.current
        && !negotiationInFlightRef.current
        && !!targetQuoteId
        && !!competingQuoteId
        && competingQuoteId !== targetQuoteId
        && beforeTotal != null
        && afterTotal != null
        && afterTotal < beforeTotal;

      if (canNegotiate) {
        negotiationInFlightRef.current = true;
        try {
          await createNegotiation(backendCallId, {
            leverage_type: "competing_quote",
            leverage_description: `Used competing itemised quote ${competingQuoteId} during simulated wave ${call.wave}.`,
            competing_quote_id: competingQuoteId,
            before_total: beforeTotal,
            requested_total: call.citedQuoteEur ?? null,
            after_total: afterTotal,
            outcome: "price_reduced",
            before_terms: { source: "simulated_call", wave: 1 },
            after_terms: { source: "simulated_call", wave: call.wave },
          });
          negotiationCreatedRef.current = true;
          await rankProviders(jobId);
          await generateRecommendation(jobId);
          const details = await getJobDetails(jobId);
          applyBackendDetails(details);
        } finally {
          negotiationInFlightRef.current = false;
        }
      }
    });
  }, [applyBackendDetails, runBackendOperation]);

  const completeOnboarding = useCallback((jobSpec: JobSpec) => {
    dispatch({ type: "COMPLETE_ONBOARDING", jobSpec });
    const email = state.user?.email;
    if (email) {
      const account = accountsRef.current.find(a => a.user.email.toLowerCase() === email.toLowerCase());
      if (account) {
        account.onboarded = true;
        account.jobSpec = jobSpec;
      }
    }
    if (!USE_MOCK_DATA) void ensureBackendWorkflow(jobSpec);
  }, [ensureBackendWorkflow, state.user]);

  const callMover = useCallback((
    id: string,
    wave: 1 | 2 | 3 = 1,
    cited: { totalEur: number; callId: string } | null = null,
  ) => {
    const mover = moversRef.current.find(m => m.id === id);
    if (!mover) return;
    dispatch({ type: "SET_PHASE", phase: "calls" });
    dispatch({
      type: "LOG_ACTIVITY",
      text: `Wave ${wave}: calling ${mover.companyName}${cited ? ` (citing €${cited.totalEur})` : ""}…`,
    });
    runCall(
      mover,
      state.jobSpec,
      wave,
      cited?.totalEur ?? null,
      cited?.callId ?? null,
      (partial, facts) => {
        dispatch({ type: "UPSERT_CALL", call: partial, facts });
        if (partial.status === "completed") syncCompletedCall(mover, partial as Call);
      },
      state.callGuidelines,
    );
  }, [state.callGuidelines, state.jobSpec, syncCompletedCall]);

  const startWaves = useCallback(() => {
    if (state.wavesRunning) return;
    if (!state.jobSpecReady) {
      dispatch({
        type: "LOG_ACTIVITY",
        text: "Calls blocked — confirm the move brief in The Estimator first.",
      });
      return;
    }
    dispatch({ type: "SET_WAVES_RUNNING", running: true });
    dispatch({ type: "SET_AGENT_PROFILE", profile: "caller" });
    dispatch({ type: "LOG_ACTIVITY", text: `Wave 1: gathering quotes for spec ${state.jobSpec.specHash}` });

    const list = USE_MOCK_DATA ? moversRef.current : moversRef.current.slice(0, 3);
    const allowedIds = new Set(list.map(mover => mover.id));
    list.forEach((m, i) => {
      window.setTimeout(() => callMover(m.id, 1, null), i * 500);
    });

    // Wave 2 after wave 1 settles (~8s)
    window.setTimeout(() => {
      const best = bestValidQuote(moversRef.current);
      dispatch({
        type: "LOG_ACTIVITY",
        text: best
          ? `Wave 2: leveraging best valid quote €${best.totalEur}`
          : "Wave 2: no valid quote yet — skipping leverage",
      });
      dispatch({ type: "SET_AGENT_PROFILE", profile: "closer" });
      if (best) {
        const targets = moversRef.current.filter(m => allowedIds.has(m.id) && m.id !== best.moverId && m.quote);
        targets.forEach((m, i) => {
          window.setTimeout(() => callMover(m.id, 2, best), i * 600);
        });
        // also re-negotiate top cooperative with wave 2
        window.setTimeout(() => callMover(best.moverId, 2, best), targets.length * 600 + 200);
      }
    }, 9000);

    // Wave 3 close top 2
    window.setTimeout(() => {
      const best = bestValidQuote(moversRef.current);
      const top2 = moversRef.current
        .filter(m => allowedIds.has(m.id) && m.quote?.comparability === "valid")
        .sort((a, b) => a.quote!.totalEur - b.quote!.totalEur)
        .slice(0, 2);
      dispatch({ type: "LOG_ACTIVITY", text: "Wave 3: closing top 2 movers" });
      top2.forEach((m, i) => {
        window.setTimeout(
          () => callMover(m.id, 3, best ? { totalEur: best.totalEur, callId: best.callId } : null),
          i * 700,
        );
      });
      window.setTimeout(() => {
        dispatch({ type: "SET_WAVES_RUNNING", running: false });
        dispatch({
          type: "SET_RECOMMENDATION",
          rec: buildRecommendation(moversRef.current, state.jobSpec),
        });
        dispatch({
          type: "LOG_ACTIVITY",
          text: "Quote waves finished — open The Closer to negotiate and pick a deal.",
        });
      }, 8000);
    }, 18000);
  }, [state.wavesRunning, state.jobSpecReady, state.jobSpec, callMover]);

  const runWaves = useCallback(() => {
    if (state.wavesRunning || wavesStartingRef.current) return;
    if (!state.jobSpecReady) {
      dispatch({
        type: "LOG_ACTIVITY",
        text: "Calls blocked — confirm the move brief in The Estimator first.",
      });
      return;
    }
    if (USE_MOCK_DATA) {
      startWaves();
      return;
    }
    wavesStartingRef.current = true;
    void ensureBackendWorkflow(state.jobSpec).then(jobId => {
      if (jobId) startWaves();
    }).finally(() => {
      wavesStartingRef.current = false;
    });
  }, [ensureBackendWorkflow, startWaves, state.jobSpec, state.jobSpecReady, state.wavesRunning]);

  const runMarketSearch = useCallback(() => {
    if (state.searching) return;
    dispatch({ type: "SET_SEARCHING", searching: true });
    dispatch({ type: "LOG_ACTIVITY", text: "Scanning Google Places / Yelp for movers…" });
    const known = new Set(moversRef.current.map(m => m.id));
    const matches = marketPool.filter(m => !known.has(m.id));
    window.setTimeout(() => {
      dispatch({ type: "ADD_MOVERS", movers: matches });
      if (!matches.length) {
        dispatch({ type: "LOG_ACTIVITY", text: "Market scan finished — no new movers." });
      }
    }, 1400);
  }, [state.searching]);

  const toggleSave = useCallback((id: string) => {
    dispatch({ type: "TOGGLE_SAVE", id });
  }, []);

  const negotiateMover = useCallback((moverId: string) => {
    const best = bestValidQuote(moversRef.current);
    dispatch({ type: "SET_AGENT_PROFILE", profile: "closer" });
    callMover(moverId, 2, best);
  }, [callMover]);

  const ingestInventoryMedia = useCallback(async (files: FileList | File[], source: "upload" | "camera") => {
    const list = Array.from(files).filter(f => f.type.startsWith("image/"));
    if (!list.length) return;
    dispatch({ type: "SET_ANALYZING_PHOTOS", analyzing: true });
    // Simulate vision latency
    await new Promise(r => window.setTimeout(r, 900));
    const photos = list.map(file => analyzeRoomPhoto(file, URL.createObjectURL(file), source));
    dispatch({ type: "ADD_INVENTORY_PHOTOS", photos });
    const rooms = [...new Set(photos.map(p => p.roomGuess))].join(", ");
    const itemCount = photos.reduce((n, p) => n + p.detectedItems.reduce((a, i) => a + i.qty, 0), 0);
    dispatch({
      type: "LOG_ACTIVITY",
      text: `Photo survey: ${photos.length} image${photos.length === 1 ? "" : "s"} → ${rooms} (~${itemCount} items). Locked into mover pitch.`,
    });
    dispatch({ type: "SET_ANALYZING_PHOTOS", analyzing: false });
  }, []);

  const addDocument = useCallback((type: IntakeDocument["type"], name: string) => {
    const extracted: Record<IntakeDocument["type"], string> = {
      photo: "Photos show 2nd-floor walk-up; sofa + wardrobe visible.",
      quote: "Prior quote on file: €2,050 itemised — use as leverage floor.",
      bill: "Last move invoice: stair fee was billed separately.",
      inventory: "42 boxes, queen bed, 3-seat sofa, 2 wardrobes confirmed.",
    };
    dispatch({
      type: "ADD_DOCUMENT",
      doc: {
        id: `doc-${Date.now()}`,
        type,
        name,
        extractedNotes: extracted[type],
        uploadedAt: now(),
      },
    });
    if (type === "inventory") {
      dispatch({
        type: "UPDATE_JOB_SPEC",
        patch: {
          inventory: [
            { item: "Queen bed", qty: 1 },
            { item: "3-seat sofa", qty: 1 },
            { item: "Wardrobe", qty: 2 },
            { item: "Boxes", qty: 42 },
          ],
        },
      });
    }
    dispatch({ type: "LOG_ACTIVITY", text: `Intake: added ${type} — ${name}` });
  }, []);

  const advanceVoiceInterview = useCallback((answer: string) => {
    const step = vertical.voiceInterview[state.voiceStep];
    if (!step) return;
    dispatch({ type: "ADD_VOICE_TURN", turn: { id: `va-${Date.now()}`, speaker: "agent", text: step.q } });
    dispatch({ type: "ADD_VOICE_TURN", turn: { id: `vu-${Date.now()}`, speaker: "user", text: answer } });

    const key = step.mapsTo;
    const patch: Partial<JobSpec> = {};
    if (key === "originStairs" || key === "destStairs" || key === "distanceMiles" || key === "longCarryFt") {
      patch[key] = parseInt(answer.replace(/[^\d]/g, ""), 10) || (state.jobSpec[key] as number);
    } else if (key === "dateWindow") {
      const parts = answer.split(/\s+to\s+|\s*[-–]\s*/i).map(s => s.trim());
      patch.dateWindow = [parts[0] || state.jobSpec.dateWindow[0], parts[1] || state.jobSpec.dateWindow[1]];
    } else if (key === "originCity" || key === "destCity") {
      patch[key] = answer.trim();
    }
    dispatch({ type: "UPDATE_JOB_SPEC", patch });

    const next = state.voiceStep + 1;
    dispatch({ type: "SET_VOICE_STEP", step: next });
    if (next >= vertical.voiceInterview.length) {
      dispatch({ type: "LOG_ACTIVITY", text: "Voice intake complete — job spec updated." });
    }
  }, [state.voiceStep, state.jobSpec]);

  const finalizeIntake = useCallback(() => {
    dispatch({ type: "SET_JOB_SPEC_READY", ready: true });
    dispatch({
      type: "LOG_ACTIVITY",
      text: `Job spec locked (${state.jobSpec.specHash}). Same brief on every call. Open The Caller when ready.`,
    });
    if (!USE_MOCK_DATA) void ensureBackendWorkflow(state.jobSpec);
  }, [ensureBackendWorkflow, state.jobSpec]);

  const setCallGuidelines = useCallback((guidelines: string[]) => {
    dispatch({ type: "SET_CALL_GUIDELINES", guidelines });
  }, []);

  const refreshRecommendation = useCallback(() => {
    dispatch({ type: "SET_RECOMMENDATION", rec: buildRecommendation(moversRef.current, state.jobSpec) });
    const jobId = activeJobIdRef.current;
    if (!USE_MOCK_DATA && jobId && negotiationCreatedRef.current) {
      void runBackendOperation(`refresh-recommendation:${jobId}`, async () => {
        await rankProviders(jobId);
        await generateRecommendation(jobId);
        const details = await getJobDetails(jobId);
        applyBackendDetails(details);
      });
    }
  }, [applyBackendDetails, runBackendOperation, state.jobSpec]);

  return (
    <StoreContext.Provider value={{
      ...state,
      dismissWelcome: () => dispatch({ type: "DISMISS_WELCOME" }),
      signIn, signUp, signOut, requestPasswordReset, resetPassword,
      completeOnboarding,
      updateJobSpec: patch => dispatch({ type: "UPDATE_JOB_SPEC", patch }),
      callMover, runWaves, runMarketSearch, toggleSave,
      setPhase: phase => dispatch({ type: "SET_PHASE", phase }),
      setAgentProfile: profile => {
        dispatch({ type: "SET_AGENT_PROFILE", profile });
        const meta = vertical.agentProfiles.find(p => p.id === profile);
        dispatch({ type: "LOG_ACTIVITY", text: `Behavioural profile → ${meta?.title ?? profile}` });
      },
      addDocument, advanceVoiceInterview, finalizeIntake, setCallGuidelines,
      negotiateMover, refreshRecommendation,
      ingestInventoryMedia,
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export const useStore = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
};

export { inventorySummary };
