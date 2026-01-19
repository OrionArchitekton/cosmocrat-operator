/**
 * Project Mode Hooks
 *
 * React hooks for Project Mode (Phase D execution + E2 parallel sets):
 * - Get project status and readiness
 * - G2: Execute tickets (single-ticket only, or approved parallel sets)
 * - Poll for active executions
 * - E2: Propose/approve/reject parallel execution sets
 *
 * INVARIANT: Truth comes from Chronicle, not local state.
 * INVARIANT: Parallel execution requires explicit human approval (E2).
 */

import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getProjectStatus,
  getReadiness,
  getActiveExecutions,
  executeTicket,
  getLatestAttempt,
  importPlan,
  proposeExpansion,
  approveExpansion,
  // E2: Parallel Sets
  getLatestParallelSet,
  proposeParallelSet,
  approveParallelSet,
  rejectParallelSet,
  type ProjectStatus,
  type ReadinessBundle,
  type ActiveExecutions,
  type ExecuteResponse,
  type AttemptStatus,
  type PlanImportResponse,
  type ExpansionProposal,
  type ApproveExpansionResponse,
  type ParallelSetProposal,
  type ParallelSetProposeResponse,
  type ParallelSetApproveResponse,
  type ParallelSetRejectResponse,
} from '@/api/project-mode';

// ============================================================
// Query Keys
// ============================================================

export const projectModeKeys = {
  all: ['projectMode'] as const,
  status: (projectId: string) => ['projectMode', 'status', projectId] as const,
  readiness: (projectId: string) => ['projectMode', 'readiness', projectId] as const,
  executions: (projectId: string) => ['projectMode', 'executions', projectId] as const,
  attempt: (projectId: string, ticketId: string) =>
    ['projectMode', 'attempt', projectId, ticketId] as const,
  parallelSet: (projectId: string) => ['projectMode', 'parallelSet', projectId] as const,
};

// ============================================================
// useProjectMode Hook
// ============================================================

export function useProjectMode(projectId: string | undefined) {
  const queryClient = useQueryClient();

  // ========================================================
  // Queries
  // ========================================================

  const statusQuery = useQuery({
    queryKey: projectModeKeys.status(projectId ?? ''),
    queryFn: () => getProjectStatus(projectId!),
    enabled: !!projectId,
    refetchInterval: 10000, // Refresh every 10s
  });

  const readinessQuery = useQuery({
    queryKey: projectModeKeys.readiness(projectId ?? ''),
    queryFn: () => getReadiness(projectId!),
    enabled: !!projectId,
    refetchInterval: 5000, // Refresh every 5s (more frequent for readiness)
  });

  const executionsQuery = useQuery({
    queryKey: projectModeKeys.executions(projectId ?? ''),
    queryFn: () => getActiveExecutions(projectId!),
    enabled: !!projectId,
    refetchInterval: 3000, // Poll frequently while executing
  });

  // E2: Parallel Set Query
  const parallelSetQuery = useQuery({
    queryKey: projectModeKeys.parallelSet(projectId ?? ''),
    queryFn: () => getLatestParallelSet(projectId!),
    enabled: !!projectId,
    refetchInterval: 5000,
  });

  // ========================================================
  // Mutations
  // ========================================================

  const executeMutation = useMutation({
    mutationFn: async ({ ticketId, note }: { ticketId: string; note?: string }) => {
      if (!projectId) throw new Error('No project ID');
      return executeTicket(projectId, ticketId, note);
    },
    onSuccess: () => {
      // Invalidate all project mode queries to refresh state
      queryClient.invalidateQueries({ queryKey: projectModeKeys.all });
    },
  });

  const importPlanMutation = useMutation({
    mutationFn: async ({
      content,
      format,
    }: {
      content: string;
      format: 'conductor_md' | 'plan_md' | 'yaml';
    }) => {
      if (!projectId) throw new Error('No project ID');
      return importPlan(projectId, content, format);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectModeKeys.all });
    },
  });

  const proposeExpansionMutation = useMutation({
    mutationFn: async ({ planRefId }: { planRefId: string }) => {
      if (!projectId) throw new Error('No project ID');
      return proposeExpansion(projectId, planRefId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectModeKeys.all });
    },
  });

  const approveExpansionMutation = useMutation({
    mutationFn: async ({ expansionId, note }: { expansionId: string; note?: string }) => {
      if (!projectId) throw new Error('No project ID');
      return approveExpansion(projectId, expansionId, note);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectModeKeys.all });
    },
  });

  // E2: Parallel Set Mutations
  const proposeParallelSetMutation = useMutation({
    mutationFn: async ({
      eligibleTicketIds,
      policyMode,
      maxConcurrent,
    }: {
      eligibleTicketIds: string[];
      policyMode?: string;
      maxConcurrent?: number;
    }) => {
      if (!projectId) throw new Error('No project ID');
      return proposeParallelSet(projectId, eligibleTicketIds, policyMode, maxConcurrent);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectModeKeys.all });
    },
  });

  const approveParallelSetMutation = useMutation({
    mutationFn: async ({ parallelSetId, note }: { parallelSetId: string; note?: string }) => {
      if (!projectId) throw new Error('No project ID');
      return approveParallelSet(projectId, parallelSetId, note);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectModeKeys.all });
    },
  });

  const rejectParallelSetMutation = useMutation({
    mutationFn: async ({ parallelSetId, note }: { parallelSetId: string; note: string }) => {
      if (!projectId) throw new Error('No project ID');
      return rejectParallelSet(projectId, parallelSetId, note);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectModeKeys.all });
    },
  });

  // ========================================================
  // Derived State
  // ========================================================

  const isExecuting = (executionsQuery.data?.activeCount ?? 0) > 0;
  const nextRunnableTicket = readinessQuery.data?.nextRunnable?.[0] ?? null;
  const pendingApprovals = readinessQuery.data?.pendingApprovals ?? [];
  const explanations = readinessQuery.data?.explanations ?? {};

  // ========================================================
  // Actions
  // ========================================================

  const executeTicketAction = useCallback(
    (ticketId: string, note?: string) => {
      return executeMutation.mutateAsync({ ticketId, note });
    },
    [executeMutation]
  );

  const importPlanAction = useCallback(
    (content: string, format: 'conductor_md' | 'plan_md' | 'yaml') => {
      return importPlanMutation.mutateAsync({ content, format });
    },
    [importPlanMutation]
  );

  const proposeAction = useCallback(
    (planRefId: string) => {
      return proposeExpansionMutation.mutateAsync({ planRefId });
    },
    [proposeExpansionMutation]
  );

  const approveAction = useCallback(
    (expansionId: string, note?: string) => {
      return approveExpansionMutation.mutateAsync({ expansionId, note });
    },
    [approveExpansionMutation]
  );

  // E2: Parallel Set Actions
  const proposeParallelSetAction = useCallback(
    (eligibleTicketIds: string[], policyMode?: string, maxConcurrent?: number) => {
      return proposeParallelSetMutation.mutateAsync({ eligibleTicketIds, policyMode, maxConcurrent });
    },
    [proposeParallelSetMutation]
  );

  const approveParallelSetAction = useCallback(
    (parallelSetId: string, note?: string) => {
      return approveParallelSetMutation.mutateAsync({ parallelSetId, note });
    },
    [approveParallelSetMutation]
  );

  const rejectParallelSetAction = useCallback(
    (parallelSetId: string, note: string) => {
      return rejectParallelSetMutation.mutateAsync({ parallelSetId, note });
    },
    [rejectParallelSetMutation]
  );

  const refetchAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: projectModeKeys.all });
  }, [queryClient]);

  // ========================================================
  // Return
  // ========================================================

  return {
    // Query data
    status: statusQuery.data,
    readiness: readinessQuery.data,
    activeExecutions: executionsQuery.data,
    parallelSet: parallelSetQuery.data,

    // Derived state
    isExecuting,
    nextRunnableTicket,
    pendingApprovals,
    explanations,

    // Loading states
    isLoading: statusQuery.isLoading || readinessQuery.isLoading,
    isExecuteLoading: executeMutation.isPending,
    isImportLoading: importPlanMutation.isPending,
    isProposeLoading: proposeExpansionMutation.isPending,
    isApproveLoading: approveExpansionMutation.isPending,
    isProposeParallelSetLoading: proposeParallelSetMutation.isPending,
    isApproveParallelSetLoading: approveParallelSetMutation.isPending,
    isRejectParallelSetLoading: rejectParallelSetMutation.isPending,

    // Errors
    statusError: statusQuery.error,
    readinessError: readinessQuery.error,
    executeError: executeMutation.error,
    parallelSetError: parallelSetQuery.error,

    // Actions
    executeTicket: executeTicketAction,
    importPlan: importPlanAction,
    proposeExpansion: proposeAction,
    approveExpansion: approveAction,
    proposeParallelSet: proposeParallelSetAction,
    approveParallelSet: approveParallelSetAction,
    rejectParallelSet: rejectParallelSetAction,
    refetchAll,

    // Raw queries/mutations for advanced use
    statusQuery,
    readinessQuery,
    executionsQuery,
    parallelSetQuery,
    executeMutation,
    importPlanMutation,
    proposeExpansionMutation,
    approveExpansionMutation,
    proposeParallelSetMutation,
    approveParallelSetMutation,
    rejectParallelSetMutation,
  };
}

// ============================================================
// useTicketAttemptStatus Hook (for individual ticket)
// ============================================================

export function useTicketAttemptStatus(projectId: string | undefined, ticketId: string | undefined) {
  return useQuery({
    queryKey: projectModeKeys.attempt(projectId ?? '', ticketId ?? ''),
    queryFn: () => getLatestAttempt(projectId!, ticketId!),
    enabled: !!projectId && !!ticketId,
    refetchInterval: 3000,
  });
}

// ============================================================
// Type exports for consumers
// ============================================================

export type {
  ProjectStatus,
  ReadinessBundle,
  ActiveExecutions,
  ExecuteResponse,
  AttemptStatus,
  PlanImportResponse,
  ExpansionProposal,
  ApproveExpansionResponse,
  ParallelSetProposal,
  ParallelSetProposeResponse,
  ParallelSetApproveResponse,
  ParallelSetRejectResponse,
};
