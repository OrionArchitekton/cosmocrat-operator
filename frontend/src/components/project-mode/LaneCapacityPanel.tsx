/**
 * Lane Capacity Panel (E3)
 *
 * Displays per-lane concurrency limits and current active counts.
 * Shows which lanes are at capacity and why tickets may be blocked.
 *
 * INVARIANT: All data derived from Chronicle via API.
 */

import { useTranslation } from 'react-i18next';
import { Activity, AlertCircle, CheckCircle2 } from 'lucide-react';
import { LaneCapacityStatus } from '@/api/project-mode';
import { cn } from '@/lib/utils';

interface LaneCapacityPanelProps {
  laneCapacity: Record<string, LaneCapacityStatus> | undefined;
  className?: string;
}

export function LaneCapacityPanel({ laneCapacity, className }: LaneCapacityPanelProps) {
  const { t } = useTranslation('projectMode');

  if (!laneCapacity || Object.keys(laneCapacity).length === 0) {
    return null;
  }

  const lanes = Object.values(laneCapacity).sort((a, b) => a.lane.localeCompare(b.lane));
  const hasCapacityIssues = lanes.some((l) => l.atCapacity);

  return (
    <div className={cn('rounded-lg border bg-card', className)}>
      <div className="flex items-center gap-2 px-3 py-2 border-b">
        <Activity className="h-4 w-4 text-muted-foreground" />
        <h4 className="text-xs font-medium">{t('readiness.laneCapacity.title')}</h4>
        {hasCapacityIssues && (
          <span className="ml-auto flex items-center gap-1 text-xs text-amber-600">
            <AlertCircle className="h-3 w-3" />
            {t('readiness.laneCapacity.atCapacity')}
          </span>
        )}
      </div>

      <div className="p-2">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-muted-foreground">
              <th className="text-left py-1 px-2 font-medium">
                {t('readiness.laneCapacity.lane')}
              </th>
              <th className="text-center py-1 px-2 font-medium">
                {t('readiness.laneCapacity.active')}
              </th>
              <th className="text-center py-1 px-2 font-medium">
                {t('readiness.laneCapacity.limit')}
              </th>
              <th className="text-right py-1 px-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {lanes.map((lane) => (
              <LaneRow key={lane.lane} lane={lane} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LaneRow({ lane }: { lane: LaneCapacityStatus }) {
  const { t } = useTranslation('projectMode');
  const isAtCapacity = lane.atCapacity;

  return (
    <tr className={cn('border-t border-dashed', isAtCapacity && 'bg-amber-50 dark:bg-amber-950/20')}>
      <td className="py-1.5 px-2 font-mono">
        {lane.lane}
      </td>
      <td className="py-1.5 px-2 text-center">
        <span className={cn(
          'inline-flex items-center justify-center min-w-[1.5rem] rounded',
          isAtCapacity ? 'text-amber-700 font-medium' : 'text-foreground'
        )}>
          {lane.active}
        </span>
      </td>
      <td className="py-1.5 px-2 text-center text-muted-foreground">
        {lane.limit}
      </td>
      <td className="py-1.5 px-2 text-right">
        {isAtCapacity ? (
          <span className="inline-flex items-center gap-1 text-amber-600">
            <AlertCircle className="h-3 w-3" />
            {t('readiness.laneCapacity.atCapacity')}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-emerald-600">
            <CheckCircle2 className="h-3 w-3" />
            {lane.remaining} {t('readiness.laneCapacity.available')}
          </span>
        )}
      </td>
    </tr>
  );
}
