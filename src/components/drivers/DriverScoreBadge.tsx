'use client';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface DriverScoreBadgeProps {
  score: number | null | undefined;
  resume: string | null | undefined;
}

const SCORE_CONFIG = [
  { min: 80, label: 'Excellent', bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  { min: 60, label: 'Bon', bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
  { min: 40, label: 'Moyen', bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
  { min: 0, label: 'Attention', bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
] as const;

function getConfig(score: number) {
  return SCORE_CONFIG.find((c) => score >= c.min) || SCORE_CONFIG[SCORE_CONFIG.length - 1];
}

export function DriverScoreBadge({ score, resume }: DriverScoreBadgeProps) {
  if (score == null) return null;

  const config = getConfig(score);

  const badge = (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border',
        config.bg, config.text, config.border
      )}
    >
      {score}
      <span className="hidden sm:inline">/ 100</span>
    </span>
  );

  if (!resume) return badge;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-[250px] bg-[#1e293b] border-slate-700 text-slate-200 text-xs"
        >
          {resume}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
