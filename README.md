# Cosmocrat Operator

> **Cosmocrat Operator** — Governed operator plane for AI-executed code.

---

**Status:** P1 Complete @ `v0.2.0-p1`  
**Architecture:** User space / cockpit for Cosmocrat AI Operating System

## Overview

Cosmocrat Operator is the **human-in-the-loop interface** for the Cosmocrat AI Operating System. It replaces autonomous AI coding workflows with a governed **PLAN → EXECUTE → REVIEW → APPROVE** pipeline.

Every action is:
- **Receipt-logged** to an append-only Chronicle
- **Gate-controlled** with explicit human approval
- **Isolated** in per-task git worktrees

## Architecture

```
pandora/
├─ cosmocrat-core       ← kernel / brain
├─ cosmocrat-operator   ← user space / cockpit (this repo)
└─ operator-plane       ← adapter API bridge
```

## Human-in-the-Loop Gates

| Gate | Blocks Until |
|------|--------------|
| G1 | Intent submitted by operator |
| G2 | Operator clicks Execute (LLM invocation) |
| G3 | Operator reviews proposal |
| G4 | Operator approves file mutations |
| G5 | Operator approves commit/PR |

**No autonomous execution path exists.** All gates are server-enforced.

## Quick Start

```bash
# Terminal 1: Start adapter
cd operator-plane
export COSMOCRAT_GATEWAY_URL=http://edge-01:8000
export COSMOCRAT_CCA_TOKEN=<your-token>
python -m uvicorn adapter.server:app --port 8081

# Terminal 2: Start UI
cd cosmocrat-operator/frontend
pnpm install
npx vite
```

Open `http://localhost:5173` → Submit Intent → Execute → Review → Approve

## Key Components

- **OperatorPlanePanel** - Main cockpit interface
- **IntentForm** - G1 Intent submission
- **GateStatus** - Visual gate indicators
- **ExecutionControls** - G2/G4 action buttons
- **ChronicleDiffViewer** - G3 proposal review

## What Is Quarantined

The following autonomous features are permanently disabled:

- ❌ Direct executor invocation
- ❌ MCP server/client
- ❌ Chat command bar
- ❌ Auto task generation
- ❌ Background agents
- ❌ Tab autocomplete

## Attribution

This project includes UI components derived from [BloopAI/vibe-kanban](https://github.com/BloopAI/vibe-kanban) under the Apache License 2.0. See [NOTICE.md](NOTICE.md) for details.

## Critical Rule

> **If it bypasses Chronicle or a gate, it does not ship.**

---

*Cosmocrat Operator v1 — 2026-01-13*
