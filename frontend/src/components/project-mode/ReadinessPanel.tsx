/**
 * Readiness Panel (E1 + E5)
 *
 * Shows what can happen next:
 * - Recommended next ticket
 * - Pending approvals
 * - Explanations for blocked tickets
 * - E5: "Why eligible" explanations for each ticket
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, AlertCircle, CheckCircle2, HelpCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReadinessBundle, PendingApproval, EligibleTicket } from '@/api/project-mode';
import { LaneCapacityPanel } from './LaneCapacityPanel';
import { BackpressureBanner } from './BackpressureBanner';

interface ReadinessPanelProps {
  readiness: ReadinessBundle | undefined;
  onSelectTicket: (ticketId: string) => void;
  className?: string;
}

const GATE_ICONS: Record<string, React.ReactNode> = {
  G2: <Clock className="h-4 w-4 text-blue-500" />,
  G3: <AlertCircle className="h-4 w-4 text-amber-500" />,
  G4: <CheckCircle2 className="h-4 w-4 text-green-500" />,
  G5: <CheckCircle2 className="h-4 w-4 text-purple-500" />,
  G6: <CheckCircle2 className="h-4 w-4 text-teal-500" />,
};

export function ReadinessPanel({
  readiness,
  onSelectTicket,
  className,
}: ReadinessPanelProps) {
  const { t } = useTranslation('projectMode');

  const eligibleTickets = readiness?.eligibleRunnable ?? [];
  const pendingApprovals = readiness?.pendingApprovals ?? [];
  const explanations = readiness?.explanations ?? {};
  const laneCapacity = readiness?.laneCapacity;
  const backpressure = readiness?.backpressure;

  // Get tickets that have explanations (blocked/waiting)
  const blockedTickets = Object.entries(explanations).filter(
    ([_, reasons]) => reasons.length > 0
  );

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* E4: Backpressure Banner (top priority) */}
      <BackpressureBanner backpressure={backpressure} />

      {/* Eligible Tickets Section (E1) */}
      <section>
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          {t('readiness.title')}
        </h3>

        {eligibleTickets.length > 0 ? (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground mb-1">
              {eligibleTickets.length === 1
                ? t('readiness.nextRunnable.title')
                : t('readiness.eligibleTickets.subtitle')}
            </div>
            {eligibleTickets.map((eligible) => (
              <EligibleTicketCard
                key={eligible.ticketId}
                eligible={eligible}
                onSelect={() => onSelectTicket(eligible.ticketId)}
              />
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground px-3 py-2 bg-muted/30 rounded-lg">
            No tickets ready to execute
          </div>
        )}
      </section>

      {/* E3: Lane Capacity Section */}
      <LaneCapacityPanel laneCapacity={laneCapacity} />

      {/* Pending Approvals Section */}
      {pendingApprovals.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            {t('readiness.pendingApprovals.title')}
          </h3>

          <div className="space-y-2">
            {pendingApprovals.map((approval, idx) => (
              <PendingApprovalCard
                key={`${approval.ticketId}-${approval.gate}-${idx}`}
                approval={approval}
                onSelect={() => onSelectTicket(approval.ticketId)}
              />
            ))}
          </div>
        </section>
      )}

      {pendingApprovals.length === 0 && (
        <div className="text-xs text-muted-foreground">
          {t('readiness.pendingApprovals.empty')}
        </div>
      )}

      {/* Explanations Section */}
      {blockedTickets.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
            {t('readiness.explanations.title')}
          </h3>

          <div className="space-y-2 text-xs">
            {blockedTickets.slice(0, 5).map(([ticketId, reasons]) => (
              <div
                key={ticketId}
                className="px-3 py-2 bg-muted/30 rounded-lg"
              >
                <div className="font-mono font-medium">{ticketId}</div>
                <ul className="mt-1 text-muted-foreground list-disc list-inside">
                  {reasons.slice(0, 2).map((reason, i) => (
                    <li key={i}>{reason}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="text-xs text-muted-foreground mt-2 italic">
            {t('readiness.explanations.footer')}
          </div>
        </section>
      )}
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function EligibleTicketCard({
  eligible,
  onSelect,
}: {
  eligible: EligibleTicket;
  onSelect: () => void;
}) {
  const { t } = useTranslation('projectMode');
  const [showWhyEligible, setShowWhyEligible] = useState(false);
  const isRecommended = eligible.rank === 1;

  return (
    <div
      className={cn(
        'w-full rounded-lg transition-colors',
        isRecommended
          ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-500 dark:border-green-600'
          : 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
      )}
    >
      {/* Main clickable area */}
      <button
        onClick={onSelect}
        className="w-full text-left px-3 py-2 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-t-lg"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold',
                isRecommended
                  ? 'bg-green-500 text-white'
                  : 'bg-green-200 dark:bg-green-800 text-green-900 dark:text-green-100'
              )}
            >
              {eligible.rank}
            </span>
            <span className="font-mono text-sm font-medium">{eligible.ticketId}</span>
          </div>
          {isRecommended && (
            <span className="text-xs font-semibold text-green-600 dark:text-green-400">
              {t('readiness.eligibleTickets.recommended')}
            </span>
          )}
        </div>
      </button>

      {/* E5: "Why Eligible" collapsible section */}
      {eligible.reasons.length > 0 && (
        <div className="border-t border-green-200 dark:border-green-800">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowWhyEligible(!showWhyEligible);
            }}
            className="w-full flex items-center gap-1 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showWhyEligible ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            <span>{t('readiness.eligibleTickets.whyEligible', { defaultValue: 'Why eligible' })}</span>
          </button>
          
          {showWhyEligible && (
            <div className="px-3 pb-2 text-xs">
              <ul className="space-y-1 ml-4">
                {eligible.reasons.map((reason, idx) => (
                  <li key={idx} className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                    <span className="text-muted-foreground">{reason}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[10px] text-muted-foreground/70 italic">
                {t('readiness.eligibleTickets.whyEligibleNote', { 
                  defaultValue: 'Evidence used for ranking. Human decides execution.' 
                })}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PendingApprovalCard({
  approval,
  onSelect,
}: {
  approval: PendingApproval;
  onSelect: () => void;
}) {
  const { t } = useTranslation('projectMode');
  const gateKey = approval.gate.toUpperCase() as keyof typeof GATE_ICONS;
  const icon = GATE_ICONS[gateKey] || <Clock className="h-4 w-4" />;

  // Calculate time since waiting
  const waitingSince = approval.waitingSince
    ? formatTimeAgo(approval.waitingSince)
    : '';

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full text-left px-3 py-2 rounded-lg',
        'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800',
        'hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors'
      )}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-medium">
          {t(`readiness.pendingApprovals.gates.${approval.gate.toLowerCase()}`, {
            defaultValue: approval.gate,
          })}
        </span>
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="font-mono text-sm">{approval.ticketId}</span>
        {waitingSince && (
          <span className="text-xs text-muted-foreground">{waitingSince}</span>
        )}
      </div>
    </button>
  );
}

function formatTimeAgo(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return '';
  }
}
