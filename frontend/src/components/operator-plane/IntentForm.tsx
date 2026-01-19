/**
 * Intent Submission Form (G1 Gate)
 * 
 * Replaces the chat box for Operator Plane v1.
 * Captures operator intent and submits to adapter.
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Send } from 'lucide-react';

interface IntentFormProps {
  onSubmit: (description: string, targetFiles: string[], worktree: string, branch: string) => Promise<unknown>;
  isLoading: boolean;
  disabled?: boolean;
  defaultWorktree?: string;
  defaultBranch?: string;
}

export function IntentForm({
  onSubmit,
  isLoading,
  disabled = false,
  defaultWorktree = '',
  defaultBranch = 'main',
}: IntentFormProps) {
  const [description, setDescription] = useState('');
  const [targetFiles, setTargetFiles] = useState('');
  const [worktree, setWorktree] = useState(defaultWorktree);
  const [branch, setBranch] = useState(defaultBranch);
  
  const handleSubmit = useCallback(async () => {
    if (!description.trim()) return;
    
    const files = targetFiles
      .split(',')
      .map(f => f.trim())
      .filter(f => f.length > 0);
    
    await onSubmit(description, files, worktree, branch);
    
    // Clear form on success
    setDescription('');
    setTargetFiles('');
  }, [description, targetFiles, worktree, branch, onSubmit]);
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.metaKey && !isLoading && !disabled) {
      handleSubmit();
    }
  };
  
  return (
    <div className="space-y-4 p-4 border rounded-lg bg-card">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-500 text-white text-xs">
          G1
        </span>
        <span>Submit Intent</span>
      </div>
      
      <div className="space-y-3">
        <div>
          <Label htmlFor="intent-description">What do you want to do?</Label>
          <Textarea
            id="intent-description"
            placeholder="Describe the code change you want to make..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading || disabled}
            className="mt-1.5 min-h-[100px]"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="target-files">Target Files (comma-separated)</Label>
            <Input
              id="target-files"
              placeholder="src/main.ts, lib/utils.ts"
              value={targetFiles}
              onChange={(e) => setTargetFiles(e.target.value)}
              disabled={isLoading || disabled}
              className="mt-1.5"
            />
          </div>
          
          <div>
            <Label htmlFor="worktree">Worktree Path</Label>
            <Input
              id="worktree"
              placeholder="/path/to/worktree"
              value={worktree}
              onChange={(e) => setWorktree(e.target.value)}
              disabled={isLoading || disabled}
              className="mt-1.5"
            />
          </div>
        </div>
        
        <div>
          <Label htmlFor="branch">Branch</Label>
          <Input
            id="branch"
            placeholder="main"
            value={branch}
            onChange={(e) => setBranch(e.target.value)}
            disabled={isLoading || disabled}
            className="mt-1.5"
          />
        </div>
      </div>
      
      <Button
        onClick={handleSubmit}
        disabled={!description.trim() || isLoading || disabled}
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Submitting Intent...
          </>
        ) : (
          <>
            <Send className="mr-2 h-4 w-4" />
            Submit Intent
          </>
        )}
      </Button>
      
      <p className="text-xs text-muted-foreground text-center">
        ⌘+Enter to submit • Intent logged to Chronicle
      </p>
    </div>
  );
}
