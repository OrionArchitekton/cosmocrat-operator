import fallbackDefaults from './quarantineFallbackDefaults.json';

export interface OperatorPlaneQuarantineConfig {
  schema_version: string;
  mode: string;
  quarantine: {
    executors: {
      enabled: boolean;
    };
    mcp: {
      server_enabled: boolean;
    };
    chat: {
      command_bar_enabled: boolean;
    };
    automation: {
      auto_task_generation_enabled: boolean;
    };
  };
}

export const QUARANTINE_FALLBACK_CONFIG: OperatorPlaneQuarantineConfig = {
  schema_version: 'quarantine-config.v1',
  mode: String(fallbackDefaults.mode || 'operator-plane-v1'),
  quarantine: {
    executors: {
      enabled: Boolean(fallbackDefaults.executors?.enabled),
    },
    mcp: {
      server_enabled: Boolean(fallbackDefaults.mcp?.serverEnabled),
    },
    chat: {
      command_bar_enabled: Boolean(fallbackDefaults.chat?.commandBarEnabled),
    },
    automation: {
      auto_task_generation_enabled: Boolean(
        fallbackDefaults.automation?.autoTaskGenerationEnabled
      ),
    },
  },
};
