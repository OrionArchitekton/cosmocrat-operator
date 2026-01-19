/**
 * Parallel Set Banner (E2 + E5)
 *
 * Shows when a parallel set is proposed/approved and provides controls for:
 * - Reviewing safety checks (E2 legacy)
 * - Viewing safety summary with evidence (E5)
 * - Approving/rejecting the set
 * - Executing an approved set
 *
 * DOCTRINE: Parallel execution requires explicit human approval.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Play,
  Users,
  Shield,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ParallelSetProposal, SafetyCheck } from '@/api/project-mode';
import { SafetySummaryPanel, SafetyStatusBadge } from './SafetySummaryPanel';

interface ParallelSetBannerProps {
  proposal: ParallelSetProposal | null;
  isApproved?: boolean;
  onApprove: (note?: string) => Promise<void>;
  onReject: (note: string) => Promise<void>;
  onExecute?: () => Promise<void>;
  className?: string;
}

export function ParallelSetBanner({
  proposal,
  isApproved = false,
  onApprove,
  onReject,
  onExecute,
  className,
}: ParallelSetBannerProps) {
  const { t } = useTranslation('projectMode');
  const [isExpanded, setIsExpanded] = useState(false);
  const [approvalNote, setApprovalNote] = useState('');
  const [rejectionNote, setRejectionNote] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!proposal) {
    return null;
  }

  const hasWarnings = proposal.warnings.length > 0;
  const allChecksPassed = proposal.allChecksPassed;

  const handleApprove = async () => {
    if (hasWarnings && !approvalNote.trim()) {
      return; // Note required when warnings exist
    }
    setIsLoading(true);
    try {
      await onApprove(approvalNote || undefined);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionNote.trim()) {
      return; // Rejection note is required
    }
    setIsLoading(true);
    try {
      await onReject(rejectionNote);
    } finally {
      setIsLoading(false);
      setShowRejectForm(false);
    }
  };

  const handleExecute = async () => {
    if (!onExecute) return;
    setIsLoading(true);
    try {
      await onExecute();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        isApproved
          ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
          : hasWarnings
          ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700'
          : 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">{t('parallelSets.title')}</h3>
              {proposal.safetyStatus && (
                <SafetyStatusBadge status={proposal.safetyStatus} />
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('parallelSets.subtitle')}
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-black/10 dark:hover:bg-white/10 rounded"
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Summary Row */}
      <div className="mt-3 flex flex-wrap gap-4 text-xs">
        <div>
          <span className="text-muted-foreground">{t('parallelSets.ticketsIncluded')}: </span>
          <span className="font-medium">{proposal.ticketCount}</span>
        </div>
        <div>
          <span className="text-muted-foreground">{t('parallelSets.policyMode')}: </span>
          <span className="font-mono">{proposal.policyMode}</span>
        </div>
        <div>
          <span className="text-muted-foreground">{t('parallelSets.maxConcurrent')}: </span>
          <span className="font-medium">{proposal.maxConcurrent}</span>
        </div>
      </div>

      {/* Tickets List */}
      <div className="mt-3 flex flex-wrap gap-1">
        {proposal.ticketIds.map((ticketId) => (
          <span
            key={ticketId}
            className="px-2 py-0.5 bg-white/50 dark:bg-black/20 rounded text-xs font-mono"
          >
            {ticketId}
          </span>
        ))}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-4 space-y-4">
          {/* E5 Safety Summary (preferred, shows "why safe" evidence) */}
          {proposal.safetySummary && (
            <SafetySummaryPanel summary={proposal.safetySummary} />
          )}

          {/* E2 Safety Checks (legacy, shown if no E5 summary available) */}
          {!proposal.safetySummary && proposal.safetyChecks.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold flex items-center gap-1 mb-2">
                <Shield className="h-3 w-3" />
                {t('parallelSets.safetyChecks.title')}
              </h4>
              <div className="space-y-1">
                {proposal.safetyChecks.map((check, idx) => (
                  <SafetyCheckRow key={idx} check={check} />
                ))}
              </div>
            </div>
          )}

          {/* Rationale */}
          {proposal.rationale.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold mb-1">
                {t('parallelSets.rationale')}
              </h4>
              <ul className="text-xs text-muted-foreground list-disc list-inside">
                {proposal.rationale.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Warnings */}
          {hasWarnings && (
            <div>
              <h4 className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center gap-1 mb-1">
                <AlertTriangle className="h-3 w-3" />
                {t('parallelSets.warnings')}
              </h4>
              <ul className="text-xs text-amber-700 dark:text-amber-300 list-disc list-inside">
                {proposal.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      {!isApproved && (
        <div className="mt-4 space-y-3">
          {/* Approval Note (required if warnings) */}
          {hasWarnings && !showRejectForm && (
            <div>
              <label className="text-xs font-medium">
                {t('parallelSets.approvalNote.label')}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <textarea
                value={approvalNote}
                onChange={(e) => setApprovalNote(e.target.value)}
                placeholder={t('parallelSets.approvalNote.placeholder')}
                className="mt-1 w-full px-2 py-1 text-xs rounded border bg-white dark:bg-black/20"
                rows={2}
              />
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                {t('parallelSets.warningNoteRequired')}
              </p>
            </div>
          )}

          {/* Rejection Form */}
          {showRejectForm && (
            <div>
              <label className="text-xs font-medium">
                {t('parallelSets.rejectionNote.label')}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <textarea
                value={rejectionNote}
                onChange={(e) => setRejectionNote(e.target.value)}
                placeholder={t('parallelSets.rejectionNote.placeholder')}
                className="mt-1 w-full px-2 py-1 text-xs rounded border bg-white dark:bg-black/20"
                rows={2}
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            {!showRejectForm ? (
              <>
                <button
                  onClick={handleApprove}
                  disabled={isLoading || !allChecksPassed || (hasWarnings && !approvalNote.trim())}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded text-xs font-medium',
                    'bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  {isLoading ? t('parallelSets.approving') : t('parallelSets.approve')}
                </button>
                <button
                  onClick={() => setShowRejectForm(true)}
                  disabled={isLoading}
                  className="px-3 py-2 rounded text-xs font-medium border hover:bg-black/5 dark:hover:bg-white/5"
                >
                  {t('parallelSets.reject')}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleReject}
                  disabled={isLoading || !rejectionNote.trim()}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded text-xs font-medium',
                    'bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed'
                  )}
                >
                  <XCircle className="h-3 w-3" />
                  {isLoading ? t('parallelSets.rejecting') : t('parallelSets.reject')}
                </button>
                <button
                  onClick={() => setShowRejectForm(false)}
                  disabled={isLoading}
                  className="px-3 py-2 rounded text-xs font-medium border hover:bg-black/5 dark:hover:bg-white/5"
                >
                  {t('controls.cancel')}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Execute Approved Set */}
      {isApproved && onExecute && (
        <div className="mt-4">
          <p className="text-xs text-green-700 dark:text-green-300 mb-2">
            {t('parallelSets.banner.approved')}
          </p>
          <button
            onClick={handleExecute}
            disabled={isLoading}
            className={cn(
              'w-full flex items-center justify-center gap-1 px-3 py-2 rounded text-xs font-medium',
              'bg-green-600 text-white hover:bg-green-700 disabled:opacity-50'
            )}
          >
            <Play className="h-3 w-3" />
            {t('parallelSets.execute')}
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function SafetyCheckRow({ check }: { check: SafetyCheck }) {
  const { t } = useTranslation('projectMode');

  return (
    <div className="flex items-center gap-2 text-xs">
      {check.passed ? (
        <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
      ) : (
        <XCircle className="h-3 w-3 text-red-500 flex-shrink-0" />
      )}
      <span className="flex-1">
        {t(`parallelSets.safetyChecks.checks.${check.check}`, {
          defaultValue: check.check,
        })}
      </span>
      <span className="text-muted-foreground">{check.details}</span>
    </div>
  );
}
