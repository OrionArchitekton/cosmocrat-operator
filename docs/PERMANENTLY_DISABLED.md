# Permanently Disabled Features

**Document Status:** LOCKED  
**Effective Date:** 2026-01-13  
**Last Updated:** 2026-01-13  
**Owner:** @orion

---

## Purpose

This document codifies UI features that are **permanently disabled** under the Code OS v1 contract. These features will never be enabled because they violate core safety invariants.

---

## The Code OS Contract

The Cosmocrat Operator Plane operates under these non-negotiable invariants:

1. **The UI cannot create or schedule work on its own**
2. **The UI cannot execute more powerfully because of a toggle**
3. **All execution flows through Chronicle and gates G1–G6**
4. **No background or unattended agent execution**
5. **Human-in-the-loop authority is preserved at all times**

---

## Permanently Disabled Features

### 1. Autonomous Task Generation by AI

**Feature:** "Turn plan into tasks" / AI-generated task creation

**Config Key:** `automation.autoTaskGenerationEnabled`

**Status:** ❌ **PERMANENTLY DISABLED**

**Why This Violates the Contract:**
- Allows AI to create new tasks without human oversight
- Violates "does not create or schedule work on its own" rule
- Represents AI planning and queuing work autonomously
- Task creation must be operator-driven

**Reference:** `quarantine.ts` line 68, `quarantine_config.json` permanently_disabled section

---

### 2. Background/Unattended Agents

**Feature:** Continuous loop mode, auto-approve, background execution

**Config Key:** `automation.backgroundAgentsEnabled`

**Status:** ❌ **PERMANENTLY DISABLED**

**Why This Violates the Contract:**
- Agent continues running without human intervention
- Multiple tasks run sequentially without approval
- Removes human from the loop entirely
- Grants AI prolonged, unsupervised execution time

**Reference:** `quarantine.ts` line 71, `quarantine_config.json` permanently_disabled section

---

### 3. Streaming Chat-First Execution

**Feature:** Fully chat-driven autonomous session where AI streams actions from a prompt

**Config Key:** N/A (never implemented)

**Status:** ❌ **PERMANENTLY DISABLED**

**Why This Violates the Contract:**
- AI proceeds to write code and merge in one conversational loop
- Bypasses stepwise gate approvals (G1–G6)
- No pause for human review between actions
- "Build this feature" → immediate autonomous execution is forbidden

**Reference:** `quarantine_config.json` permanently_disabled.streaming_chat_execution

---

## Comparison: What IS Allowed vs. What Is NOT

| Allowed (Wave 1+) | NOT Allowed (Ever) |
|-------------------|-------------------|
| Operator creates tasks manually | AI creates tasks autonomously |
| Operator starts attempts explicitly | Attempts start automatically |
| Single attempt at a time | Parallel/background attempts |
| Gate-by-gate approval (G1–G6) | Auto-approve or streaming commit |
| Chronicle as source of truth | UI fabricating execution state |
| Human approves each code change | AI committing without review |

---

## Enforcement

These features are enforced **at multiple levels**:

1. **UI Config:** `quarantine.ts` and `quarantine_config.json`
2. **Server-Side:** Adapter/API rejects unauthorized actions
3. **Chronicle:** Events not logged = action did not happen
4. **Documentation:** This document (PERMANENTLY_DISABLED.md)

---

## Change Control

**To modify this list, the following is required:**

1. Chronicle approval (logged event)
2. Review by @orion
3. Documentation update with rationale
4. All three enforcement layers updated in sync

**Any PR that attempts to enable these features will be auto-rejected.**

---

## References

- [UI Feature Inventory Table](./core-features/CANONICAL-UI-Feature-Inventory-Table.md)
- [Operator Plane v1 Spec](../../operator-plane/docs/operator-plane-v1-spec.md)
- Enterprise Hardening Sprint documentation

---

## Signatures

```
Feature Lock Acknowledged: Commander Orion
Date: 2026-01-13
Chronicle Reference: Wave 1 UI Enablement Authorization
```
