# Cosmocrat Operator (archived)

Archived prototype of a governed, human-in-the-loop operator UI for AI coding agents.

![License](https://img.shields.io/badge/license-Apache_2.0-blue)
![Status](https://img.shields.io/badge/status-archived-lightgrey)
![Base](https://img.shields.io/badge/base-vibe--kanban-555)

> **Status: archived / read-only.** This repository is a frozen prototype, tagged
> `legacy-cosmocrat-operator-final`. It is not deployed, not published, and not
> accepting feature work. npm publishing is disabled in CI and a quarantine guard
> blocks new functionality. See [Project status](#project-status) before using anything here.

## What this is

Cosmocrat Operator is a fork of [BloopAI/vibe-kanban](https://github.com/BloopAI/vibe-kanban)
that adds a human-in-the-loop "operator plane" UI on top of vibe-kanban's Rust + React
stack for orchestrating AI coding agents.

The added work is a set of frontend components and a client that model a
**PLAN → EXECUTE → REVIEW → APPROVE** flow: an operator submits an intent, the system
proposes a change, the operator reviews the diff, and the operator approves before
anything is committed. The intent was to gate AI-driven code changes behind explicit
human approval rather than running them autonomously.

The backend, CLI, build manifests, and `docs/` tree are still upstream vibe-kanban
(see [Relationship to vibe-kanban](#relationship-to-vibe-kanban)).

## Project status

This repo was frozen and superseded by separate follow-on repositories that split the
UI surface from the signing/identity concerns. The final relevant state is the git tag
`legacy-cosmocrat-operator-final`; commits after it are documentation only.

What that means in practice:

- Do not deploy this repository or treat it as a released product.
- Do not add new functionality — CI runs a quarantine guard that blocks it, and the
  npm publish workflow (`.github/workflows/publish.yml`) is disabled.
- The runnable artifact, if built, is still the upstream `vibe-kanban` package
  (version `0.0.150`), not a separately published "Cosmocrat Operator" package.

`README_QUARANTINED.md` records the original archival decision and where the live work moved.

## What actually exists in this repo

The Cosmocrat-specific additions live entirely in the frontend.

**Operator-plane UI** (`frontend/src/components/operator-plane/`):

| Component             | Role                                  |
| --------------------- | ------------------------------------- |
| `OperatorPlanePanel`  | Main cockpit panel (wired in `App.tsx`) |
| `IntentForm`          | Submit an operator intent             |
| `GateStatus`          | Show gate state for the active flow   |
| `ExecutionControls`   | Execute / approve action controls     |
| `ChronicleDiffViewer` | Review a proposed diff                 |

**Project-mode UI** (`frontend/src/components/project-mode/`): `ProjectModePanel`,
`GovernanceBadges`, `SafetySummaryPanel`, `ReadinessPanel`, `TicketLedger`,
`ExpansionReviewDialog`, `PlanImportDialog`, `ParallelSetBanner`, plus a
`ReceiptVerifier` component at `frontend/src/components/`.

**Client and hooks**: `frontend/src/api/operator-plane.ts` (and `project-mode.ts`),
with `useOperatorPlane` and `useProjectMode` hooks. The operator-plane client reads its
base URL from `VITE_OPERATOR_PLANE_API_URL` (defaults to `/api`) and calls a separate
adapter service — that adapter is **not contained in this repository**.

**Governance config** (in-repo, descriptive only): `quarantine_config.json` and
`docs/PERMANENTLY_DISABLED.md` declare which upstream agent features are turned off in
this fork. Per `quarantine_config.json`, all named coding agents (Claude Code, Codex,
Cursor, Copilot, Gemini, and others) are listed as disabled, executors run
single-attempt-only, and MCP server/client, the chat command bar, agent profiles,
auto-task generation, and background agents are disabled. Enforcement is recorded as
server-side plus UI hiding, with route blocking off (`enforcement.route_blocking: false`).

> Note: the two governance docs disagree on the gate count — `quarantine_config.json`
> and the original README describe gates G1–G5, while `docs/PERMANENTLY_DISABLED.md`
> references G1–G6. This was never reconciled before the repo was frozen.

## Relationship to vibe-kanban

This is a fork, and most of what you would build and run is unchanged upstream code:

- `package.json` declares `"name": "vibe-kanban"`, `"version": "0.0.150"`.
- The npm CLI in `npx-cli/` publishes the `vibe-kanban` package and caches downloaded
  binaries under `~/.vibe-kanban/bin`.
- The `docs/` tree is upstream vibe-kanban documentation.
- The Rust workspace crates are upstream.

Attribution and modification details are in [`NOTICE.md`](NOTICE.md). The base project
is licensed Apache 2.0; see [`LICENSE`](LICENSE).

## Architecture

A Cargo workspace plus a Vite/React/TypeScript frontend, with shared TypeScript types
generated from the Rust types via `ts-rs`.

```
crates/          Rust workspace: server, db, executors, services, utils,
                 deployment, local-deployment, remote, review
frontend/        Vite + React + TypeScript app (operator-plane + project-mode UI)
remote-frontend/ Frontend for the remote deployment
shared/          Generated TS types (shared/types.ts) — generated, do not edit by hand
npx-cli/         Published vibe-kanban CLI wrapper
scripts/         Dev helpers (port assignment, SQLx prep)
docs/            Upstream vibe-kanban docs + quarantine notes
```

The operator-plane client talks to an external adapter/gateway service that does not
ship in this repo; without it, the operator-plane UI has no backend to call.

## Running locally

Prerequisites: Node `>=18`, pnpm `>=8`, and a Rust toolchain (pinned in
`rust-toolchain.toml`).

```bash
pnpm i
pnpm run prepare-db      # SQLx offline prep (required before a Rust build)
pnpm run dev             # frontend + Rust backend, ports auto-assigned
```

Use `pnpm run dev:qa` for the QA-oriented dev mode. Frontend/backend ports and dev
assets are managed by `scripts/setup-dev-environment.js`; override with `FRONTEND_PORT`,
`BACKEND_PORT`, and `HOST` in a local `.env` (never commit secrets).

## Checks and tests

```bash
pnpm run check           # frontend tsc + cargo check
pnpm run lint            # eslint + cargo clippy (-D warnings)
pnpm run format          # cargo fmt + prettier
cargo test --workspace   # Rust tests
pnpm run generate-types  # regenerate shared/types.ts from Rust
```

To regenerate shared types, edit `crates/server/src/bin/generate_types.rs` and run
`pnpm run generate-types`; do not edit `shared/types.ts` directly.

## Docker / remote

A multi-stage `Dockerfile` builds a non-root image that runs the `server` binary on
port 3000. The remote (Postgres) stack lives under `crates/remote/`:

```bash
pnpm run remote:prepare-db   # SQLx prep for the Postgres remote package
pnpm run remote:dev          # bring up the remote stack via docker compose
```

## Configuration

| Variable                     | Where        | Purpose                                      |
| ---------------------------- | ------------ | -------------------------------------------- |
| `VITE_OPERATOR_PLANE_API_URL`| frontend     | Operator-plane adapter base URL (default `/api`) |
| `FRONTEND_PORT` / `BACKEND_PORT` / `HOST` | dev | Override auto-assigned dev ports/host  |
| `PORT`                       | container    | Server port in the Docker image (default 3000) |

PostHog/Sentry build args exist in the `Dockerfile` for the upstream telemetry path.

## License

Apache License 2.0. See [`LICENSE`](LICENSE) and [`NOTICE.md`](NOTICE.md).
