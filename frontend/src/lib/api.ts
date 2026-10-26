import type {
  ExecutionMode,
  ExplainRequest,
  ExplainResponse,
  HealthResponse,
  IntakeCompileRequest,
  IntakeCompileResponse,
  LumoChatRequest,
  LumoChatResponse,
  ResourcesQuery,
  ResourcesResponse,
  SimulateRequest,
  SimulateResponse,
  SimulationValidationIssue,
  SttProviderError,
  SttResponse,
  ProvidersHealthResponse,
} from "../types/lumo.js";
import {
  compileFinancialStoryDeterministic,
  explainFinancialTermDeterministic,
  getOfficialResourcesDeterministic,
  simulateFinancialScenariosDeterministic,
} from "./deterministicEngine.js";

export function getConfiguredApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  if (envUrl) return envUrl.replace(/\/+$/, "");
  if (import.meta.env.DEV) return "http://localhost:8000";
  throw new Error("VITE_API_BASE_URL must be configured for production builds.");
}

export class ApiClientError extends Error {
  public readonly status?: number;
  public readonly endpoint: string;
  public readonly validationIssues?: SimulationValidationIssue[];

  constructor(
    message: string,
    endpoint: string,
    status?: number,
    validationIssues?: SimulationValidationIssue[],
  ) {
    super(message);
    this.name = "ApiClientError";
    this.endpoint = endpoint;
    this.status = status;
    this.validationIssues = validationIssues;
  }
}

let currentTransportMode: ExecutionMode = "live";

export function getApiTransportMode(): ExecutionMode {
  return currentTransportMode;
}

export function setApiTransportMode(mode: ExecutionMode): void {
  currentTransportMode = mode;
}

async function requestJson<T>(
  path: string,
  options: RequestInit = {},
  baseUrl: string = getConfiguredApiBaseUrl(),
): Promise<T> {
  const url = `${baseUrl}${path}`;
  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Network request failed";
    throw new ApiClientError(
      `Could not reach backend API at ${url} (${detail}). Verify VITE_API_BASE_URL and backend availability.`,
      path,
    );
  }

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status} from ${path}`;
    let validationIssues: SimulationValidationIssue[] | undefined;
    try {
      const errBody = await response.json();
      if (errBody?.detail) {
        errorMessage =
          typeof errBody.detail === "string"
            ? errBody.detail
            : JSON.stringify(errBody.detail);
      }
      if (Array.isArray(errBody?.validation_issues)) {
        validationIssues = errBody.validation_issues;
      }
    } catch {
      // ignore non-JSON error body
    }
    throw new ApiClientError(errorMessage, path, response.status, validationIssues);
  }

  return (await response.json()) as T;
}

/**
 * GET /health
 */
export async function getHealth(options?: {
  mode?: ExecutionMode;
  baseUrl?: string;
}): Promise<HealthResponse> {
  if (options?.mode === "demo") {
    return { status: "ok", version: "1.0", mode: "demo" };
  }
  return requestJson<HealthResponse>("/health", { method: "GET" }, options?.baseUrl);
}

/**
 * POST /api/intake/compile
 */
export async function compileFinancialStory(
  payload: IntakeCompileRequest,
  options?: { mode?: ExecutionMode; baseUrl?: string },
): Promise<IntakeCompileResponse> {
  if (!payload.text || !payload.text.trim()) {
    throw new ApiClientError(
      "Please enter a financial description before compiling.",
      "/api/intake/compile",
      400,
    );
  }

  if (options?.mode === "demo") {
    return compileFinancialStoryDeterministic(payload);
  }

  return requestJson<IntakeCompileResponse>(
    "/api/intake/compile",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    options?.baseUrl,
  );
}

/**
 * POST /api/finance/simulate
 */
export async function simulateFinancialScenarios(
  payload: SimulateRequest,
  options?: { mode?: ExecutionMode; baseUrl?: string },
): Promise<SimulateResponse> {
  if (options?.mode === "demo") {
    try {
      return simulateFinancialScenariosDeterministic(payload);
    } catch (error) {
      const validationIssues = (error as Error & {
        validationIssues?: SimulationValidationIssue[];
      }).validationIssues;
      throw new ApiClientError(
        error instanceof Error ? error.message : "The simulation could not be completed.",
        "/api/finance/simulate",
        validationIssues ? 422 : undefined,
        validationIssues,
      );
    }
  }

  const twin = payload.twin;
  const apiTwin = {
    ...twin,
    profile: {
      ...twin.profile,
      cash_on_hand: twin.cash_on_hand,
      minimum_reserve: twin.minimum_reserve,
      forecast_days: twin.forecast_days,
    },
  };
  return requestJson<SimulateResponse>(
    "/api/finance/simulate",
    {
      method: "POST",
      body: JSON.stringify({ ...payload, twin: apiTwin }),
    },
    options?.baseUrl,
  );
}

/**
 * POST /api/explain
 */
export async function explainFinancialTerm(
  payload: ExplainRequest,
  options?: { mode?: ExecutionMode; baseUrl?: string },
): Promise<ExplainResponse> {
  if (options?.mode === "demo") {
    return explainFinancialTermDeterministic(payload);
  }

  const language = {
    "en-IN": "en",
    "hi-IN": "hi",
    "pa-IN": "pa",
  }[payload.language];
  const body = {
    term: payload.term_key,
    language,
    context: payload.context,
    audio: payload.include_audio,
  };
  const baseUrl = options?.baseUrl ?? getConfiguredApiBaseUrl();
  const url = `${baseUrl}/api/explain`;
  if (import.meta.env.DEV) {
    console.info("[LUMO Samjho] API request", JSON.stringify({ method: "POST", url, body }));
  }

  const response = await requestJson<{
    term_id: string | null;
    term: string | null;
    explanation: string;
    example?: string | null;
    language: string;
    audio_available: boolean;
    audio_base64: string | null;
    source: string;
  }>(
    "/api/explain",
    {
      method: "POST",
      body: JSON.stringify(body),
    },
    baseUrl,
  );
  return {
    language: payload.language,
    explanation: response.explanation,
    example: response.example ?? "",
    provider: response.source,
    audio: {
      status: response.audio_available
        ? "available"
        : payload.include_audio
          ? "unavailable"
          : "not_requested",
      mime_type: response.audio_available ? "audio/wav" : null,
      audio_base64: response.audio_base64,
    },
  };
}

export async function askLumo(
  payload: LumoChatRequest,
  options?: { mode?: ExecutionMode; baseUrl?: string },
): Promise<LumoChatResponse> {
  if (options?.mode === "demo") {
    const language = payload.language === "hi"
      ? "hi-IN"
      : payload.language === "pa"
        ? "pa-IN"
        : "en-IN";
    return {
      answer: `Local demo mode uses only the fictional profile and deterministic calculations shown in the dashboard. No Sarvam answer was generated${payload.occupation ? ` for the ${payload.occupation} profile` : ""}. Review the displayed assumptions; scheme entries remain unverified candidates, and this does not confirm eligibility, approval, or benefits.`,
      language: payload.language,
      mode: "demo_fallback",
      provider: "deterministic_demo",
      language_provider: "local",
      sources: [],
      scheme_candidates: getOfficialResourcesDeterministic({
        occupation: payload.occupation,
        language,
      }).items,
      disclaimer: "Fictional demo data only. Verify current scheme details with official providers.",
    };
  }
  return requestJson<LumoChatResponse>(
    "/api/v1/ask",
    { method: "POST", body: JSON.stringify(payload) },
    options?.baseUrl,
  );
}

export async function requestSpeech(
  text: string,
  language: "hi" | "pa" | "en",
  options?: { baseUrl?: string },
): Promise<{ audio: Blob; provider: string } | null> {
  const baseUrl = options?.baseUrl ?? getConfiguredApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/speech`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, language }),
  });
  if (!response.ok) {
    throw new ApiClientError(`HTTP ${response.status} from /api/speech`, "/api/speech", response.status);
  }
  if (!response.headers.get("content-type")?.startsWith("audio/")) {
    // The backend answered with an explicit unavailability payload, not audio.
    return null;
  }
  return { audio: await response.blob(), provider: response.headers.get("x-lumo-tts-provider") ?? "unknown" };
}

/**
 * POST /api/stt — upload recorded microphone audio for Sarvam Saaras transcription.
 * Throws on any provider failure; the caller must show the error rather than
 * pretend speech was recognised.
 */
export async function transcribeAudio(
  audio: Blob,
  language: string,
  options?: { baseUrl?: string },
): Promise<SttResponse> {
  const baseUrl = options?.baseUrl ?? getConfiguredApiBaseUrl();
  const form = new FormData();
  const suffix = audio.type.includes("mp4") ? "m4a" : audio.type.includes("ogg") ? "ogg" : "webm";
  form.append("file", audio, `capture.${suffix}`);
  form.append("language", language);

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/api/stt`, { method: "POST", body: form });
  } catch (err) {
    throw new ApiClientError(
      `Could not reach the speech service at ${baseUrl}/api/stt (${err instanceof Error ? err.message : "network error"}).`,
      "/api/stt",
    );
  }
  let payload: Partial<SttResponse> & Partial<SttProviderError> = {};
  try {
    payload = await response.json();
  } catch {
    throw new ApiClientError(`Speech recognition returned a non-JSON response (HTTP ${response.status}).`, "/api/stt", response.status);
  }
  if (!response.ok || !payload.transcript) {
    throw new ApiClientError(
      payload.message || `Speech recognition failed (HTTP ${response.status}).`,
      "/api/stt",
      response.status,
    );
  }
  return payload as SttResponse;
}

/**
 * GET /api/providers/health — independent Sarvam STT / LLM / TTS / BHASHINI status.
 */
export async function getProvidersHealth(options?: {
  baseUrl?: string;
}): Promise<ProvidersHealthResponse> {
  return requestJson<ProvidersHealthResponse>("/api/providers/health", { method: "GET" }, options?.baseUrl);
}

/**
 * GET /api/resources
 */
export async function getOfficialResources(
  query?: ResourcesQuery,
  options?: { mode?: ExecutionMode; baseUrl?: string },
): Promise<ResourcesResponse> {
  if (options?.mode === "demo") {
    return getOfficialResourcesDeterministic(query);
  }

  const params = new URLSearchParams();
  if (query?.occupation) params.set("occupation", query.occupation);
  if (query?.state) params.set("state", query.state);
  if (query?.language) params.set("language", query.language);
  const qs = params.toString() ? `?${params.toString()}` : "";

  return requestJson<ResourcesResponse>(
    `/api/resources${qs}`,
    { method: "GET" },
    options?.baseUrl,
  );
}
