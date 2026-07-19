import type {
  IntakeDto,
  JobCreateRequest,
  JobDetailsDto,
  JobDto,
  JobSpecificationDto,
  NegotiationCreateRequest,
  NegotiationDto,
  ProviderCallBatchCreateRequest,
  ProviderCallDto,
  ProviderCallUpdateRequest,
  ProviderCreateRequest,
  ProviderDto,
  ProviderRankingDto,
  QuoteCreateRequest,
  QuoteDto,
  RecommendationDto,
  SpecificationUpsertRequest,
  TextIntakeCreateRequest,
  VoiceReferenceCreateRequest,
} from "../api/types";

const DEFAULT_API_BASE_URL = "http://127.0.0.1:8000/api/v1";

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL
).replace(/\/+$/, "");

export interface FastApiValidationIssue {
  loc: Array<string | number>;
  msg: string;
  type: string;
  input?: unknown;
  ctx?: Record<string, unknown>;
}

export type ApiErrorKind = "not_found" | "conflict" | "validation" | "http" | "network";

export class ApiError extends Error {
  readonly status: number;
  readonly kind: ApiErrorKind;
  readonly detail: string | FastApiValidationIssue[] | unknown;
  readonly validationIssues: FastApiValidationIssue[];

  constructor(options: {
    message: string;
    status: number;
    kind: ApiErrorKind;
    detail?: unknown;
    validationIssues?: FastApiValidationIssue[];
    cause?: unknown;
  }) {
    super(options.message, { cause: options.cause });
    this.name = "ApiError";
    this.status = options.status;
    this.kind = options.kind;
    this.detail = options.detail;
    this.validationIssues = options.validationIssues ?? [];
  }
}

function apiUrl(path: string): string {
  return `${API_BASE_URL}/${path.replace(/^\/+/, "")}`;
}

async function readResponseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function validationIssues(detail: unknown): FastApiValidationIssue[] {
  if (!Array.isArray(detail)) return [];
  return detail.filter((issue): issue is FastApiValidationIssue => {
    if (!issue || typeof issue !== "object") return false;
    const candidate = issue as Partial<FastApiValidationIssue>;
    return Array.isArray(candidate.loc)
      && typeof candidate.msg === "string"
      && typeof candidate.type === "string";
  });
}

function errorMessage(status: number, detail: unknown): string {
  if (typeof detail === "string") return detail;
  const issues = validationIssues(detail);
  if (issues.length) return issues.map(issue => issue.msg).join("; ");
  if (status === 404) return "The requested resource was not found.";
  if (status === 409) return "The request conflicts with the current resource state.";
  if (status === 422) return "The request failed validation.";
  return `API request failed with status ${status}.`;
}

function toApiError(response: Response, body: unknown): ApiError {
  const detail = body && typeof body === "object" && "detail" in body
    ? (body as { detail: unknown }).detail
    : body;
  const kind: ApiErrorKind = response.status === 404
    ? "not_found"
    : response.status === 409
      ? "conflict"
      : response.status === 422
        ? "validation"
        : "http";
  const issues = response.status === 422 ? validationIssues(detail) : [];
  return new ApiError({
    message: errorMessage(response.status, detail),
    status: response.status,
    kind,
    detail,
    validationIssues: issues,
  });
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(apiUrl(path), init);
  } catch (cause) {
    throw new ApiError({
      message: "Unable to reach Corridoor AI API.",
      status: 0,
      kind: "network",
      cause,
    });
  }

  const body = await readResponseBody(response);
  if (!response.ok) throw toApiError(response, body);
  return body as T;
}

export function jsonRequest<TResponse, TBody = never>(
  path: string,
  options: Omit<RequestInit, "body" | "headers"> & { body?: TBody; headers?: HeadersInit } = {},
): Promise<TResponse> {
  const { body, headers, ...init } = options;
  return request<TResponse>(path, {
    ...init,
    headers: { Accept: "application/json", "Content-Type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function multipartRequest<TResponse>(
  path: string,
  formData: FormData,
  options: Omit<RequestInit, "body" | "headers"> & { headers?: HeadersInit } = {},
): Promise<TResponse> {
  const { headers, ...init } = options;
  return request<TResponse>(path, {
    ...init,
    headers: { Accept: "application/json", ...headers },
    body: formData,
  });
}

export const createJob = (payload: JobCreateRequest): Promise<JobDto> =>
  jsonRequest<JobDto, JobCreateRequest>("/jobs", { method: "POST", body: payload });

export const createTextIntake = (
  jobId: string,
  payload: TextIntakeCreateRequest,
): Promise<IntakeDto> => jsonRequest<IntakeDto, TextIntakeCreateRequest>(
  `/jobs/${jobId}/intakes/text`,
  { method: "POST", body: payload },
);

export function uploadDocument(jobId: string, file: File): Promise<IntakeDto> {
  const formData = new FormData();
  formData.append("file", file);
  return multipartRequest<IntakeDto>(`/jobs/${jobId}/intakes/upload`, formData, { method: "POST" });
}

export const createVoiceReference = (
  jobId: string,
  payload: VoiceReferenceCreateRequest,
): Promise<IntakeDto> => jsonRequest<IntakeDto, VoiceReferenceCreateRequest>(
  `/jobs/${jobId}/intakes/voice-reference`,
  { method: "POST", body: payload },
);

export const saveSpecification = (
  jobId: string,
  payload: SpecificationUpsertRequest,
): Promise<JobSpecificationDto> => jsonRequest<JobSpecificationDto, SpecificationUpsertRequest>(
  `/jobs/${jobId}/specification`,
  { method: "PUT", body: payload },
);

export const confirmSpecification = (jobId: string): Promise<JobSpecificationDto> =>
  jsonRequest<JobSpecificationDto>(`/jobs/${jobId}/specification/confirm`, { method: "POST" });

export const createProvider = (payload: ProviderCreateRequest): Promise<ProviderDto> =>
  jsonRequest<ProviderDto, ProviderCreateRequest>("/providers", { method: "POST", body: payload });

export const createProviderCallBatch = (
  jobId: string,
  payload: ProviderCallBatchCreateRequest,
): Promise<ProviderCallDto[]> => jsonRequest<ProviderCallDto[], ProviderCallBatchCreateRequest>(
  `/jobs/${jobId}/provider-calls/batch`,
  { method: "POST", body: payload },
);

export const updateProviderCall = (
  callId: string,
  payload: ProviderCallUpdateRequest,
): Promise<ProviderCallDto> => jsonRequest<ProviderCallDto, ProviderCallUpdateRequest>(
  `/provider-calls/${callId}`,
  { method: "PATCH", body: payload },
);

export const createQuote = (callId: string, payload: QuoteCreateRequest): Promise<QuoteDto> =>
  jsonRequest<QuoteDto, QuoteCreateRequest>(`/provider-calls/${callId}/quote`, { method: "POST", body: payload });

export const createNegotiation = (
  callId: string,
  payload: NegotiationCreateRequest,
): Promise<NegotiationDto> => jsonRequest<NegotiationDto, NegotiationCreateRequest>(
  `/provider-calls/${callId}/negotiations`,
  { method: "POST", body: payload },
);

export const rankProviders = (jobId: string): Promise<ProviderRankingDto[]> =>
  jsonRequest<ProviderRankingDto[]>(`/jobs/${jobId}/rank`, { method: "POST" });

export const generateRecommendation = (jobId: string): Promise<RecommendationDto> =>
  jsonRequest<RecommendationDto>(`/jobs/${jobId}/recommendation`, { method: "POST" });

export const getJobDetails = (jobId: string): Promise<JobDetailsDto> =>
  jsonRequest<JobDetailsDto>(`/jobs/${jobId}/details`, { method: "GET" });
