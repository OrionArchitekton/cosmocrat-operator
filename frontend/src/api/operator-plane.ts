/**
 * Operator Plane API Client
 * 
 * This module provides the frontend API bindings for the Operator Plane adapter.
 * All operations go through governed gates (G1-G5).
 * 
 * INVARIANT: Every mutation requires Chronicle receipt.
 * INVARIANT: UI never treats its own state as truth - truth comes from Chronicle.
 * 
 * Architecture:
 *   UI → Adapter (this client) → Gateway → CCA
 *   UI never calls Gateway directly.
 */

// Single source of truth for API base URL
// Can be flipped by changing one env var: VITE_OPERATOR_PLANE_API_URL
const API_BASE = import.meta.env.VITE_OPERATOR_PLANE_API_URL || '/api';

// ============================================================
// Types
// ============================================================

export type IntentType = 'CODE_CHANGE' | 'TEST_EXECUTION' | 'GIT_OPERATION' | 'COMMAND_EXECUTION';

export interface IntentContext {
  taskId: string;
  worktree: string;
  branch: string;
  workspaceRoot: string;
  additionalContext?: string;
}

export interface IntentSubmission {
  operatorId: string;
  sessionId: string;
  intentType: IntentType;
  description: string;
  context: IntentContext;
  targetFiles?: string[];
  llmModel?: string;
}

export interface IntentReceipt {
  receiptId: string;
  intentHash: string;
  registeredAt: string;
  status: string;
  chronicleEventId: string;
}

export interface ExecutionRequest {
  receiptId: string;
  operatorId: string;
}

export interface PatchArtifact {
  filePath: string;
  operation: 'create' | 'modify' | 'delete';
  content: string;
  diff: string;
}

export interface ExecutionResult {
  receiptId: string;
  status: string;
  artifacts: {
    patches: PatchArtifact[];
    affectedFiles: string[];
    diffSummary: string;
  };
  governance: {
    rationale: string;
    risk: string;
    approvalRequired: boolean;
  };
  executionMs: number;
  chronicleEventId: string;
}

export type ApprovalDecision = 'APPROVE' | 'REJECT';

export interface ApprovalRequest {
  receiptId: string;
  operatorId: string;
  decision: ApprovalDecision;
  comment?: string;
}

export interface ApprovalReceipt {
  approvalId: string;
  receiptId: string;
  decision: string;
  executionTriggered: boolean;
  chronicleEventId: string;
  executionStatus?: string;
}

export interface ChronicleEvent {
  eventId: string;
  eventType: string;
  timestamp: string;
  receiptId?: string;
  operatorId: string;
  sessionId: string;
  payload: Record<string, unknown>;
  payloadHash: string;
}

export interface IntentStatus {
  status: string;
  receiptId: string;
  eventCount: number;
  events: ChronicleEvent[];
}

// ============================================================
// API Functions
// ============================================================

/**
 * G1: Submit an intent
 * 
 * Logs the intent to Chronicle and returns a receipt.
 * No execution happens until G2 (Execute) is triggered.
 */
export async function submitIntent(submission: IntentSubmission): Promise<IntentReceipt> {
  const response = await fetch(`${API_BASE}/intent/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operator_id: submission.operatorId,
      session_id: submission.sessionId,
      intent_type: submission.intentType,
      description: submission.description,
      context: {
        task_id: submission.context.taskId,
        worktree: submission.context.worktree,
        branch: submission.context.branch,
        workspace_root: submission.context.workspaceRoot,
        additional_context: submission.context.additionalContext,
      },
      target_files: submission.targetFiles || [],
      llm_model: submission.llmModel || 'claude-3-5-sonnet',
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Intent submission failed: ${error}`);
  }
  
  const data = await response.json();
  return {
    receiptId: data.receipt_id,
    intentHash: data.intent_hash,
    registeredAt: data.registered_at,
    status: data.status,
    chronicleEventId: data.chronicle_event_id,
  };
}

/**
 * G2: Authorize execution
 * 
 * Triggers LLM subprocess invocation. Returns artifacts for review.
 * No file writes happen - artifacts are proposals only.
 */
export async function authorizeExecution(request: ExecutionRequest): Promise<ExecutionResult> {
  const response = await fetch(`${API_BASE}/execute/authorize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      receipt_id: request.receiptId,
      operator_id: request.operatorId,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Execution authorization failed: ${error}`);
  }
  
  const data = await response.json();
  return {
    receiptId: data.receipt_id,
    status: data.status,
    artifacts: {
      patches: data.artifacts?.patches?.map((p: any) => ({
        filePath: p.file_path,
        operation: p.operation,
        content: p.content,
        diff: p.diff,
      })) || [],
      affectedFiles: data.artifacts?.affected_files || [],
      diffSummary: data.artifacts?.diff_summary || '',
    },
    governance: {
      rationale: data.governance?.rationale || '',
      risk: data.governance?.risk || 'unknown',
      approvalRequired: data.governance?.approval_required ?? true,
    },
    executionMs: data.execution_ms || 0,
    chronicleEventId: data.chronicle_event_id,
  };
}

/**
 * G4: Submit approval decision
 * 
 * If approved, patches are applied to the worktree.
 * If rejected, attempt remains as history.
 */
export async function submitApproval(request: ApprovalRequest): Promise<ApprovalReceipt> {
  const response = await fetch(`${API_BASE}/approval/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      receipt_id: request.receiptId,
      operator_id: request.operatorId,
      decision: request.decision,
      comment: request.comment,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Approval submission failed: ${error}`);
  }
  
  const data = await response.json();
  return {
    approvalId: data.approval_id,
    receiptId: data.receipt_id,
    decision: data.decision,
    executionTriggered: data.execution_triggered,
    chronicleEventId: data.chronicle_event_id,
    executionStatus: data.execution_status,
  };
}

/**
 * Get intent status by receipt ID
 */
export async function getIntentStatus(receiptId: string): Promise<IntentStatus> {
  const response = await fetch(`${API_BASE}/intent/status/${receiptId}`);
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get intent status: ${error}`);
  }
  
  const data = await response.json();
  return {
    status: data.status,
    receiptId: data.receipt_id,
    eventCount: data.event_count,
    events: data.events?.map((e: any) => ({
      eventId: e.event_id,
      eventType: e.event_type,
      timestamp: e.timestamp,
      receiptId: e.receipt_id,
      operatorId: e.operator_id,
      sessionId: e.session_id,
      payload: e.payload,
      payloadHash: e.payload_hash,
    })) || [],
  };
}

/**
 * Get Chronicle events for a receipt
 */
export async function getChronicleEvents(receiptId: string): Promise<ChronicleEvent[]> {
  const response = await fetch(`${API_BASE}/chronicle/events?receipt_id=${receiptId}`);
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get Chronicle events: ${error}`);
  }
  
  const data = await response.json();
  return data.events?.map((e: any) => ({
    eventId: e.event_id,
    eventType: e.event_type,
    timestamp: e.timestamp,
    receiptId: e.receipt_id,
    operatorId: e.operator_id,
    sessionId: e.session_id,
    payload: e.payload,
    payloadHash: e.payload_hash,
  })) || [];
}

// ============================================================
// Convenience Hooks (for React)
// ============================================================

/**
 * Get the current operator ID (from session/auth)
 */
export function getOperatorId(): string {
  // TODO: Get from auth context
  return 'operator-default';
}

/**
 * Get the current session ID
 */
export function getSessionId(): string {
  // TODO: Get from session context
  return `session-${Date.now()}`;
}
