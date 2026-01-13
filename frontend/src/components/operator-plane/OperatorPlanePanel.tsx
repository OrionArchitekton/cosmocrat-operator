/**
 * Operator Plane Panel
 * 
 * Main container for the P0 governed loop.
 * Combines: Intent form, Gate status, Execution controls, Diff viewer.
 * 
 * INVARIANT: Truth comes from Chronicle, not local state.
 */

import { useOperatorPlane } from '@/hooks/useOperatorPlane';
import { IntentForm } from './IntentForm';
import { GateStatusPanel, GateStatusInline } from './GateStatus';
import { ExecutionControls } from './ExecutionControls';
import { ChronicleDiffViewer } from './ChronicleDiffViewer';
import { Button } from '@/components/ui/button';
import { RefreshCw, History, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OperatorPlanePanelProps {
  taskId?: string;
  worktree?: string;
  branch?: string;
  className?: string;
}

export function OperatorPlanePanel({
  taskId,
  worktree = '',
  branch = 'main',
  className,
}: OperatorPlanePanelProps) {
  const {
    receiptId,
    gates,
    events,
    artifacts,
    error,
    isLoading,
    submitIntent,
    execute,
    approve,
    reject,
    reset,
    refetchEvents,
  } = useOperatorPlane(taskId);
  
  const hasStarted = gates.g1 === 'passed';
  const isComplete = gates.g4 === 'passed' || gates.g4 === 'failed';
  
  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-3">
          <h2 className="text-sm font-semibold">Operator Plane</h2>
          {hasStarted && <GateStatusInline gates={gates} />}
        </div>
        
        <div className="flex items-center gap-2">
          {receiptId && (
            <span className="text-xs text-muted-foreground font-mono">
              {receiptId.slice(0, 8)}...
            </span>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetchEvents()}
            disabled={!receiptId}
            title="Refresh from Chronicle"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          
          {isComplete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={reset}
              title="Start new intent"
            >
              <History className="mr-1.5 h-4 w-4" />
              New
            </Button>
          )}
        </div>
      </div>
      
      {/* Main content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-full">
          {/* Left: Controls */}
          <div className="lg:col-span-1 space-y-4">
            {/* Intent form - only show if not started */}
            {!hasStarted && (
              <IntentForm
                onSubmit={submitIntent}
                isLoading={isLoading}
                defaultWorktree={worktree}
                defaultBranch={branch}
              />
            )}
            
            {/* Gate status - show after started */}
            {hasStarted && (
              <GateStatusPanel gates={gates} />
            )}
            
            {/* Execution controls */}
            {hasStarted && (
              <ExecutionControls
                gates={gates}
                onExecute={execute}
                onApprove={approve}
                onReject={reject}
                isLoading={isLoading}
                error={error}
                artifactsCount={artifacts?.patches?.length ?? 0}
              />
            )}
            
            {/* Chronicle events summary */}
            {events.length > 0 && (
              <div className="p-3 border rounded-lg bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Chronicle Events
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {events.length}
                  </span>
                </div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {events.map((event, i) => (
                    <div
                      key={event.eventId || i}
                      className="text-xs font-mono text-muted-foreground truncate"
                      title={`${event.eventType} at ${event.timestamp}`}
                    >
                      {event.eventType}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Right: Diff viewer */}
          <div className="lg:col-span-2 border rounded-lg overflow-hidden">
            <div className="px-3 py-2 bg-muted/50 border-b flex items-center justify-between">
              <span className="text-sm font-medium">Diff Preview</span>
              {artifacts && (
                <span className="text-xs text-muted-foreground">
                  From Chronicle
                </span>
              )}
            </div>
            <div className="p-3 h-[calc(100%-40px)] overflow-auto">
              <ChronicleDiffViewer artifacts={artifacts} />
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="px-4 py-2 border-t text-xs text-muted-foreground flex items-center justify-between">
        <span>
          {isComplete 
            ? 'Loop complete. Click "New" to start another intent.'
            : hasStarted 
              ? 'Truth source: Chronicle'
              : 'Submit an intent to begin the governed loop.'
          }
        </span>
        <a 
          href="https://docs.cosmocrat.ai/operator-plane" 
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 hover:text-foreground"
        >
          Docs <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
