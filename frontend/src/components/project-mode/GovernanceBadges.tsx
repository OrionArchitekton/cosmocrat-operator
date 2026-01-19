/**
 * Governance Badges
 *
 * Shows Chronicle, Gates, and Mode status indicators.
 * Always visible to confirm governance is active.
 */

import { useTranslation } from 'react-i18next';
import { CheckCircle, Shield, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GovernanceBadgesProps {
  className?: string;
}

export function GovernanceBadges({ className }: GovernanceBadgesProps) {
  const { t } = useTranslation('projectMode');

  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      {/* Chronicle Status */}
      <div className="flex items-center gap-1.5 text-xs">
        <Activity className="h-3.5 w-3.5 text-green-500" />
        <span className="text-muted-foreground">{t('governance.chronicleLabel')}:</span>
        <span className="text-green-600 font-medium">✔ {t('governance.recording')}</span>
      </div>

      {/* Gates Status */}
      <div className="flex items-center gap-1.5 text-xs">
        <Shield className="h-3.5 w-3.5 text-blue-500" />
        <span className="text-muted-foreground">{t('governance.gatesLabel')}:</span>
        <span className="text-blue-600 font-medium">✔ {t('governance.enforced')}</span>
      </div>

      {/* Mode Status */}
      <div className="flex items-center gap-1.5 text-xs">
        <CheckCircle className="h-3.5 w-3.5 text-amber-500" />
        <span className="text-muted-foreground">{t('governance.modeLabel')}:</span>
        <span className="text-amber-600 font-medium">{t('governance.singleAttempt')}</span>
      </div>
    </div>
  );
}
