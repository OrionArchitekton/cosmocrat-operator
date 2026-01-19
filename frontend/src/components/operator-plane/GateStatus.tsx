/**
 * Gate Status Indicators
 * 
 * Shows the current state of each gate in the P0 loop.
 * Truth comes from Chronicle events.
 */

import { CheckCircle2, XCircle, Clock, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GateStatus as GateStatusType, GateStates } from '@/hooks/useOperatorPlane';

interface GateStatusProps {
  gates: GateStates;
  className?: string;
}

interface GateIndicatorProps {
  label: string;
  gate: string;
  status: GateStatusType;
  description: string;
}

function GateIndicator({ label, gate, status, description }: GateIndicatorProps) {
  const statusConfig = {
    pending: {
      icon: Circle,
      color: 'text-muted-foreground',
      bgColor: 'bg-muted',
      label: 'Pending',
    },
    waiting: {
      icon: Clock,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      label: 'Ready',
    },
    passed: {
      icon: CheckCircle2,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      label: 'Passed',
    },
    failed: {
      icon: XCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      label: 'Failed',
    },
  };
  
  const config = statusConfig[status];
  const Icon = config.icon;
  
  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-2 rounded-lg',
      config.bgColor
    )}>
      <div className={cn(
        'flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold',
        status === 'passed' ? 'bg-green-500 text-white' :
        status === 'failed' ? 'bg-red-500 text-white' :
        status === 'waiting' ? 'bg-yellow-500 text-white' :
        'bg-muted-foreground/20 text-muted-foreground'
      )}>
        {gate}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium truncate">{label}</span>
          <Icon className={cn('h-4 w-4 flex-shrink-0', config.color)} />
        </div>
        <p className="text-xs text-muted-foreground truncate">{description}</p>
      </div>
    </div>
  );
}

export function GateStatusPanel({ gates, className }: GateStatusProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <h3 className="text-sm font-medium text-muted-foreground mb-3">
        Gate Status
      </h3>
      
      <GateIndicator
        label="Intent"
        gate="G1"
        status={gates.g1}
        description={
          gates.g1 === 'passed' ? 'Intent submitted to Chronicle' :
          'Submit intent to begin'
        }
      />
      
      <GateIndicator
        label="Execute"
        gate="G2"
        status={gates.g2}
        description={
          gates.g2 === 'passed' ? 'Execution authorized' :
          gates.g2 === 'waiting' ? 'Click Execute to run' :
          gates.g2 === 'failed' ? 'Execution failed' :
          'Waiting for G1'
        }
      />
      
      <GateIndicator
        label="Review"
        gate="G3"
        status={gates.g3}
        description={
          gates.g3 === 'passed' ? 'Artifacts ready for review' :
          'Waiting for artifacts'
        }
      />
      
      <GateIndicator
        label="Apply"
        gate="G4"
        status={gates.g4}
        description={
          gates.g4 === 'passed' ? 'Patch applied to worktree' :
          gates.g4 === 'failed' ? 'Patch rejected' :
          gates.g4 === 'waiting' ? 'Review and approve/reject' :
          'Waiting for review'
        }
      />
    </div>
  );
}

// Compact inline version
export function GateStatusInline({ gates, className }: GateStatusProps) {
  const getColor = (status: GateStatusType) => {
    switch (status) {
      case 'passed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'waiting': return 'bg-yellow-500';
      default: return 'bg-muted-foreground/30';
    }
  };
  
  return (
    <div className={cn('flex items-center gap-1', className)}>
      {(['g1', 'g2', 'g3', 'g4'] as const).map((gate, i) => (
        <div key={gate} className="flex items-center">
          <div
            className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white',
              getColor(gates[gate])
            )}
            title={`${gate.toUpperCase()}: ${gates[gate]}`}
          >
            {i + 1}
          </div>
          {i < 3 && (
            <div className={cn(
              'w-4 h-0.5',
              gates[gate] === 'passed' ? 'bg-green-500' : 'bg-muted-foreground/30'
            )} />
          )}
        </div>
      ))}
    </div>
  );
}
