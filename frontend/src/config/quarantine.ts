/**
 * Operator Plane Quarantine Configuration
 * 
 * This module controls which features are enabled/disabled in the UI.
 * All autonomous agent features are disabled for v1.
 * 
 * INVARIANT: Changes here must match quarantine_config.json and
 * the server-side quarantine middleware.
 */

export interface QuarantineConfig {
  mode: 'operator-plane-v1' | 'vibe-kanban-full';
  executors: {
    enabled: boolean;
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
 * Operator Plane v1 Quarantine Configuration
 * 
 * LOCKED: Do not modify without Chronicle approval
 */
export const QUARANTINE_CONFIG: QuarantineConfig = {
  mode: 'operator-plane-v1',
  
  executors: {
    enabled: false,  // All direct executors disabled
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
    serverEnabled: false,  // MCP server disabled
    clientEnabled: false,  // MCP client disabled
  },
  
  chat: {
    commandBarEnabled: false,      // No chat command bar
    followUpMessagesEnabled: false, // No follow-up messages
    queuedScratchesEnabled: false,  // No queued scratches
  },
  
  automation: {
    autoTaskGenerationEnabled: false, // No auto task generation
    agentProfilesEnabled: false,      // No agent profiles
    backgroundAgentsEnabled: false,   // No background agents
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
 * Log quarantine status (for debugging)
 */
export function logQuarantineStatus(): void {
  console.log('[Operator Plane] Quarantine Status:');
  console.log(`  Mode: ${QUARANTINE_CONFIG.mode}`);
  console.log(`  Executors: ${QUARANTINE_CONFIG.executors.enabled ? 'ENABLED' : 'DISABLED'}`);
  console.log(`  MCP: ${QUARANTINE_CONFIG.mcp.serverEnabled ? 'ENABLED' : 'DISABLED'}`);
  console.log(`  Chat: ${QUARANTINE_CONFIG.chat.commandBarEnabled ? 'ENABLED' : 'DISABLED'}`);
  console.log(`  Auto-generation: ${QUARANTINE_CONFIG.automation.autoTaskGenerationEnabled ? 'ENABLED' : 'DISABLED'}`);
}
