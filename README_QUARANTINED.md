# ⚠️ QUARANTINED REPOSITORY

**Status:** LEGACY / ARCHIVED
**Date:** 2026-01-20
**Superseded By:**
- UI: `cosmocrat-operator-surface`
- Identity/Signing: `cosmocrat-operator-attestor`

---

## Why This Repository Is Quarantined

This repository was identified as a **governance risk** during the R1 Constitutional Audit (2026-01-20). The codebase co-located:

1. **UI components** (read-only surface)
2. **Privileged backend services** (execution, filesystem, containers)
3. **Identity/auth logic** (approval signing)

This co-location violated the Three-Plane Model axiom:
> "Operator Plane never codes, reasons, or executes."

Keeping these concerns in one repo enabled **authority drift**—the possibility that UI changes could accidentally gain execution privileges or that signing logic could accumulate unauthorized capabilities.

---

## What Happened to the Code

| Component | Destination | Status |
|-----------|-------------|--------|
| `frontend/` | `cosmocrat-operator-surface` | Migrated |
| `remote-frontend/` | `cosmocrat-operator-surface` (legacy) | Migrated |
| `shared/` (TS types) | `cosmocrat-operator-surface` | Migrated |
| `assets/` | `cosmocrat-operator-surface` | Migrated |
| `crates/services/auth.rs` | `cosmocrat-operator-attestor` (reference) | Referenced |
| `crates/server/routes/oauth.rs` | `cosmocrat-operator-attestor` (reference) | Referenced |
| `crates/` (all other) | THIS REPO (quarantined) | Archived |
| `npx-cli/` | THIS REPO (quarantined) | Archived |
| `scripts/` | THIS REPO (quarantined) | Archived |
| `Dockerfile` | THIS REPO (quarantined) | Archived |

---

## Do NOT

- ❌ Deploy this repository to production
- ❌ Issue credentials to this repository
- ❌ Merge PRs that add new functionality
- ❌ Reference this repo as a dependency

---

## Final Tag

This repository's final production-relevant state is tagged as:

```
legacy-cosmocrat-operator-final
```

Any commits after this tag are for documentation/archival purposes only.

---

## Governance References

- **Remediation Roadmap:** `COSMOCRAT_GOVERNANCE_REMEDIATION_ROADMAP.md`
- **Chronicle Entry:** `cosmocrat-governance-remediation-roadmap-20260120`
- **R1 Exit Criteria:** Surface cannot execute; Attestor cannot execute; Kernel rejects unsigned

---

## Contact

For questions about the migration, see the `cosmocrat-operator-surface` and `cosmocrat-operator-attestor` repositories or contact the governance owner.
