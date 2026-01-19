/**
 * Chronicle Diff Viewer
 * 
 * Renders diffs from Chronicle ARTIFACTS_PRODUCED events.
 * Truth comes from Chronicle, not local state.
 */

import { useMemo } from 'react';
import { FileCode, Plus, Minus, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ExecutionResult } from '@/api/operator-plane';

interface ChronicleDiffViewerProps {
  artifacts: ExecutionResult['artifacts'] | null;
  className?: string;
}

interface PatchArtifact {
  filePath: string;
  operation: 'create' | 'modify' | 'delete';
  content: string;
  diff: string;
}

export function ChronicleDiffViewer({ artifacts, className }: ChronicleDiffViewerProps) {
  const patches = useMemo(() => {
    if (!artifacts?.patches) return [];
    return artifacts.patches as PatchArtifact[];
  }, [artifacts]);
  
  if (!artifacts || patches.length === 0) {
    return (
      <div className={cn('flex items-center justify-center h-full text-muted-foreground', className)}>
        <div className="text-center space-y-2">
          <FileCode className="h-8 w-8 mx-auto opacity-50" />
          <p className="text-sm">No artifacts to display</p>
          <p className="text-xs">Execute (G2) to produce diff artifacts</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className={cn('space-y-4', className)}>
      {/* Summary */}
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center gap-2">
          <FileCode className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {patches.length} file{patches.length !== 1 ? 's' : ''} changed
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">
            {artifacts.diffSummary}
          </span>
        </div>
      </div>
      
      {/* Patches */}
      {patches.map((patch, index) => (
        <DiffCard key={index} patch={patch} />
      ))}
    </div>
  );
}

interface DiffCardProps {
  patch: PatchArtifact;
}

function DiffCard({ patch }: DiffCardProps) {
  const operationConfig = {
    create: { icon: Plus, color: 'text-green-500', label: 'Added' },
    modify: { icon: Edit, color: 'text-yellow-500', label: 'Modified' },
    delete: { icon: Minus, color: 'text-red-500', label: 'Deleted' },
  };
  
  const config = operationConfig[patch.operation];
  const Icon = config.icon;
  
  // Parse diff into lines
  const diffLines = useMemo(() => {
    return patch.diff.split('\n').map((line, i) => {
      let type: 'add' | 'remove' | 'context' | 'header' = 'context';
      if (line.startsWith('+') && !line.startsWith('+++')) type = 'add';
      else if (line.startsWith('-') && !line.startsWith('---')) type = 'remove';
      else if (line.startsWith('@@') || line.startsWith('---') || line.startsWith('+++')) type = 'header';
      return { line, type, key: i };
    });
  }, [patch.diff]);
  
  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b">
        <div className="flex items-center gap-2">
          <Icon className={cn('h-4 w-4', config.color)} />
          <span className="text-sm font-mono">{patch.filePath}</span>
        </div>
        <span className={cn('text-xs px-2 py-0.5 rounded', config.color, 'bg-current/10')}>
          {config.label}
        </span>
      </div>
      
      {/* Diff content */}
      <div className="overflow-x-auto">
        <pre className="text-xs font-mono p-0 m-0">
          {diffLines.map(({ line, type, key }) => (
            <div
              key={key}
              className={cn(
                'px-3 py-0.5',
                type === 'add' && 'bg-green-500/10 text-green-700 dark:text-green-400',
                type === 'remove' && 'bg-red-500/10 text-red-700 dark:text-red-400',
                type === 'header' && 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
                type === 'context' && 'text-muted-foreground'
              )}
            >
              {line || ' '}
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}

// Export for use in existing DiffsPanel
export function ArtifactsToDiffs(artifacts: ExecutionResult['artifacts'] | null) {
  if (!artifacts?.patches) return [];
  
  return (artifacts.patches as PatchArtifact[]).map((patch) => ({
    oldPath: patch.operation === 'create' ? null : patch.filePath,
    newPath: patch.operation === 'delete' ? null : patch.filePath,
    change: patch.operation === 'create' ? 'added' as const :
            patch.operation === 'delete' ? 'deleted' as const : 'modified' as const,
    additions: patch.diff.split('\n').filter(l => l.startsWith('+') && !l.startsWith('+++')).length,
    deletions: patch.diff.split('\n').filter(l => l.startsWith('-') && !l.startsWith('---')).length,
    content: patch.content,
    diff: patch.diff,
  }));
}
