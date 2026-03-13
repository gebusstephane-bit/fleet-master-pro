'use client';

import { useEffect, useState, useCallback } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { getDailyBriefing } from '@/actions/ai/get-daily-briefing';

interface DailyBriefingProps {
  companyId: string;
  plan: string;
}

interface BriefingData {
  content: string | null;
  generated_at: string | null;
  from_cache: boolean;
}

export function DailyBriefing({ companyId, plan }: DailyBriefingProps) {
  const [data, setData] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshDisabled, setRefreshDisabled] = useState(false);

  const fetchBriefing = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getDailyBriefing({ plan });
      const briefing = result?.data;
      if (briefing) {
        setData(briefing);
        // Disable refresh if generated less than 4h ago
        if (briefing.generated_at) {
          const age = Date.now() - new Date(briefing.generated_at).getTime();
          setRefreshDisabled(age < 4 * 60 * 60 * 1000);
        }
      } else {
        setData({ content: null, generated_at: null, from_cache: false });
      }
    } catch {
      setData({ content: null, generated_at: null, from_cache: false });
    } finally {
      setLoading(false);
    }
  }, [plan]);

  useEffect(() => {
    fetchBriefing();
  }, [fetchBriefing]);

  // Don't render anything if content is null (fallback: silent)
  if (!loading && (!data || !data.content)) {
    return null;
  }

  if (loading) {
    return (
      <Card className="bg-[#0f172a]/60 border-cyan-500/20 backdrop-blur-sm">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-4 w-4 text-cyan-400" />
            <Skeleton className="h-4 w-32 bg-slate-700" />
          </div>
          <Skeleton className="h-3 w-full bg-slate-700" />
          <Skeleton className="h-3 w-4/5 bg-slate-700" />
          <Skeleton className="h-3 w-3/5 bg-slate-700" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-r from-[#0f172a]/80 to-[#1e1b4b]/60 border-cyan-500/20 backdrop-blur-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
              <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            </div>
            <span className="text-sm font-medium text-white">Briefing IA du jour</span>
            {data?.from_cache && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-slate-600 text-slate-500">
                cache
              </Badge>
            )}
          </div>
          <button
            onClick={fetchBriefing}
            disabled={refreshDisabled || loading}
            className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title={refreshDisabled ? 'Disponible dans moins de 4h' : 'Actualiser le briefing'}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
          {data?.content}
        </p>
      </CardContent>
    </Card>
  );
}
