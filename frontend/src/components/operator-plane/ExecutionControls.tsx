/**
 * Execution and Approval Controls
 * 
 * G2: Execute button (only appears after G1)
 * G4: Approve/Reject buttons (only appear after G2)
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Play, 
  Check, 
  X, 
  Loader2, 
  AlertTriangle,
  FileCode,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GateStates } from '@/hooks/useOperatorPlane';

interface ExecutionControlsProps {
  gates: GateStates;
  onExecute: () => Promise<void>;
  onApprove: (comment?: string) => Promise<void>;
  onReject: (comment?: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  artifactsCount?: number;
}

export function ExecutionControls({
  gates,
  onExecute,
  onApprove,
  onReject,
  isLoading,
  error,
  artifactsCount = 0,
}: ExecutionControlsProps) {
  const [comment, setComment] = useState('');
  const [showComment, setShowComment] = useState(false);
  
  const canExecute = gates.g1 === 'passed' && gates.g2 !== 'passed';
  const canApprove = gates.g3 === 'passed' && gates.g4 === 'waiting';
  
  const handleApprove = async () => {
    await onApprove(comment || undefined);
    setComment('');
    setShowComment(false);
  };
  
  const handleReject = async () => {
    await onReject(comment || undefined);
    setComment('');
    setShowComment(false);
  };
  
  return (
    <div className="space-y-4">
      {/* Error display */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-500">{error}</p>
        </div>
      )}
      
      {/* G2: Execute button */}
      {canExecute && (
        <div className="p-4 border rounded-lg bg-card space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-yellow-500 text-white text-xs">
              G2
            </span>
            <span>Authorize Execution</span>
          </div>
          
          <p className="text-sm text-muted-foreground">
            Intent has been logged. Click Execute to invoke CCA and produce artifacts.
          </p>
          
          <Button
            onClick={onExecute}
            disabled={isLoading}
            className="w-full"
            variant="default"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Executing...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Execute (G2)
              </>
            )}
          </Button>
        </div>
      )}
      
      {/* G2 passed - show artifacts count */}
      {gates.g2 === 'passed' && gates.g4 !== 'passed' && gates.g4 !== 'failed' && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
          <FileCode className="h-4 w-4 text-green-500" />
          <span className="text-sm text-green-500">
            Execution complete. {artifactsCount} artifact(s) ready for review.
          </span>
        </div>
      )}
      
      {/* G4: Approve/Reject buttons */}
      {canApprove && (
        <div className="p-4 border rounded-lg bg-card space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white text-xs">
              G4
            </span>
            <span>Apply Decision</span>
          </div>
          
          <p className="text-sm text-muted-foreground">
            Review the diff above. Approve to apply patches to worktree, or reject to discard.
          </p>
          
          {/* Optional comment */}
          {showComment ? (
            <div className="space-y-2">
              <Label htmlFor="approval-comment">Comment (optional)</Label>
              <Textarea
                id="approval-comment"
                placeholder="Add a note about this decision..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="min-h-[60px]"
              />
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowComment(true)}
              className="text-muted-foreground"
            >
              <MessageSquare className="mr-1.5 h-3 w-3" />
              Add comment
            </Button>
          )}
          
          <div className="flex gap-2">
            <Button
              onClick={handleApprove}
              disabled={isLoading}
              className="flex-1"
              variant="default"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Approve
            </Button>
            
            <Button
              onClick={handleReject}
              disabled={isLoading}
              className="flex-1"
              variant="destructive"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <X className="mr-2 h-4 w-4" />
              )}
              Reject
            </Button>
          </div>
        </div>
      )}
      
      {/* G4 passed */}
      {gates.g4 === 'passed' && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
          <Check className="h-4 w-4 text-green-500" />
          <span className="text-sm text-green-500">
            Patch applied successfully. Changes are in the worktree.
          </span>
        </div>
      )}
      
      {/* G4 rejected */}
      {gates.g4 === 'failed' && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <X className="h-4 w-4 text-red-500" />
          <span className="text-sm text-red-500">
            Patch rejected. No changes applied. Attempt logged to Chronicle.
          </span>
        </div>
      )}
    </div>
  );
}
