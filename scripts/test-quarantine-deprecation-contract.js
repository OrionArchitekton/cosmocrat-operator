'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const repoRoot = path.resolve(__dirname, '..');
const fallbackPath = path.join(repoRoot, 'frontend', 'src', 'config', 'quarantineFallbackDefaults.json');
const quarantineTsPath = path.join(repoRoot, 'frontend', 'src', 'config', 'quarantine.ts');

test('fallback defaults remain fail-closed', () => {
  const defaults = JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));

  assert.equal(defaults.mode, 'operator-plane-v1');
  assert.equal(defaults.executors.enabled, false);
  assert.equal(defaults.executors.singleAttemptOnly, true);
  assert.equal(defaults.mcp.serverEnabled, false);
  assert.equal(defaults.mcp.clientEnabled, false);
  assert.equal(defaults.chat.commandBarEnabled, false);
  assert.equal(defaults.chat.followUpMessagesEnabled, false);
  assert.equal(defaults.chat.queuedScratchesEnabled, false);
  assert.equal(defaults.automation.autoTaskGenerationEnabled, false);
  assert.equal(defaults.automation.agentProfilesEnabled, false);
  assert.equal(defaults.automation.backgroundAgentsEnabled, false);
});

test('deprecated local source contract markers are present', () => {
  const content = fs.readFileSync(quarantineTsPath, 'utf8');

  assert.match(content, /quarantineFallbackDefaults\.json/);
  assert.match(content, /QUARANTINE_LOCAL_SOURCE_DEPRECATED\s*=\s*true/);
  assert.match(content, /VITE_QUARANTINE_LOCAL_SOURCE/);
});
