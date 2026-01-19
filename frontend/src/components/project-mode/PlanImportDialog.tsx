/**
 * Plan Import Dialog
 *
 * Dialog for importing roadmap/plan artifacts (Conductor MD, Plan MD, or YAML).
 * Part of P2: Roadmap + Checklist Ingest.
 *
 * This dialog performs the FULL IMPORT FLOW:
 * 1. Import plan (parse and hash)
 * 2. Propose expansion (generate ticket DAG)
 * 3. Approve expansion (materialize tickets)
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, Loader2, FileText, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useProjectMode } from '@/hooks/useProjectMode';

type PlanFormat = 'conductor_md' | 'plan_md' | 'yaml';
type ImportStep = 'input' | 'importing' | 'proposing' | 'approving' | 'done';

interface PlanImportDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (ticketCount: number) => void;
}

export function PlanImportDialog({
  projectId,
  open,
  onOpenChange,
  onSuccess,
}: PlanImportDialogProps) {
  const { t } = useTranslation('projectMode');
  const [format, setFormat] = useState<PlanFormat>('conductor_md');
  const [content, setContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<ImportStep>('input');
  const [ticketCount, setTicketCount] = useState(0);

  const { 
    importPlan, 
    proposeExpansion, 
    approveExpansion,
    isImportLoading,
    isProposeLoading,
    isApproveLoading,
  } = useProjectMode(projectId);

  const isLoading = isImportLoading || isProposeLoading || isApproveLoading;

  const handleImport = async () => {
    if (!content.trim()) {
      setError('Please enter plan content');
      return;
    }

    setError(null);
    
    try {
      // Step 1: Import plan
      setStep('importing');
      console.log('[PlanImport] Step 1: Importing plan...');
      const importResult = await importPlan(content, format);
      console.log('[PlanImport] Plan imported:', importResult);
      
      // Step 2: Propose expansion
      setStep('proposing');
      console.log('[PlanImport] Step 2: Proposing expansion...');
      const proposeResult = await proposeExpansion(importResult.planRefId);
      console.log('[PlanImport] Expansion proposed:', proposeResult);
      
      // Step 3: Approve expansion (auto-approve for import flow)
      setStep('approving');
      console.log('[PlanImport] Step 3: Approving expansion...');
      const approveResult = await approveExpansion(proposeResult.expansionId, 'Auto-approved from import');
      console.log('[PlanImport] Expansion approved:', approveResult);
      
      // Done!
      setStep('done');
      setTicketCount(approveResult.ticketIds?.length ?? proposeResult.ticketsPreview?.length ?? 0);
      
      // Close after brief success display
      setTimeout(() => {
        onOpenChange(false);
        setContent('');
        setStep('input');
        if (onSuccess) {
          onSuccess(approveResult.ticketIds?.length ?? 0);
        }
      }, 1500);
      
    } catch (err) {
      console.error('[PlanImport] Error:', err);
      setError(err instanceof Error ? err.message : 'Import failed');
      setStep('input');
    }
  };

  const handleClose = () => {
    setContent('');
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t('import.title')}
          </DialogTitle>
          <DialogDescription>{t('import.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Format Selection */}
          <div className="space-y-2">
            <Label>{t('import.formatLabel')}</Label>
            <div className="flex gap-2">
              <Button
                variant={format === 'conductor_md' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFormat('conductor_md')}
              >
                {t('import.formats.conductor_md')}
              </Button>
              <Button
                variant={format === 'plan_md' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFormat('plan_md')}
              >
                {t('import.formats.plan_md')}
              </Button>
              <Button
                variant={format === 'yaml' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFormat('yaml')}
              >
                {t('import.formats.yaml')}
              </Button>
            </div>
          </div>

          {/* Content Input */}
          <div className="space-y-2">
            <Label>{t('import.contentLabel')}</Label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('import.contentPlaceholder')}
              className="w-full h-64 px-3 py-2 text-sm border rounded-md font-mono resize-none"
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
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={isLoading || !content.trim()}>
            {step === 'importing' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing plan...
              </>
            ) : step === 'proposing' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating tickets...
              </>
            ) : step === 'approving' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Approving tickets...
              </>
            ) : step === 'done' ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                {ticketCount} tickets created!
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                {t('import.importButton')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
