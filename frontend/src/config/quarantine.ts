import fallbackDefaults from './quarantineFallbackDefaults.json';

/**
 * Deprecated local quarantine config source.
 *
 * PR-15 deprecates this module as a source of truth. The authoritative source
 * is the operator-plane quarantine API. This file only exports fail-closed
 * defaults for safe fallback handling.
 *
 * To preview strict mode in CI/local builds, set:
 *   VITE_QUARANTINE_LOCAL_SOURCE=forbidden
 */

export interface QuarantineConfig {
  mode: 'operator-plane-v1' | 'operator-plane-v1.1' | 'vibe-kanban-full';
  executors: {
    enabled: boolean;
    singleAttemptOnly: boolean;
    disabledAgents: string[];
  };
  mcp: {
    serverEnabled: boolean;
    clientEnabled: boolean;
  };
  chat: {
    commandBarEnabled: boolean;
    followUpMessagesEnabled: boolean;
    queuedScratchesEnabled: boolean;
  };
  automation: {
    autoTaskGenerationEnabled: boolean;
    agentProfilesEnabled: boolean;
    backgroundAgentsEnabled: boolean;
  };
}

type LocalSourceMode = 'alert' | 'forbidden';

const LOCAL_SOURCE_ENV_KEY = 'VITE_QUARANTINE_LOCAL_SOURCE';
const DEPRECATION_MESSAGE =
  '[PR-15] frontend/src/config/quarantine.ts is deprecated. Use operator-plane API config as source of truth.';

function resolveLocalSourceMode(raw: string | undefined): LocalSourceMode {
  return String(raw || '').trim().toLowerCase() === 'forbidden' ? 'forbidden' : 'alert';
}

const LOCAL_SOURCE_MODE = resolveLocalSourceMode(import.meta.env[LOCAL_SOURCE_ENV_KEY]);
let hasWarned = false;

function reportDeprecatedLocalSourceUsage(): void {
  if (LOCAL_SOURCE_MODE === 'forbidden') {
    throw new Error(`${DEPRECATION_MESSAGE} Local source mode is forbidden.`);
  }
  if (!hasWarned && typeof console !== 'undefined' && typeof console.warn === 'function') {
    console.warn(DEPRECATION_MESSAGE);
    hasWarned = true;
  }
}

reportDeprecatedLocalSourceUsage();

export const QUARANTINE_LOCAL_SOURCE_DEPRECATED = true;

export const QUARANTINE_CONFIG: QuarantineConfig = fallbackDefaults as QuarantineConfig;

export function isQuarantined(feature: keyof QuarantineConfig): boolean {
  const config = QUARANTINE_CONFIG[feature];
  if (typeof config === 'object' && config !== null && 'enabled' in config) {
    return !config.enabled;
  }
  return false;
}

export function isAgentDisabled(agentId: string): boolean {
  return QUARANTINE_CONFIG.executors.disabledAgents.includes(agentId);
}

export function isChatDisabled(): boolean {
  return !QUARANTINE_CONFIG.chat.commandBarEnabled;
}

export function isMcpDisabled(): boolean {
  return !QUARANTINE_CONFIG.mcp.serverEnabled && !QUARANTINE_CONFIG.mcp.clientEnabled;
}

export function getMode(): string {
  return QUARANTINE_CONFIG.mode;
}

export function isSingleAttemptOnly(): boolean {
  return QUARANTINE_CONFIG.executors.singleAttemptOnly;
}

export function isExecutorEnabled(): boolean {
  return QUARANTINE_CONFIG.executors.enabled;
}

export function isFollowUpEnabled(): boolean {
  return QUARANTINE_CONFIG.chat.followUpMessagesEnabled;
}

export function isAgentProfilesEnabled(): boolean {
  return QUARANTINE_CONFIG.automation.agentProfilesEnabled;
}

export function logQuarantineStatus(): void {
  console.log('[Operator Plane] Deprecated local quarantine fallback status:');
  console.log(`  Mode: ${QUARANTINE_CONFIG.mode}`);
  console.log(`  Executors: ${QUARANTINE_CONFIG.executors.enabled ? 'ENABLED' : 'DISABLED'}`);
  console.log(`  Single Attempt Only: ${QUARANTINE_CONFIG.executors.singleAttemptOnly ? 'YES' : 'NO'}`);
  console.log(`  MCP: ${QUARANTINE_CONFIG.mcp.serverEnabled ? 'ENABLED' : 'DISABLED'}`);
  console.log(`  Chat: ${QUARANTINE_CONFIG.chat.commandBarEnabled ? 'ENABLED' : 'DISABLED'}`);
  console.log(`  Follow-ups: ${QUARANTINE_CONFIG.chat.followUpMessagesEnabled ? 'ENABLED' : 'DISABLED'}`);
  console.log(`  Agent Profiles: ${QUARANTINE_CONFIG.automation.agentProfilesEnabled ? 'ENABLED' : 'DISABLED'}`);
}
