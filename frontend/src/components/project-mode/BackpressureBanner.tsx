/**
 * Backpressure Banner (E4)
 *
 * Displays when backpressure is active, pausing new executions.
 * Shows why backpressure was triggered and current signal values.
 *
 * INVARIANT: All data derived from Chronicle via API.
 */

import { useTranslation } from 'react-i18next';
import { AlertTriangle, Activity, Clock, XCircle, CheckCircle2 } from 'lucide-react';
import { BackpressureStatus } from '@/api/project-mode';
import { cn } from '@/lib/utils';

interface BackpressureBannerProps {
  backpressure: BackpressureStatus | null | undefined;
  className?: string;
}

export function BackpressureBanner({ backpressure, className }: BackpressureBannerProps) {
  const { t } = useTranslation('projectMode');

  // Don't render if no backpressure data or not active
  if (!backpressure || !backpressure.active) {
    return null;
  }

  const { signals, triggeredBy, reason, since } = backpressure;

  // Format the since timestamp if available
  const formattedSince = since ? formatTimeAgo(since) : null;

  return (
    <div
      className={cn(
        'rounded-lg border-2 border-amber-500 bg-amber-50 dark:bg-amber-950/30 p-4',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 p-2 rounded-full bg-amber-100 dark:bg-amber-900/50">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-100">
            {t('readiness.backpressure.title')}
          </h3>
          <p className="text-sm text-amber-700 dark:text-amber-300 mt-0.5">
            {t('readiness.backpressure.body')}
          </p>
        </div>
        {formattedSince && (
          <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
            <Clock className="h-3 w-3" />
            {formattedSince}
          </div>
        )}
      </div>

      {/* Reason / Triggered By */}
      {triggeredBy && triggeredBy.length > 0 && (
        <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-800">
          <div className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-2">
            {t('readiness.backpressure.triggeredBy')}:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {triggeredBy.map((trigger) => (
              <TriggerBadge key={trigger} trigger={trigger} />
            ))}
          </div>
        </div>
      )}

      {/* Signals */}
      <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-800">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SignalCard
            icon={<Activity className="h-4 w-4" />}
            label={t('readiness.backpressure.signals.activeAttempts')}
            value={signals.activeAttempts}
            isTriggered={triggeredBy?.includes('active_attempts')}
          />
          <SignalCard
            icon={<XCircle className="h-4 w-4" />}
            label={t('readiness.backpressure.signals.recentFailures')}
            value={signals.recentFailures}
            isTriggered={triggeredBy?.includes('recent_failures')}
          />
          <SignalCard
            icon={<AlertTriangle className="h-4 w-4" />}
            label={t('readiness.backpressure.signals.errorStreak')}
            value={signals.errorStreak}
            isTriggered={triggeredBy?.includes('error_streak')}
          />
          <SignalCard
            icon={<Clock className="h-4 w-4" />}
            label={t('readiness.backpressure.signals.avgLatency')}
            value={signals.avgLatencyMs > 0 ? `${Math.round(signals.avgLatencyMs)}ms` : '-'}
            isTriggered={triggeredBy?.includes('avg_latency')}
          />
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function TriggerBadge({ trigger }: { trigger: string }) {
  const labelMap: Record<string, string> = {
    active_attempts: 'Active Attempts',
    error_streak: 'Error Streak',
    avg_latency: 'Latency',
    recent_failures: 'Recent Failures',
  };

  const label = labelMap[trigger] || trigger;

  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200">
      {label}
    </span>
  );
}

function SignalCard({
  icon,
  label,
  value,
  isTriggered,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  isTriggered?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-col p-2 rounded-lg',
        isTriggered
          ? 'bg-amber-200/50 dark:bg-amber-800/50'
          : 'bg-amber-100/50 dark:bg-amber-900/30'
      )}
    >
      <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
        {icon}
        <span className="text-xs font-medium truncate">{label}</span>
      </div>
      <div
        className={cn(
          'mt-1 text-lg font-bold',
          isTriggered
            ? 'text-amber-700 dark:text-amber-300'
            : 'text-amber-600 dark:text-amber-400'
        )}
      >
        {value}
      </div>
    </div>
  );
}

// =============================================================================
// Helpers
// =============================================================================

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
