import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useQuarantineConfig } from '@/hooks/useQuarantineConfig';
import * as quarantineApi from '@/api/quarantineConfig';

function TestComponent() {
  const { loading, data } = useQuarantineConfig();

  if (loading) {
    return <div>loading</div>;
  }

  return <div>{data?.source || 'missing'}</div>;
}

describe('useQuarantineConfig', () => {
  it('loads and exposes the config source', async () => {
    vi.spyOn(quarantineApi, 'fetchQuarantineConfig').mockResolvedValue({
      source: 'remote',
      fetchedAt: Date.now(),
      config: {
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
      },
    });

    render(<TestComponent />);

    expect(screen.getByText('loading')).toBeInTheDocument();
    expect(await screen.findByText('remote')).toBeInTheDocument();
  });
});
