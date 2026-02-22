import {
  QUARANTINE_FALLBACK_CONFIG,
  type OperatorPlaneQuarantineConfig,
} from '@/config/quarantineFallback';

const API_BASE = (import.meta.env.VITE_OPERATOR_PLANE_API_URL || '/api').replace(
  /\/$/,
  ''
);

interface QuarantineConfigWrapperResponse {
  config?: unknown;
  valid?: unknown;
  source_path?: unknown;
  errors?: unknown;
}

export type QuarantineConfigResult = {
  config: OperatorPlaneQuarantineConfig;
  source: 'remote' | 'fallback';
  fetchedAt: number;
  error?: string;
  remoteMeta?: {
    sourcePath?: string;
    errors?: string[];
  };
};

let configCache: QuarantineConfigResult | null = null;
const ALLOWED_SCHEMA_VERSIONS = new Set(['quarantine-config.v1']);
const ALLOWED_MODES = new Set([
  'operator-plane-v1',
  'operator-plane-v1.1',
  'vibe-kanban-full',
]);

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isValidQuarantineConfig(
  value: unknown
): value is OperatorPlaneQuarantineConfig {
  if (!isObject(value)) {
    return false;
  }

  if (
    typeof value.schema_version !== 'string' ||
    !ALLOWED_SCHEMA_VERSIONS.has(value.schema_version)
  ) {
    return false;
  }

  if (typeof value.mode !== 'string' || !ALLOWED_MODES.has(value.mode)) {
    return false;
  }

  const quarantine = value.quarantine;
  if (!isObject(quarantine)) {
    return false;
  }

  const executors = quarantine.executors;
  const mcp = quarantine.mcp;
  const chat = quarantine.chat;
  const automation = quarantine.automation;

  if (!isObject(executors) || typeof executors.enabled !== 'boolean') {
    return false;
  }
  if (!isObject(mcp) || typeof mcp.server_enabled !== 'boolean') {
    return false;
  }
  if (!isObject(chat) || typeof chat.command_bar_enabled !== 'boolean') {
    return false;
  }
  if (
    !isObject(automation) ||
    typeof automation.auto_task_generation_enabled !== 'boolean'
  ) {
    return false;
  }

  return true;
}

function extractConfigCandidate(payload: unknown): {
  candidate: unknown;
  wrapperValid?: boolean;
  remoteMeta?: QuarantineConfigResult['remoteMeta'];
} {
  if (!isObject(payload)) {
    return { candidate: payload };
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'config')) {
    const response = payload as QuarantineConfigWrapperResponse;
    const remoteMeta: QuarantineConfigResult['remoteMeta'] = {};

    if (typeof response.source_path === 'string') {
      remoteMeta.sourcePath = response.source_path;
    }
    if (isStringArray(response.errors)) {
      remoteMeta.errors = response.errors;
    }

    return {
      candidate: response.config,
      wrapperValid:
        typeof response.valid === 'boolean' ? response.valid : undefined,
      remoteMeta,
    };
  }

  return { candidate: payload };
}

function buildFallbackResult(
  fetchedAt: number,
  error: string,
  remoteMeta?: QuarantineConfigResult['remoteMeta']
): QuarantineConfigResult {
  const result: QuarantineConfigResult = {
    config: QUARANTINE_FALLBACK_CONFIG,
    source: 'fallback',
    fetchedAt,
    error,
    remoteMeta,
  };
  configCache = result;
  return result;
}

export function clearQuarantineConfigCache(): void {
  configCache = null;
}

export async function fetchQuarantineConfig(opts?: {
  forceRefresh?: boolean;
  endpoint?: string;
  timeoutMs?: number;
}): Promise<QuarantineConfigResult> {
  const forceRefresh = Boolean(opts?.forceRefresh);
  if (configCache && !forceRefresh) {
    return configCache;
  }

  const endpoint = opts?.endpoint || `${API_BASE}/quarantine/config`;
  const timeoutMs = opts?.timeoutMs ?? 5000;
  const fetchedAt = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(endpoint, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) {
      return buildFallbackResult(fetchedAt, `remote_http_${response.status}`);
    }

    const payload = (await response.json()) as unknown;
    const { candidate, wrapperValid, remoteMeta } = extractConfigCandidate(payload);

    if (wrapperValid === false) {
      return buildFallbackResult(fetchedAt, 'remote_reported_invalid', remoteMeta);
    }

    if (!isValidQuarantineConfig(candidate)) {
      return buildFallbackResult(fetchedAt, 'remote_invalid_schema', remoteMeta);
    }

    const result: QuarantineConfigResult = {
      config: candidate,
      source: 'remote',
      fetchedAt,
      remoteMeta,
    };
    configCache = result;
    return result;
  } catch (error: unknown) {
    if (
      isObject(error) &&
      typeof error.name === 'string' &&
      error.name === 'AbortError'
    ) {
      return buildFallbackResult(fetchedAt, 'remote_timeout');
    }
    return buildFallbackResult(fetchedAt, 'remote_fetch_failed');
  }
}
