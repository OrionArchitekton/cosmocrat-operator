/**
 * Ticket Ledger
 *
 * Displays tickets grouped by status with dependency hints.
 * Click a ticket to select it for execution.
 */

import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { ProjectStatus, ReadinessBundle } from '@/api/project-mode';

interface TicketLedgerProps {
  status: ProjectStatus | undefined;
  readiness: ReadinessBundle | undefined;
  selectedTicketId: string | null;
  onSelectTicket: (ticketId: string) => void;
  className?: string;
}

type TicketStatusKey = 'ready' | 'executing' | 'blocked' | 'review' | 'done';

const STATUS_CONFIG: Record<
  TicketStatusKey,
  { labelKey: string; bgColor: string; textColor: string }
> = {
  ready: {
    labelKey: 'tickets.status.ready',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    textColor: 'text-green-700 dark:text-green-400',
  },
  executing: {
    labelKey: 'tickets.status.executing',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    textColor: 'text-blue-700 dark:text-blue-400',
  },
  blocked: {
    labelKey: 'tickets.status.blocked',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-700 dark:text-red-400',
  },
  review: {
    labelKey: 'tickets.status.reviewRequired',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    textColor: 'text-amber-700 dark:text-amber-400',
  },
  done: {
    labelKey: 'tickets.status.done',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    textColor: 'text-gray-600 dark:text-gray-400',
  },
};

export function TicketLedger({
  status,
  readiness,
  selectedTicketId,
  onSelectTicket,
  className,
}: TicketLedgerProps) {
  const { t } = useTranslation('projectMode');

  if (!status) {
    return (
      <div className={cn('p-4 text-sm text-muted-foreground', className)}>
        {t('projectSelector.empty')}
      </div>
    );
  }

  const tickets = status.tickets;
  const explanations = readiness?.explanations ?? {};

  // Collect all tickets with their status
  const allTickets: { id: string; status: TicketStatusKey }[] = [];
  
  (Object.keys(STATUS_CONFIG) as TicketStatusKey[]).forEach((statusKey) => {
    const ticketIds = tickets[statusKey] ?? [];
    ticketIds.forEach((id) => {
      allTickets.push({ id, status: statusKey });
    });
  });

  if (allTickets.length === 0) {
    return (
      <div className={cn('p-4 text-sm text-muted-foreground', className)}>
        {t('projectSelector.empty')}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col', className)}>
      <h3 className="px-3 py-2 text-sm font-semibold border-b">
        {t('tickets.title')}
      </h3>
      <div className="flex-1 overflow-y-auto">
        {allTickets.map(({ id, status: ticketStatus }) => {
          const config = STATUS_CONFIG[ticketStatus];
          const isSelected = selectedTicketId === id;
          const ticketExplanations = explanations[id] ?? [];
          const isNextRunnable = readiness?.nextRunnable?.includes(id);

          return (
            <button
              key={id}
              onClick={() => onSelectTicket(id)}
              className={cn(
                'w-full text-left px-3 py-2 border-b transition-colors',
                'hover:bg-accent/50',
                isSelected && 'bg-accent',
                isNextRunnable && 'ring-2 ring-inset ring-green-500/50'
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm truncate">{id}</span>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded text-xs font-medium',
                    config.bgColor,
                    config.textColor
                  )}
                >
                  {t(config.labelKey)}
                </span>
              </div>

              {/* Dependency hint */}
              {ticketExplanations.length > 0 && (
                <div className="mt-1 text-xs text-muted-foreground truncate">
                  {ticketExplanations[0]}
                </div>
              )}

              {/* Next runnable indicator */}
              {isNextRunnable && (
                <div className="mt-1 text-xs text-green-600 dark:text-green-400 font-medium">
                  {t('readiness.nextRunnable.helpText')}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
