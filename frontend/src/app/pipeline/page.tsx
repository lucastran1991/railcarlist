'use client';

import { useAuth } from '@/lib/useAuth';
import PipelineDAG from '@/components/PipelineDAG';
import { GitBranch } from 'lucide-react';

export default function PipelinePage() {
  const ready = useAuth();
  if (!ready) return null;

  return (
    <div className="min-h-[calc(100vh-64px)] p-3 sm:p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-[var(--color-accent,#5CE5A0)]/20">
            <GitBranch size={20} className="text-background" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold gradient-text">Data Pipeline</h1>
            <p className="text-xs text-muted-foreground">Terminal operations dependency graph — click any node to view details</p>
          </div>
        </div>

        <PipelineDAG />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="theme-card rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-[var(--color-accent,#5CE5A0)]" />
              <span className="text-xs font-semibold text-foreground">Normal</span>
            </div>
            <p className="text-[10px] text-muted-foreground">All parameters within operating limits</p>
          </div>
          <div className="theme-card rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-[var(--color-warning,#F6AD55)]" />
              <span className="text-xs font-semibold text-foreground">Warning</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Approaching threshold — attention needed</p>
          </div>
          <div className="theme-card rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-[var(--color-danger,#E53E3E)]" />
              <span className="text-xs font-semibold text-foreground">Critical</span>
            </div>
            <p className="text-[10px] text-muted-foreground">Exceeded limits — immediate action required</p>
          </div>
        </div>
      </div>
    </div>
  );
}
