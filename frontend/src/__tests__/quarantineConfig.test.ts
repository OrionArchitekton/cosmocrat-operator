import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  clearQuarantineConfigCache,
  fetchQuarantineConfig,
} from '@/api/quarantineConfig';
import { QUARANTINE_FALLBACK_CONFIG } from '@/config/quarantineFallback';

const VALID_REMOTE_CONFIG = {
  schema_version: 'quarantine-config.v1',
  mode: 'operator-plane-v1',
  quarantine: {
    executors: {
      enabled: false,
    },
    mcp: {
      server_enabled: false,
    },
    chat: {
      command_bar_enabled: false,
    },
    automation: {
      auto_task_generation_enabled: false,
    },
  },
};

describe('fetchQuarantineConfig', () => {
  beforeEach(() => {
    clearQuarantineConfigCache();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('returns remote config when wrapper is valid', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        valid: true,
        source_path: '/operator-plane/ui/quarantine_config.json',
        config: VALID_REMOTE_CONFIG,
      }),
    }));

    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const result = await fetchQuarantineConfig({ endpoint: '/x' });

    expect(result.source).toBe('remote');
    expect(result.config).toEqual(VALID_REMOTE_CONFIG);
    expect(result.remoteMeta?.sourcePath).toBe(
      '/operator-plane/ui/quarantine_config.json'
    );
  });

  it('falls back on non-200 response', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: false,
      status: 503,
      json: async () => ({}),
    }));

    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const result = await fetchQuarantineConfig({ endpoint: '/x' });

    expect(result.source).toBe('fallback');
    expect(result.error).toBe('remote_http_503');
    expect(result.config).toEqual(QUARANTINE_FALLBACK_CONFIG);
  });

  it('falls back when wrapper reports invalid payload', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        valid: false,
        errors: ['forced-invalid'],
        config: VALID_REMOTE_CONFIG,
      }),
    }));

    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const result = await fetchQuarantineConfig({ endpoint: '/x' });

    expect(result.source).toBe('fallback');
    expect(result.error).toBe('remote_reported_invalid');
    expect(result.remoteMeta?.errors).toEqual(['forced-invalid']);
  });

  it('falls back when schema is invalid', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        valid: true,
        config: {
          mode: 'operator-plane-v1',
        },
      }),
    }));

    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const result = await fetchQuarantineConfig({ endpoint: '/x' });

    expect(result.source).toBe('fallback');
    expect(result.error).toBe('remote_invalid_schema');
  });

  it('falls back on timeout', async () => {
    const fetchMock = vi.fn((_input: string, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal as AbortSignal | undefined;
        signal?.addEventListener('abort', () => {
          reject(new DOMException('aborted', 'AbortError'));
        });
      });
    });

    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const result = await fetchQuarantineConfig({
      endpoint: '/x',
      timeoutMs: 1,
    });

    expect(result.source).toBe('fallback');
    expect(result.error).toBe('remote_timeout');
  });

  it('falls back on fetch failure', async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error('network-down');
    });

    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const result = await fetchQuarantineConfig({
      endpoint: '/x',
    });

    expect(result.source).toBe('fallback');
    expect(result.error).toBe('remote_fetch_failed');
  });

  it('uses cache unless forceRefresh is enabled', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        valid: true,
        config: VALID_REMOTE_CONFIG,
      }),
    }));

    vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

    const first = await fetchQuarantineConfig({ endpoint: '/x' });
    const second = await fetchQuarantineConfig({ endpoint: '/x' });
    const third = await fetchQuarantineConfig({
      endpoint: '/x',
      forceRefresh: true,
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(first.source).toBe('remote');
    expect(second.source).toBe('remote');
    expect(third.source).toBe('remote');
  });
});
