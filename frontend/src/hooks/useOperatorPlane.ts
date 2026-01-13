/**
 * Operator Plane Hooks
 * 
 * React hooks for the P0 governed loop:
 * - G1: Intent submission
 * - G2: Execution authorization  
 * - G4: Approval decision
 * 
 * INVARIANT: Truth comes from Chronicle, not local state.
 * After every mutation, refresh from /api/chronicle/events.
 */

import { useState, useCallback, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  submitIntent,
  authorizeExecution,
  submitApproval,
  getIntentStatus,
  getChronicleEvents,
  getOperatorId,
  getSessionId,
  type IntentSubmission,
  type IntentReceipt,
  type ExecutionRequest,
  type ExecutionResult,
  type ApprovalRequest,
  type ApprovalReceipt,
  type ApprovalDecision,
  type ChronicleEvent,
  type IntentStatus,
} from '@/api/operator-plane';

// ============================================================
// Gate Status Types
// ============================================================

export type GateStatus = 'pending' | 'passed' | 'failed' | 'waiting';

export interface GateStates {
  g1: GateStatus;  // Intent submitted
  g2: GateStatus;  // Executed
  g3: GateStatus;  // Reviewed (implicit - artifacts exist)
  g4: GateStatus;  // Applied/Rejected
}

export interface OperatorPlaneState {
  receiptId: string | null;
  gates: GateStates;
  events: ChronicleEvent[];
  artifacts: ExecutionResult['artifacts'] | null;
  isLoading: boolean;
  error: string | null;
}

// ============================================================
// Chronicle Query Keys
// ============================================================

export const chronicleKeys = {
  all: ['chronicle'] as const,
  events: (receiptId: string) => ['chronicle', 'events', receiptId] as const,
  status: (receiptId: string) => ['chronicle', 'status', receiptId] as const,
};

// ============================================================
// useOperatorPlane Hook
// ============================================================

export function useOperatorPlane(taskId?: string) {
  const queryClient = useQueryClient();
  
  // Local state for receipt tracking
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [artifacts, setArtifacts] = useState<ExecutionResult['artifacts'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Query Chronicle events when we have a receiptId
  const {
    data: events = [],
    isLoading: eventsLoading,
    refetch: refetchEvents,
  } = useQuery({
    queryKey: chronicleKeys.events(receiptId ?? ''),
    queryFn: () => receiptId ? getChronicleEvents(receiptId) : Promise.resolve([]),
    enabled: !!receiptId,
    refetchInterval: 2000, // Poll every 2s while active
  });
  
  // Derive gate states from Chronicle events
  const gates: GateStates = deriveGateStates(events);
  
  // ========================================================
  // G1: Submit Intent
  // ========================================================
  const intentMutation = useMutation({
    mutationFn: async (params: {
      description: string;
      targetFiles: string[];
      worktree: string;
      branch: string;
    }) => {
      const submission: IntentSubmission = {
        operatorId: getOperatorId(),
        sessionId: getSessionId(),
        intentType: 'CODE_CHANGE',
        description: params.description,
        context: {
          taskId: taskId ?? 'unknown',
          worktree: params.worktree,
          branch: params.branch,
          workspaceRoot: params.worktree,
        },
        targetFiles: params.targetFiles,
      };
      return submitIntent(submission);
    },
    onSuccess: (receipt: IntentReceipt) => {
      setReceiptId(receipt.receiptId);
      setError(null);
      // Refresh Chronicle to get truth
      queryClient.invalidateQueries({ queryKey: chronicleKeys.all });
    },
    onError: (err: Error) => {
      setError(`Intent submission failed: ${err.message}`);
    },
  });
  
  // ========================================================
  // G2: Execute
  // ========================================================
  const executeMutation = useMutation({
    mutationFn: async () => {
      if (!receiptId) throw new Error('No receipt ID - submit intent first');
      const request: ExecutionRequest = {
        receiptId,
        operatorId: getOperatorId(),
      };
      return authorizeExecution(request);
    },
    onSuccess: (result: ExecutionResult) => {
      setArtifacts(result.artifacts);
      setError(null);
      // Refresh Chronicle to get truth
      queryClient.invalidateQueries({ queryKey: chronicleKeys.all });
    },
    onError: (err: Error) => {
      setError(`Execution failed: ${err.message}`);
    },
  });
  
  // ========================================================
  // G4: Approve/Reject
  // ========================================================
  const approvalMutation = useMutation({
    mutationFn: async (params: { decision: ApprovalDecision; comment?: string }) => {
      if (!receiptId) throw new Error('No receipt ID');
      const request: ApprovalRequest = {
        receiptId,
        operatorId: getOperatorId(),
        decision: params.decision,
        comment: params.comment,
      };
      return submitApproval(request);
    },
    onSuccess: () => {
      setError(null);
      // Refresh Chronicle to get truth
      queryClient.invalidateQueries({ queryKey: chronicleKeys.all });
    },
    onError: (err: Error) => {
      setError(`Approval failed: ${err.message}`);
    },
  });
  
  // ========================================================
  // Public API
  // ========================================================
  
  const submitIntentAction = useCallback(
    (description: string, targetFiles: string[], worktree: string, branch: string) => {
      return intentMutation.mutateAsync({ description, targetFiles, worktree, branch });
    },
    [intentMutation]
  );
  
  const executeAction = useCallback(() => {
    return executeMutation.mutateAsync();
  }, [executeMutation]);
  
  const approveAction = useCallback(
    (comment?: string) => {
      return approvalMutation.mutateAsync({ decision: 'APPROVE', comment });
    },
    [approvalMutation]
  );
  
  const rejectAction = useCallback(
    (comment?: string) => {
      return approvalMutation.mutateAsync({ decision: 'REJECT', comment });
    },
    [approvalMutation]
  );
  
  const resetState = useCallback(() => {
    setReceiptId(null);
    setArtifacts(null);
    setError(null);
  }, []);
  
  return {
    // State
    receiptId,
    gates,
    events,
    artifacts,
    error,
    isLoading: intentMutation.isPending || executeMutation.isPending || approvalMutation.isPending || eventsLoading,
    
    // Actions
    submitIntent: submitIntentAction,
    execute: executeAction,
    approve: approveAction,
    reject: rejectAction,
    reset: resetState,
    refetchEvents,
    
    // Raw mutations for advanced use
    intentMutation,
    executeMutation,
    approvalMutation,
  };
}

// ============================================================
// Helper: Derive gate states from Chronicle events
// ============================================================

function deriveGateStates(events: ChronicleEvent[]): GateStates {
  const states: GateStates = {
    g1: 'pending',
    g2: 'pending',
    g3: 'pending',
    g4: 'pending',
  };
  
  for (const event of events) {
    switch (event.eventType) {
      case 'INTENT_SUBMITTED':
        states.g1 = 'passed';
        states.g2 = 'waiting'; // Ready for G2
        break;
      case 'EXECUTION_AUTHORIZED':
        states.g2 = 'passed';
        break;
      case 'ARTIFACTS_PRODUCED':
        states.g3 = 'passed'; // Implicit review gate
        states.g4 = 'waiting'; // Ready for G4
        break;
      case 'APPROVAL_DECISION':
      case 'PATCH_APPLIED':
        states.g4 = 'passed';
        break;
      case 'PATCH_REJECTED':
        states.g4 = 'failed';
        break;
      case 'SYSTEM_ERROR':
        // Mark current gate as failed based on context
        if (states.g2 === 'waiting') states.g2 = 'failed';
        else if (states.g4 === 'waiting') states.g4 = 'failed';
        break;
    }
  }
  
  return states;
}

// ============================================================
// useChronicleEvents Hook (standalone)
// ============================================================

export function useChronicleEvents(receiptId: string | null) {
  return useQuery({
    queryKey: chronicleKeys.events(receiptId ?? ''),
    queryFn: () => receiptId ? getChronicleEvents(receiptId) : Promise.resolve([]),
    enabled: !!receiptId,
    refetchInterval: 2000,
  });
}
