/**
 * Execution Controls
 *
 * Authorize & Execute (G2) button with confirmation modal.
 * Shows executing banner when an attempt is running.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Loader2, Eye, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { ActiveExecutions } from '@/api/project-mode';

interface ExecutionControlsProps {
  selectedTicketId: string | null;
  isTicketReady: boolean;
  isExecuting: boolean;
  activeExecutions: ActiveExecutions | undefined;
  onExecute: (ticketId: string, note?: string) => Promise<void>;
  onReview: (ticketId: string) => void;
  isLoading: boolean;
  g3ReviewReady?: boolean;
  className?: string;
}

export function ExecutionControls({
  selectedTicketId,
  isTicketReady,
  isExecuting,
  activeExecutions,
  onExecute,
  onReview,
  isLoading,
  g3ReviewReady,
  className,
}: ExecutionControlsProps) {
  const { t } = useTranslation('projectMode');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [executeNote, setExecuteNote] = useState('');

  const handleExecuteClick = () => {
    if (!selectedTicketId) return;
    setShowConfirmDialog(true);
  };

  const handleConfirmExecute = async () => {
    if (!selectedTicketId) return;
    try {
      await onExecute(selectedTicketId, executeNote || undefined);
      setShowConfirmDialog(false);
      setExecuteNote('');
    } catch (err) {
      // Error handling is done in the hook
      console.error('Execute failed:', err);
    }
  };

  const handleReviewClick = () => {
    if (selectedTicketId) {
      onReview(selectedTicketId);
    }
  };

  // Show executing banner
  if (isExecuting && activeExecutions) {
    const executingTicket = activeExecutions.executingTickets[0];
    return (
      <div className={cn('space-y-3', className)}>
        <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          <div className="flex-1">
            <div className="text-sm font-medium text-blue-700 dark:text-blue-300">
              {t('controls.executingBanner')}
            </div>
            {executingTicket && (
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-0.5 font-mono">
                {executingTicket.ticketId}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show G3 review button if ready
  if (g3ReviewReady && selectedTicketId) {
    return (
      <div className={cn('space-y-3', className)}>
        <Button
          onClick={handleReviewClick}
          variant="outline"
          className="w-full justify-center gap-2 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-900/20"
        >
          <Eye className="h-4 w-4" />
          {t('controls.reviewOutcome')}
        </Button>
      </div>
    );
  }

  // Show execute button
  return (
    <div className={cn('space-y-3', className)}>
      <Button
        onClick={handleExecuteClick}
        disabled={!selectedTicketId || !isTicketReady || isLoading}
        className="w-full justify-center gap-2"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Play className="h-4 w-4" />
        )}
        {t('controls.authorizeExecute')}
      </Button>

      {!selectedTicketId && (
        <p className="text-xs text-muted-foreground text-center">
          Select a ticket from the list to execute
        </p>
      )}

      {selectedTicketId && !isTicketReady && (
        <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
          Selected ticket is not ready for execution
        </p>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {t('controls.authorizeExecute')}
            </DialogTitle>
            <DialogDescription>
              {t('controls.authorizeExecuteConfirmation')}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="text-sm mb-2">
              <span className="text-muted-foreground">Ticket: </span>
              <span className="font-mono font-medium">{selectedTicketId}</span>
            </div>
            <textarea
              value={executeNote}
              onChange={(e) => setExecuteNote(e.target.value)}
              placeholder="Optional note..."
              className="w-full px-3 py-2 text-sm border rounded-md resize-none h-20"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              disabled={isLoading}
            >
              {t('controls.cancel')}
            </Button>
            <Button
              onClick={handleConfirmExecute}
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {t('controls.authorize')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
