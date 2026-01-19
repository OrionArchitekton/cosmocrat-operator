/**
 * ReceiptVerifier - P6 Cryptographic Receipt Verification UI
 * 
 * Displays verification status for governance events with cryptographic receipts.
 * Shows: green (all pass), yellow (partial), red (failure)
 * 
 * DOCTRINE: This component is read-only verification display.
 * It never holds or accesses private keys.
 */

import { useState, useCallback } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  RefreshCw,
  ExternalLink,
  Shield,
  Database,
  FileCheck,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ==============================================================================
// Types (match server.py VerificationResponse)
// ==============================================================================

export interface VerificationChecks {
  immudb_verified: boolean;
  payload_digest_match: boolean;
  signature_valid: boolean;
  rekor_inclusion_present: boolean;
}

export interface RekorMetadata {
  log_index: number | null;
  entry_uuid: string | null;
  integrated_time: string | null;
}

export interface ImmudbMetadata {
  tx_id: number | null;
  state_hash: string | null;
}

export interface VerificationResult {
  status: 'green' | 'yellow' | 'red';
  receipt_id: string;
  cid: string;
  checks: VerificationChecks;
  rekor: RekorMetadata;
  immudb: ImmudbMetadata;
  error: string | null;
  warnings: string[];
}

// ==============================================================================
// Status Badge Component
// ==============================================================================

interface StatusBadgeProps {
  status: 'green' | 'yellow' | 'red' | 'loading' | 'unknown';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function StatusBadge({ status, size = 'md', showLabel = true }: StatusBadgeProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  const labels = {
    green: 'Verified',
    yellow: 'Partial',
    red: 'Failed',
    loading: 'Checking...',
    unknown: 'Unknown',
  };

  return (
    <div className="flex items-center gap-1.5">
      {status === 'green' && (
        <CheckCircle2 className={cn(sizeClasses[size], 'text-green-500')} />
      )}
      {status === 'yellow' && (
        <AlertCircle className={cn(sizeClasses[size], 'text-yellow-500')} />
      )}
      {status === 'red' && (
        <XCircle className={cn(sizeClasses[size], 'text-red-500')} />
      )}
      {status === 'loading' && (
        <Loader2 className={cn(sizeClasses[size], 'text-muted-foreground animate-spin')} />
      )}
      {status === 'unknown' && (
        <Shield className={cn(sizeClasses[size], 'text-muted-foreground')} />
      )}
      {showLabel && (
        <span
          className={cn(
            'text-sm font-medium',
            status === 'green' && 'text-green-600',
            status === 'yellow' && 'text-yellow-600',
            status === 'red' && 'text-red-600',
            (status === 'loading' || status === 'unknown') && 'text-muted-foreground'
          )}
        >
          {labels[status]}
        </span>
      )}
    </div>
  );
}

// ==============================================================================
// Main ReceiptVerifier Component
// ==============================================================================

interface ReceiptVerifierProps {
  /** Receipt ID to verify */
  receiptId?: string;
  /** CID to verify */
  cid?: string;
  /** Event ID to verify (will look up receipt_bound_id or cid) */
  eventId?: string;
  /** API base URL */
  apiBaseUrl?: string;
  /** Initial verification result (if already fetched) */
  initialResult?: VerificationResult;
  /** Compact mode for inline display */
  compact?: boolean;
  /** Callback when verification completes */
  onVerified?: (result: VerificationResult) => void;
}

export function ReceiptVerifier({
  receiptId,
  cid,
  eventId,
  apiBaseUrl = '',
  initialResult,
  compact = false,
  onVerified,
}: ReceiptVerifierProps) {
  const [result, setResult] = useState<VerificationResult | null>(initialResult || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verify = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let url: string;
      if (eventId) {
        url = `${apiBaseUrl}/api/chronicle/events/${eventId}/verify`;
      } else if (receiptId) {
        url = `${apiBaseUrl}/api/receipts/${receiptId}/verify`;
      } else if (cid) {
        // Normalize CID (remove prefix if present for URL)
        const normalizedCid = cid.replace(/^cid:/, '');
        url = `${apiBaseUrl}/api/cids/${normalizedCid}/verify`;
      } else {
        throw new Error('No receipt ID, CID, or event ID provided');
      }

      const response = await fetch(url);
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Verification failed: ${response.status}`);
      }

      const data: VerificationResult = await response.json();
      setResult(data);
      onVerified?.(data);
      
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [receiptId, cid, eventId, apiBaseUrl, onVerified]);

  // Compact mode: just the badge with re-verify button
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <StatusBadge
          status={loading ? 'loading' : result?.status || 'unknown'}
          size="sm"
          showLabel={false}
        />
        <button
          onClick={verify}
          disabled={loading}
          className="p-1 rounded hover:bg-muted transition-colors"
          title="Re-verify"
        >
          <RefreshCw className={cn('h-3 w-3', loading && 'animate-spin')} />
        </button>
      </div>
    );
  }

  // Full display mode
  return (
    <div className="space-y-4 p-4 border rounded-lg bg-card">
      {/* Header with status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Receipt Verification</h3>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={loading ? 'loading' : result?.status || 'unknown'} />
          <button
            onClick={verify}
            disabled={loading}
            className="p-2 rounded-md hover:bg-muted transition-colors"
            title="Re-verify"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Verification result details */}
      {result && (
        <div className="space-y-3">
          {/* IDs */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">CID:</span>
              <p className="font-mono text-xs truncate" title={result.cid}>
                {result.cid || '-'}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Receipt ID:</span>
              <p className="font-mono text-xs truncate" title={result.receipt_id}>
                {result.receipt_id || '-'}
              </p>
            </div>
          </div>

          {/* Check results */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Verification Checks</h4>
            <div className="grid grid-cols-2 gap-2">
              <CheckItem
                label="immudb Verified"
                passed={result.checks.immudb_verified}
                icon={Database}
              />
              <CheckItem
                label="Payload Match"
                passed={result.checks.payload_digest_match}
                icon={FileCheck}
              />
              <CheckItem
                label="Signature Valid"
                passed={result.checks.signature_valid}
                icon={Shield}
              />
              <CheckItem
                label="Rekor Inclusion"
                passed={result.checks.rekor_inclusion_present}
                icon={ExternalLink}
              />
            </div>
          </div>

          {/* Rekor metadata */}
          {(result.rekor.log_index || result.rekor.entry_uuid) && (
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-muted-foreground">Rekor Log</h4>
              <div className="flex items-center gap-4 text-xs">
                {result.rekor.log_index !== null && (
                  <span>Index: {result.rekor.log_index}</span>
                )}
                {result.rekor.entry_uuid && (
                  <a
                    href={`https://search.sigstore.dev/?uuid=${result.rekor.entry_uuid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-500 hover:underline"
                  >
                    View in Rekor
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* immudb metadata */}
          {result.immudb.tx_id !== null && (
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-muted-foreground">immudb Ledger</h4>
              <div className="text-xs">
                <span>TX ID: {result.immudb.tx_id}</span>
                {result.immudb.state_hash && (
                  <span className="ml-4 font-mono truncate">
                    State: {result.immudb.state_hash.slice(0, 16)}...
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Warnings */}
          {result.warnings.length > 0 && (
            <div className="space-y-1">
              <h4 className="text-sm font-medium text-yellow-600">Warnings</h4>
              <ul className="text-xs text-yellow-600 list-disc list-inside">
                {result.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Error from verification */}
          {result.error && (
            <div className="p-2 bg-red-50 dark:bg-red-950 rounded text-xs text-red-600">
              {result.error}
            </div>
          )}
        </div>
      )}

      {/* Initial state: prompt to verify */}
      {!result && !loading && !error && (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground mb-3">
            Click to verify this receipt's cryptographic integrity
          </p>
          <button
            onClick={verify}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Verify Receipt
          </button>
        </div>
      )}
    </div>
  );
}

// ==============================================================================
// Check Item Component
// ==============================================================================

interface CheckItemProps {
  label: string;
  passed: boolean;
  icon: React.ComponentType<{ className?: string }>;
}

function CheckItem({ label, passed, icon: Icon }: CheckItemProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 p-2 rounded-md text-sm',
        passed ? 'bg-green-50 dark:bg-green-950' : 'bg-red-50 dark:bg-red-950'
      )}
    >
      <Icon className={cn('h-4 w-4', passed ? 'text-green-500' : 'text-red-500')} />
      <span className={passed ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}>
        {label}
      </span>
      {passed ? (
        <CheckCircle2 className="h-3 w-3 text-green-500 ml-auto" />
      ) : (
        <XCircle className="h-3 w-3 text-red-500 ml-auto" />
      )}
    </div>
  );
}

// ==============================================================================
// Receipt Pill (for event list rows)
// ==============================================================================

interface ReceiptPillProps {
  status?: 'green' | 'yellow' | 'red';
  receiptId?: string;
  cid?: string;
  onClick?: () => void;
}

export function ReceiptPill({ status, receiptId, cid, onClick }: ReceiptPillProps) {
  const hasReceipt = Boolean(receiptId || cid);
  
  return (
    <button
      onClick={onClick}
      disabled={!hasReceipt}
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors',
        hasReceipt && 'cursor-pointer hover:opacity-80',
        !hasReceipt && 'cursor-not-allowed opacity-50',
        status === 'green' && 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
        status === 'yellow' && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
        status === 'red' && 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
        !status && 'bg-muted text-muted-foreground'
      )}
    >
      <Shield className="h-3 w-3" />
      {status ? (status === 'green' ? '✓' : status === 'yellow' ? '?' : '✗') : '-'}
    </button>
  );
}

export default ReceiptVerifier;
