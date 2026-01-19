/**
 * Project Mode Panel
 *
 * Main container for Project Mode (Wave 1.5 + E2).
 * Combines: Project selector, Ticket ledger, Readiness panel, Execution controls.
 * E2: Parallel Set Banner for multi-ticket approval flow.
 *
 * INVARIANT: All state derived from Chronicle via API.
 */

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Upload, FolderKanban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProjectMode, useTicketAttemptStatus } from '@/hooks/useProjectMode';
import { TicketLedger } from './TicketLedger';
import { ReadinessPanel } from './ReadinessPanel';
import { ExecutionControls } from './ExecutionControls';
import { GovernanceBadges } from './GovernanceBadges';
import { ParallelSetBanner } from './ParallelSetBanner';
import { cn } from '@/lib/utils';

interface ProjectModePanelProps {
  /** Current project ID (from workspace context) */
  projectId: string | undefined;
  /** Callback to navigate to attempt detail */
  onNavigateToAttempt?: (ticketId: string, attemptId: string) => void;
  /** Callback to open plan import dialog */
  onOpenImportDialog?: () => void;
  className?: string;
}

export function ProjectModePanel({
  projectId,
  onNavigateToAttempt,
  onOpenImportDialog,
  className,
}: ProjectModePanelProps) {
  const { t } = useTranslation('projectMode');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  const {
    status,
    readiness,
    activeExecutions,
    parallelSet,
    isExecuting,
    isLoading,
    isExecuteLoading,
    executeTicket,
    // proposeParallelSet, // E2: Will be used when "Propose Parallel Set" button is added
    approveParallelSet,
    rejectParallelSet,
    refetchAll,
  } = useProjectMode(projectId);

  // Get attempt status for selected ticket
  const { data: attemptStatus } = useTicketAttemptStatus(projectId, selectedTicketId ?? undefined);

  // Check if selected ticket is ready
  const isSelectedTicketReady =
    selectedTicketId && readiness?.ready?.includes(selectedTicketId);

  // Check if G3 review is ready for selected ticket
  const g3ReviewReady = attemptStatus?.g3ReviewReady ?? false;

  // Handle execute
  const handleExecute = useCallback(
    async (ticketId: string, note?: string) => {
      await executeTicket(ticketId, note);
    },
    [executeTicket]
  );

  // Handle review navigation
  const handleReview = useCallback(
    (ticketId: string) => {
      if (attemptStatus?.latestAttempt?.attemptId && onNavigateToAttempt) {
        onNavigateToAttempt(ticketId, attemptStatus.latestAttempt.attemptId);
      }
    },
    [attemptStatus, onNavigateToAttempt]
  );

  // E2: Handle parallel set approval
  const handleApproveParallelSet = useCallback(
    async (note?: string) => {
      if (!parallelSet?.parallelSetId) return;
      await approveParallelSet(parallelSet.parallelSetId, note);
    },
    [parallelSet, approveParallelSet]
  );

  // E2: Handle parallel set rejection
  const handleRejectParallelSet = useCallback(
    async (note: string) => {
      if (!parallelSet?.parallelSetId) return;
      await rejectParallelSet(parallelSet.parallelSetId, note);
    },
    [parallelSet, rejectParallelSet]
  );

  // No project selected
  if (!projectId) {
    return (
      <div className={cn('flex flex-col h-full', className)}>
        <EmptyState
          title={t('projectSelector.empty')}
          onImport={onOpenImportDialog}
        />
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-3">
          <FolderKanban className="h-5 w-5 text-muted-foreground" />
          <div>
            <h2 className="text-sm font-semibold">{t('title')}</h2>
            {status && (
              <p className="text-xs text-muted-foreground">{status.title}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={refetchAll}
            disabled={isLoading}
            title="Refresh from Chronicle"
          >
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>

          {onOpenImportDialog && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenImportDialog}
              className="gap-1.5"
            >
              <Upload className="h-4 w-4" />
              Import
            </Button>
          )}
        </div>
      </div>

      {/* Subtitle */}
      <div className="px-4 py-2 border-b bg-muted/30">
        <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-3 h-full">
          {/* Left: Ticket Ledger */}
          <div className="lg:col-span-1 border-r overflow-hidden flex flex-col">
            <TicketLedger
              status={status}
              readiness={readiness}
              selectedTicketId={selectedTicketId}
              onSelectTicket={setSelectedTicketId}
              className="flex-1 overflow-hidden"
            />
          </div>

          {/* Right: Readiness + Controls */}
          <div className="lg:col-span-2 flex flex-col overflow-hidden">
            {/* Readiness Panel */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* E2: Parallel Set Banner (if proposal exists) */}
              {parallelSet && (
                <ParallelSetBanner
                  proposal={parallelSet}
                  isApproved={false}
                  onApprove={handleApproveParallelSet}
                  onReject={handleRejectParallelSet}
                />
              )}

              <ReadinessPanel
                readiness={readiness}
                onSelectTicket={setSelectedTicketId}
              />
            </div>

            {/* Execution Controls */}
            <div className="border-t p-4">
              <ExecutionControls
                selectedTicketId={selectedTicketId}
                isTicketReady={!!isSelectedTicketReady}
                isExecuting={isExecuting}
                activeExecutions={activeExecutions}
                onExecute={handleExecute}
                onReview={handleReview}
                isLoading={isExecuteLoading}
                g3ReviewReady={g3ReviewReady}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer with Governance Badges */}
      <div className="px-4 py-2 border-t bg-muted/30 flex items-center justify-between">
        <GovernanceBadges />
        <span className="text-xs text-muted-foreground italic">
          {t('footer')}
        </span>
      </div>
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function EmptyState({
  title,
  onImport,
}: {
  title: string;
  onImport?: () => void;
}) {
  const { t } = useTranslation('projectMode');

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <FolderKanban className="h-12 w-12 text-muted-foreground/50 mb-4" />
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-md">
        {t('import.description')}
      </p>
      {onImport && (
        <Button onClick={onImport} className="gap-2">
          <Upload className="h-4 w-4" />
          {t('import.importButton')}
        </Button>
      )}
    </div>
  );
}
