/**
 * Operator Plane Quarantine Configuration
 * 
 * This module controls which features are enabled/disabled in the UI.
 * All autonomous agent features are disabled for v1.
 * 
 * INVARIANT: Changes here must match quarantine_config.json and
 * the server-side quarantine middleware.
 * 
 * WAVE 1 ENABLEMENT (v1.1.0):
 * - Projects & Tasks Kanban UI: ENABLED
 * - Task Attempt Detail View: ENABLED
 * - Start Attempt (one-at-a-time): ENABLED
 * 
 * See PERMANENTLY_DISABLED.md for features that will never be enabled.
 */

export interface QuarantineConfig {
  mode: 'operator-plane-v1' | 'operator-plane-v1.1' | 'vibe-kanban-full';
  executors: {
    enabled: boolean;
    singleAttemptOnly: boolean;  // Wave 1: One attempt at a time
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

/**
 * Operator Plane v1.1 Quarantine Configuration
 * 
 * WAVE 1 ENABLED: Projects, Tasks, Attempt Detail, Start Attempt
 * 
 * All changes require Chronicle approval.
 */
export const QUARANTINE_CONFIG: QuarantineConfig = {
  mode: 'operator-plane-v1.1',
  
  executors: {
    /**
     * WAVE 1 ENABLED: Users can start attempts
     * 
     * - Projects & Tasks Kanban UI routes are accessible
     * - Task Attempt Detail View (logs, diffs) is viewable
     * - "Start New Attempt" action is available
     * 
     * INVARIANT: All execution flows through Chronicle gates G1-G6
     */
    enabled: true,
    
    /**
     * WAVE 1 CONSTRAINT: One active attempt at a time
     * 
     * This prevents background/parallel agent execution.
     * Second attempt is blocked until first completes.
     */
    singleAttemptOnly: true,
    
    /**
     * Disabled agents list (future: move to enterprise config)
     */
    disabledAgents: [
      'claude_code',
      'codex', 
      'cursor_agent',
      'copilot',
      'gemini',
      'droid',
      'amp',
      'opencode',
      'qwen_code',
    ],
  },
  
  mcp: {
    serverEnabled: false,  // MCP server disabled - Wave 2
    clientEnabled: false,  // MCP client disabled - Wave 2
  },
  
  chat: {
    commandBarEnabled: false,      // No chat command bar - Wave 2
    followUpMessagesEnabled: false, // No follow-up messages - Wave 2
    queuedScratchesEnabled: false,  // No queued scratches - Wave 2
  },
  
  automation: {
    autoTaskGenerationEnabled: false, // PERMANENTLY DISABLED
    agentProfilesEnabled: false,      // Agent profiles - Wave 2
    backgroundAgentsEnabled: false,   // PERMANENTLY DISABLED
  },
};

/**
 * Check if a feature is quarantined (disabled)
 */
export function isQuarantined(feature: keyof QuarantineConfig): boolean {
  const config = QUARANTINE_CONFIG[feature];
  if (typeof config === 'object' && 'enabled' in config) {
    return !config.enabled;
  }
  return false;
}

/**
 * Check if a specific agent is disabled
 */
export function isAgentDisabled(agentId: string): boolean {
  return QUARANTINE_CONFIG.executors.disabledAgents.includes(agentId);
}

/**
 * Check if chat features are disabled
 */
export function isChatDisabled(): boolean {
  return !QUARANTINE_CONFIG.chat.commandBarEnabled;
}

/**
 * Check if MCP is disabled
 */
export function isMcpDisabled(): boolean {
  return !QUARANTINE_CONFIG.mcp.serverEnabled && !QUARANTINE_CONFIG.mcp.clientEnabled;
}

/**
 * Get the current mode
 */
export function getMode(): string {
  return QUARANTINE_CONFIG.mode;
}

/**
 * WAVE 1: Check if single-attempt-only mode is enforced
 */
export function isSingleAttemptOnly(): boolean {
  return QUARANTINE_CONFIG.executors.singleAttemptOnly;
}

/**
 * WAVE 1: Check if executors are enabled (can start attempts)
 */
export function isExecutorEnabled(): boolean {
  return QUARANTINE_CONFIG.executors.enabled;
}

/**
 * Check if follow-up messages are enabled
 */
export function isFollowUpEnabled(): boolean {
  return QUARANTINE_CONFIG.chat.followUpMessagesEnabled;
}

/**
 * Check if agent profiles UI is enabled
 */
export function isAgentProfilesEnabled(): boolean {
  return QUARANTINE_CONFIG.automation.agentProfilesEnabled;
}

/**
 * Log quarantine status (for debugging)
 */
export function logQuarantineStatus(): void {
  console.log('[Operator Plane] Quarantine Status:');
  console.log(`  Mode: ${QUARANTINE_CONFIG.mode}`);
  console.log(`  Executors: ${QUARANTINE_CONFIG.executors.enabled ? 'ENABLED' : 'DISABLED'}`);
  console.log(`  Single Attempt Only: ${QUARANTINE_CONFIG.executors.singleAttemptOnly ? 'YES' : 'NO'}`);
  console.log(`  MCP: ${QUARANTINE_CONFIG.mcp.serverEnabled ? 'ENABLED' : 'DISABLED'}`);
  console.log(`  Chat: ${QUARANTINE_CONFIG.chat.commandBarEnabled ? 'ENABLED' : 'DISABLED'}`);
  console.log(`  Follow-ups: ${QUARANTINE_CONFIG.chat.followUpMessagesEnabled ? 'ENABLED' : 'DISABLED'}`);
  console.log(`  Agent Profiles: ${QUARANTINE_CONFIG.automation.agentProfilesEnabled ? 'ENABLED' : 'DISABLED'}`);
  console.log(`  Auto-generation: ${QUARANTINE_CONFIG.automation.autoTaskGenerationEnabled ? 'PERMANENTLY DISABLED' : 'DISABLED'}`);
  console.log(`  Background Agents: ${QUARANTINE_CONFIG.automation.backgroundAgentsEnabled ? 'ENABLED' : 'PERMANENTLY DISABLED'}`);
}
