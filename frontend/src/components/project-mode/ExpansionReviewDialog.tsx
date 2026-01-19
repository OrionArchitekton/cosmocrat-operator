/**
 * Expansion Review Dialog
 *
 * Dialog for reviewing and approving/rejecting a proposed ticket DAG expansion.
 * Part of P2: Roadmap + Checklist Ingest.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, XCircle, AlertTriangle, Loader2, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useProjectMode } from '@/hooks/useProjectMode';
import type { ExpansionProposal } from '@/api/project-mode';
import { cn } from '@/lib/utils';

interface ExpansionReviewDialogProps {
  projectId: string;
  proposal: ExpansionProposal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApproved?: (ticketIds: string[]) => void;
  onRejected?: () => void;
}

export function ExpansionReviewDialog({
  projectId,
  proposal,
  open,
  onOpenChange,
  onApproved,
  onRejected,
}: ExpansionReviewDialogProps) {
  const { t } = useTranslation('projectMode');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { approveExpansion, isApproveLoading } = useProjectMode(projectId);

  const handleApprove = async () => {
    setError(null);
    try {
      const result = await approveExpansion(proposal.expansionId, note || undefined);
      onOpenChange(false);
      if (onApproved) {
        onApproved(result.ticketIds);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Approval failed');
    }
  };

  const handleReject = () => {
    onOpenChange(false);
    if (onRejected) {
      onRejected();
    }
  };

  const hasWarnings = proposal.warnings.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            {t('expansion.title')}
          </DialogTitle>
          <DialogDescription>{t('expansion.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* DAG Hash */}
          <div className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-md">
            <span className="text-sm text-muted-foreground">{t('expansion.dagHash')}</span>
            <code className="text-xs font-mono">{proposal.dagHash.slice(0, 16)}...</code>
          </div>

          {/* Warnings */}
          {hasWarnings && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                {t('expansion.warnings')}
              </h4>
              <ul className="space-y-1 text-sm text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-md px-3 py-2">
                {proposal.warnings.map((warning, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-amber-500">•</span>
                    {warning}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!hasWarnings && (
            <div className="text-sm text-muted-foreground px-3 py-2 bg-green-50 dark:bg-green-900/20 rounded-md flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              {t('expansion.noWarnings')}
            </div>
          )}

          {/* Tickets Preview */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">{t('expansion.ticketsPreview')}</h4>
            <div className="border rounded-md max-h-64 overflow-y-auto">
              {proposal.ticketsPreview.map((ticket, i) => (
                <div
                  key={ticket.ticketId}
                  className={cn(
                    'px-3 py-2 flex items-center gap-3',
                    i > 0 && 'border-t'
                  )}
                >
                  <span className="font-mono text-xs text-muted-foreground w-20">
                    {ticket.ticketId}
                  </span>
                  <span className="text-sm truncate">{ticket.title}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {proposal.ticketsPreview.length} tickets will be created
            </p>
          </div>

          {/* Optional Note */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note about this approval..."
              className="w-full h-20 px-3 py-2 text-sm border rounded-md resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="px-3 py-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-md">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleReject}
            disabled={isApproveLoading}
            className="gap-2"
          >
            <XCircle className="h-4 w-4" />
            {t('expansion.rejectButton')}
          </Button>
          <Button
            onClick={handleApprove}
            disabled={isApproveLoading}
            className="gap-2"
          >
            {isApproveLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('expansion.approving')}
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                {t('expansion.approveButton')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
