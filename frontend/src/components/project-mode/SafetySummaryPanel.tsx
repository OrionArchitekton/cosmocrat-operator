/**
 * Safety Summary Panel (E5)
 *
 * Displays "why this is safe" evidence for parallel sets and tickets.
 * Shows pass/warn/fail status for each safety category with evidence.
 *
 * INVARIANT: All data derived from Chronicle via API.
 * INVARIANT: Never implies autonomy - "evidence used to recommend safety"
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Shield,
  Info,
} from 'lucide-react';
import { SafetySummary, SafetyExplanation, SafetyStatus } from '@/api/project-mode';
import { cn } from '@/lib/utils';

interface SafetySummaryPanelProps {
  summary: SafetySummary | null | undefined;
  className?: string;
  compact?: boolean;
}

const STATUS_CONFIG: Record<SafetyStatus, { icon: React.ReactNode; color: string; bgColor: string }> = {
  pass: {
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
  },
  warn: {
    icon: <AlertTriangle className="h-4 w-4" />,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
  },
  fail: {
    icon: <XCircle className="h-4 w-4" />,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
  },
};

export function SafetySummaryPanel({ summary, className, compact = false }: SafetySummaryPanelProps) {
  const { t } = useTranslation('projectMode');
  const [expanded, setExpanded] = useState(!compact);

  if (!summary) {
    return null;
  }

  const { overall, explanations } = summary;
  const config = STATUS_CONFIG[overall];

  const passedChecks = explanations.filter((e) => e.status === 'pass');
  const warningChecks = explanations.filter((e) => e.status === 'warn');
  const failedChecks = explanations.filter((e) => e.status === 'fail');

  return (
    <div className={cn('rounded-lg border', config.bgColor, className)}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <div className={cn('flex-shrink-0', config.color)}>
          <Shield className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold">
              {t('parallelSets.safetySummary.title')}
            </h4>
            <OverallBadge status={overall} />
          </div>
          {!expanded && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {passedChecks.length} passed, {warningChecks.length} warnings, {failedChecks.length} failed
            </p>
          )}
        </div>
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* Failed checks first */}
          {failedChecks.length > 0 && (
            <CheckGroup
              title={t('parallelSets.safetySummary.status.fail')}
              checks={failedChecks}
              status="fail"
            />
          )}

          {/* Warnings second */}
          {warningChecks.length > 0 && (
            <CheckGroup
              title={t('parallelSets.safetySummary.status.warn')}
              checks={warningChecks}
              status="warn"
            />
          )}

          {/* Passed checks last */}
          {passedChecks.length > 0 && (
            <CheckGroup
              title={t('parallelSets.safetySummary.status.pass')}
              checks={passedChecks}
              status="pass"
              defaultCollapsed={failedChecks.length > 0 || warningChecks.length > 0}
            />
          )}

          {/* Disclaimer */}
          <div className="flex items-start gap-2 pt-2 border-t border-dashed text-xs text-muted-foreground">
            <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <p>{t('parallelSets.safetySummary.disclaimer')}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function OverallBadge({ status }: { status: SafetyStatus }) {
  const { t } = useTranslation('projectMode');
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
        config.color,
        status === 'pass' && 'bg-emerald-100 dark:bg-emerald-900/50',
        status === 'warn' && 'bg-amber-100 dark:bg-amber-900/50',
        status === 'fail' && 'bg-red-100 dark:bg-red-900/50'
      )}
    >
      {config.icon}
      {t(`parallelSets.safetySummary.overall.${status}`)}
    </span>
  );
}

function CheckGroup({
  title,
  checks,
  status,
  defaultCollapsed = false,
}: {
  title: string;
  checks: SafetyExplanation[];
  status: SafetyStatus;
  defaultCollapsed?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const config = STATUS_CONFIG[status];

  return (
    <div>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-2 text-xs font-medium mb-1"
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
        <span className={config.color}>
          {title} ({checks.length})
        </span>
      </button>

      {!collapsed && (
        <div className="space-y-1 ml-5">
          {checks.map((check, idx) => (
            <CheckItem key={`${check.category}-${idx}`} explanation={check} />
          ))}
        </div>
      )}
    </div>
  );
}

function CheckItem({ explanation }: { explanation: SafetyExplanation }) {
  const { t } = useTranslation('projectMode');
  const [showEvidence, setShowEvidence] = useState(false);
  const config = STATUS_CONFIG[explanation.status];

  const categoryLabel = t(
    `parallelSets.safetySummary.categories.${explanation.category}`,
    { defaultValue: explanation.category }
  );

  return (
    <div className={cn('rounded p-2 text-xs', config.bgColor)}>
      <div className="flex items-start gap-2">
        <span className={cn('flex-shrink-0 mt-0.5', config.color)}>
          {config.icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium">{categoryLabel}</span>
          </div>
          <p className="text-muted-foreground mt-0.5">{explanation.statement}</p>

          {/* Evidence toggle */}
          {Object.keys(explanation.evidence).length > 0 && (
            <button
              onClick={() => setShowEvidence(!showEvidence)}
              className="flex items-center gap-1 mt-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showEvidence ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              {t('parallelSets.safetySummary.evidence')}
            </button>
          )}

          {showEvidence && (
            <pre className="mt-1 p-2 rounded bg-muted/50 text-[10px] overflow-x-auto">
              {JSON.stringify(explanation.evidence, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Compact Badge for inline use
// =============================================================================

export function SafetyStatusBadge({ status }: { status: SafetyStatus }) {
  const { t } = useTranslation('projectMode');
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium',
        config.color,
        status === 'pass' && 'bg-emerald-100 dark:bg-emerald-900/50',
        status === 'warn' && 'bg-amber-100 dark:bg-amber-900/50',
        status === 'fail' && 'bg-red-100 dark:bg-red-900/50'
      )}
    >
      {config.icon}
      {t(`parallelSets.safetySummary.status.${status}`)}
    </span>
  );
}
