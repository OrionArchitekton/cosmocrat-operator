/**
 * Project Mode API Client
 *
 * Connects to Phase D (execution), Phase B (CSO), and Phase E2 (parallel sets) endpoints.
 *
 * INVARIANT: Actor is derived from session identity, not passed from UI.
 * INVARIANT: All responses map snake_case → camelCase for TypeScript consistency.
 *
 * API Surface:
 *   GET  /api/project/{project_id}/status
 *   GET  /api/project/{project_id}/readiness
 *   POST /api/project/{project_id}/ticket/{ticket_id}/start
 *   POST /api/project/{project_id}/ticket/{ticket_id}/execute
 *   GET  /api/project/{project_id}/ticket/{ticket_id}/attempts/latest
 *   GET  /api/project/{project_id}/executions/active
 *   POST /api/project/{project_id}/plan/import
 *   POST /api/project/{project_id}/expansion/propose
 *   POST /api/project/{project_id}/expansion/{expansion_id}/approve
 *   --- E2: Parallel Sets ---
 *   POST /api/project/{project_id}/parallel-set/propose
 *   POST /api/project/{project_id}/parallel-set/{parallel_set_id}/approve
 *   POST /api/project/{project_id}/parallel-set/{parallel_set_id}/reject
 *   GET  /api/project/{project_id}/parallel-set/latest
 */

const API_BASE = import.meta.env.VITE_OPERATOR_PLANE_API_URL || '/api';

// ============================================================
// Utility: snake_case → camelCase mapper
// ============================================================

type CamelCase<S extends string> = S extends `${infer T}_${infer U}`
  ? `${T}${Capitalize<CamelCase<U>>}`
  : S;

type KeysToCamelCase<T> = {
  [K in keyof T as CamelCase<string & K>]: T[K] extends object
    ? KeysToCamelCase<T[K]>
    : T[K];
};

/**
 * Recursively converts snake_case keys to camelCase
 */
function toCamelCase<T>(obj: T): KeysToCamelCase<T> {
  if (Array.isArray(obj)) {
    return obj.map((item) => toCamelCase(item)) as unknown as KeysToCamelCase<T>;
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()),
        toCamelCase(value),
      ])
    ) as KeysToCamelCase<T>;
  }
  return obj as KeysToCamelCase<T>;
}

// ============================================================
// Types
// ============================================================

export interface ProjectStatus {
  projectId: string;
  title: string;
  status: string;
  tickets: {
    ready: string[];
    executing: string[];
    blocked: string[];
    review: string[];
    done: string[];
  };
  pendingApprovals: PendingApproval[];
  nextRunnable: string[];
  warnings: string[];
}

export interface PendingApproval {
  gate: string;
  ticketId: string;
  attemptId?: string;
  waitingSince: string;
  description?: string;
}

export interface EligibleTicket {
  ticketId: string;
  rank: number;
  reasons: string[];
  score: number;
}

// E3: Lane capacity status
export interface LaneCapacityStatus {
  lane: string;
  limit: number;
  active: number;
  remaining: number;
  atCapacity: boolean;
}

// E4: Backpressure status
export interface BackpressureSignals {
  activeAttempts: number;
  recentFailures: number;
  errorStreak: number;
  avgLatencyMs: number;
}

export interface BackpressureStatus {
  active: boolean;
  reason: string;
  signals: BackpressureSignals;
  triggeredBy: string[];
  since: string | null;
}

// E5: Safety explanation types
export type SafetyStatus = 'pass' | 'warn' | 'fail';

export type SafetyCategory = 
  | 'deps_satisfied'
  | 'no_internal_deps'
  | 'scope_known'
  | 'path_disjoint'
  | 'lane_capacity'
  | 'backpressure'
  | 'no_active_attempt'
  | 'policy';

export interface SafetyExplanation {
  category: SafetyCategory | string;
  statement: string;
  evidence: Record<string, unknown>;
  status: SafetyStatus;
}

export interface SafetySummary {
  overall: SafetyStatus;
  explanations: SafetyExplanation[];
  computedAt: string;
}

export interface ReadinessBundle {
  ready: string[];
  queued: string[];
  executing: string[];
  blocked: string[];
  review: string[];
  done: string[];
  nextRunnable: string[];
  eligibleRunnable: EligibleTicket[];  // E1: Ranked eligible tickets
  pendingApprovals: PendingApproval[];
  explanations: Record<string, string[]>;
  warnings: string[];
  // E3: Lane capacity
  laneCapacity?: Record<string, LaneCapacityStatus>;
  // E4: Backpressure
  backpressure?: BackpressureStatus | null;
}

export interface StartResponse {
  success: boolean;
  attemptId: string;
  requestEventId: string;
  g2EventId: string;
  message: string;
}

export interface ExecuteResponse {
  success: boolean;
  attemptId: string;
  verdict: string;
  receiptId: string;
  artifactBundleHash: string;
  summary: string;
  errorMessage: string;
}

export interface AttemptStatus {
  ticketId: string;
  latestAttempt: {
    attemptId: string;
    startedAt: string;
    completedAt?: string;
    verdict?: string;
    receiptId?: string;
    artifactBundleHash?: string;
  } | null;
  g3ReviewReady: boolean;
  verdict: string | null;
}

export interface ActiveExecutions {
  activeCount: number;
  executingTickets: {
    ticketId: string;
    title: string;
    activeAttemptId: string | null;
  }[];
}

export interface PlanImportResponse {
  planHash: string;
  planRefId: string;
}

export interface ExpansionProposal {
  expansionId: string;
  dagHash: string;
  ticketsPreview: { ticketId: string; title: string }[];
  warnings: string[];
}

export interface ApproveExpansionResponse {
  ticketIds: string[];
}

// ============================================================
// Phase D: Execution APIs
// ============================================================

/**
 * Get project status with ticket buckets
 */
export async function getProjectStatus(projectId: string): Promise<ProjectStatus> {
  const response = await fetch(`${API_BASE}/project/${projectId}/status`);
  if (!response.ok) {
    throw new Error(`Failed to get project status: ${await response.text()}`);
  }
  const data = await response.json();
  return toCamelCase(data) as ProjectStatus;
}

/**
 * Get readiness bundle (next_runnable, pending_approvals, explanations)
 */
export async function getReadiness(projectId: string): Promise<ReadinessBundle> {
  const response = await fetch(`${API_BASE}/project/${projectId}/readiness`);
  if (!response.ok) {
    throw new Error(`Failed to get readiness: ${await response.text()}`);
  }
  const data = await response.json();
  return toCamelCase(data) as ReadinessBundle;
}

/**
 * G2: Start ticket (authorization only, no execution)
 * Actor derived from session.
 */
export async function startTicket(
  projectId: string,
  ticketId: string,
  note?: string
): Promise<StartResponse> {
  const response = await fetch(
    `${API_BASE}/project/${projectId}/ticket/${ticketId}/start`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: note || '' }),
    }
  );
  if (!response.ok) {
    throw new Error(`Failed to start ticket: ${await response.text()}`);
  }
  const data = await response.json();
  return toCamelCase(data) as StartResponse;
}

/**
 * G2 + Execute: Combined authorization and execution
 * Actor derived from session.
 */
export async function executeTicket(
  projectId: string,
  ticketId: string,
  note?: string
): Promise<ExecuteResponse> {
  const response = await fetch(
    `${API_BASE}/project/${projectId}/ticket/${ticketId}/execute`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: note || '' }),
    }
  );
  if (!response.ok) {
    throw new Error(`Failed to execute ticket: ${await response.text()}`);
  }
  const data = await response.json();
  return toCamelCase(data) as ExecuteResponse;
}

/**
 * Get latest attempt status for a ticket
 */
export async function getLatestAttempt(
  projectId: string,
  ticketId: string
): Promise<AttemptStatus> {
  const response = await fetch(
    `${API_BASE}/project/${projectId}/ticket/${ticketId}/attempts/latest`
  );
  if (!response.ok) {
    throw new Error(`Failed to get attempt: ${await response.text()}`);
  }
  const data = await response.json();
  return toCamelCase(data) as AttemptStatus;
}

/**
 * Get currently executing tickets (should be ≤1 in Phase D)
 */
export async function getActiveExecutions(
  projectId: string
): Promise<ActiveExecutions> {
  const response = await fetch(`${API_BASE}/project/${projectId}/executions/active`);
  if (!response.ok) {
    throw new Error(`Failed to get executions: ${await response.text()}`);
  }
  const data = await response.json();
  return toCamelCase(data) as ActiveExecutions;
}

/**
 * Response from G3 approval
 */
export interface G3ApprovalResponse {
  success: boolean;
  eventId: string;
  message: string;
}

/**
 * Approve a ticket's execution outcome (G3 gate)
 */
export async function approveTicketG3(
  projectId: string,
  ticketId: string,
  note?: string
): Promise<G3ApprovalResponse> {
  const response = await fetch(
    `${API_BASE}/project/${projectId}/ticket/${ticketId}/approve-g3`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: note || '' }),
    }
  );
  if (!response.ok) {
    throw new Error(`Failed to approve ticket: ${await response.text()}`);
  }
  const data = await response.json();
  return toCamelCase(data) as G3ApprovalResponse;
}

/**
 * Response from G4 apply
 */
export interface G4ApplyResponse {
  success: boolean;
  eventId: string;
  message: string;
}

/**
 * Apply changes for a ticket (G4 gate) - marks ticket DONE
 */
export async function applyTicketG4(
  projectId: string,
  ticketId: string,
  note?: string
): Promise<G4ApplyResponse> {
  const response = await fetch(
    `${API_BASE}/project/${projectId}/ticket/${ticketId}/apply-g4`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: note || '' }),
    }
  );
  if (!response.ok) {
    throw new Error(`Failed to apply ticket: ${await response.text()}`);
  }
  const data = await response.json();
  return toCamelCase(data) as G4ApplyResponse;
}

// ============================================================
// Phase B: CSO APIs (Plan Import)
// ============================================================

/**
 * Import a plan artifact (Conductor MD or YAML)
 */
export async function importPlan(
  projectId: string,
  content: string,
  format: 'conductor_md' | 'plan_md' | 'yaml'
): Promise<PlanImportResponse> {
  const response = await fetch(`${API_BASE}/project/${projectId}/plan/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ format, content }),
  });
  if (!response.ok) {
    throw new Error(`Failed to import plan: ${await response.text()}`);
  }
  const data = await response.json();
  return toCamelCase(data) as PlanImportResponse;
}

/**
 * Propose expansion (generate ticket DAG)
 */
export async function proposeExpansion(
  projectId: string,
  planRefId: string
): Promise<ExpansionProposal> {
  const response = await fetch(`${API_BASE}/project/${projectId}/expansion/propose`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan_ref_id: planRefId }),
  });
  if (!response.ok) {
    throw new Error(`Failed to propose expansion: ${await response.text()}`);
  }
  const data = await response.json();
  return toCamelCase(data) as ExpansionProposal;
}

/**
 * Approve expansion (materialize tickets)
 */
export async function approveExpansion(
  projectId: string,
  expansionId: string,
  note?: string
): Promise<ApproveExpansionResponse> {
  const response = await fetch(
    `${API_BASE}/project/${projectId}/expansion/${expansionId}/approve`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: note || '' }),
    }
  );
  if (!response.ok) {
    throw new Error(`Failed to approve expansion: ${await response.text()}`);
  }
  const data = await response.json();
  return toCamelCase(data) as ApproveExpansionResponse;
}

// ============================================================
// Phase E2: Parallel Sets APIs
// ============================================================

/**
 * Safety check result from parallel set validation
 */
export interface SafetyCheck {
  check: string;
  passed: boolean;
  details: string;
}

/**
 * Parallel set proposal from Commander
 */
export interface ParallelSetProposal {
  parallelSetId: string;
  projectId: string;
  ticketIds: string[];
  policyMode: string;
  maxConcurrent: number;
  safetyChecks: SafetyCheck[];
  warnings: string[];
  rationale: string[];
  hash: string;
  requiresHumanApproval: boolean;
  allChecksPassed: boolean;
  ticketCount: number;
  // E5: Structured safety summary
  safetySummary?: SafetySummary | null;
  safetyStatus?: SafetyStatus;
}

/**
 * Response from proposing a parallel set
 */
export interface ParallelSetProposeResponse {
  success: boolean;
  proposal: ParallelSetProposal;
  eventId: string;
}

/**
 * Response from approving a parallel set
 */
export interface ParallelSetApproveResponse {
  success: boolean;
  parallelSetId: string;
  eventId: string;
  message: string;
}

/**
 * Response from rejecting a parallel set
 */
export interface ParallelSetRejectResponse {
  success: boolean;
  parallelSetId: string;
  eventId: string;
  message: string;
}

/**
 * Propose a parallel execution set for eligible tickets
 *
 * @param projectId - Project ID
 * @param eligibleTicketIds - Ticket IDs to include in parallel set
 * @param policyMode - Parallelism policy mode (default: path_disjoint)
 * @param maxConcurrent - Maximum concurrent executions (default: 2)
 */
export async function proposeParallelSet(
  projectId: string,
  eligibleTicketIds: string[],
  policyMode: string = 'path_disjoint',
  maxConcurrent: number = 2
): Promise<ParallelSetProposeResponse> {
  const response = await fetch(
    `${API_BASE}/project/${projectId}/parallel-set/propose`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eligible_ticket_ids: eligibleTicketIds,
        policy_mode: policyMode,
        max_concurrent: maxConcurrent,
      }),
    }
  );
  if (!response.ok) {
    throw new Error(`Failed to propose parallel set: ${await response.text()}`);
  }
  const data = await response.json();
  return toCamelCase(data) as ParallelSetProposeResponse;
}

/**
 * Approve a parallel set for execution (human gate)
 *
 * @param projectId - Project ID
 * @param parallelSetId - Parallel set ID to approve
 * @param note - Optional approval note (required if warnings exist)
 */
export async function approveParallelSet(
  projectId: string,
  parallelSetId: string,
  note?: string
): Promise<ParallelSetApproveResponse> {
  const response = await fetch(
    `${API_BASE}/project/${projectId}/parallel-set/${parallelSetId}/approve`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: note || '' }),
    }
  );
  if (!response.ok) {
    throw new Error(`Failed to approve parallel set: ${await response.text()}`);
  }
  const data = await response.json();
  return toCamelCase(data) as ParallelSetApproveResponse;
}

/**
 * Reject a parallel set
 *
 * @param projectId - Project ID
 * @param parallelSetId - Parallel set ID to reject
 * @param note - Rejection reason (required)
 */
export async function rejectParallelSet(
  projectId: string,
  parallelSetId: string,
  note: string
): Promise<ParallelSetRejectResponse> {
  const response = await fetch(
    `${API_BASE}/project/${projectId}/parallel-set/${parallelSetId}/reject`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    }
  );
  if (!response.ok) {
    throw new Error(`Failed to reject parallel set: ${await response.text()}`);
  }
  const data = await response.json();
  return toCamelCase(data) as ParallelSetRejectResponse;
}

/**
 * Get the latest parallel set proposal for a project
 *
 * @param projectId - Project ID
 * @returns Latest parallel set proposal or null if none exists
 */
export async function getLatestParallelSet(
  projectId: string
): Promise<ParallelSetProposal | null> {
  const response = await fetch(
    `${API_BASE}/project/${projectId}/parallel-set/latest`
  );
  if (response.status === 404) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`Failed to get parallel set: ${await response.text()}`);
  }
  const data = await response.json();
  return toCamelCase(data) as ParallelSetProposal;
}
