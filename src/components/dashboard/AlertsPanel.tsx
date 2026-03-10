"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Clock, CheckCircle2, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface Alert {
  id: string;
  type: "CRITICAL" | "WARNING" | "INFO";
  title: string;
  description: string;
  vehicle?: string;
  date: Date;
  action?: string;
  actionHref?: string;
}

interface AlertsPanelProps {
  alerts: Alert[];
}

const alertConfig = {
  CRITICAL: {
    icon: AlertTriangle,
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/20",
    badge: "Critique"
  },
  WARNING: {
    icon: Clock,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/20",
    badge: "Attention"
  },
  INFO: {
    icon: CheckCircle2,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/20",
    badge: "Info"
  }
};

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  const criticalCount = alerts.filter(a => a.type === "CRITICAL").length;
  const warningCount = alerts.filter(a => a.type === "WARNING").length;

  return (
    <Card className="h-full bg-[#0f172a]/60 border-cyan-500/15 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_20px_rgba(6,182,212,0.1)]">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base font-semibold text-white">Alertes</CardTitle>
          {criticalCount > 0 && (
            <Badge variant="destructive" className="animate-pulse bg-red-500/20 text-red-400 border-red-500/30">
              {criticalCount} critique{criticalCount > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        <Link 
          href="/alerts" 
          className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
        >
          Voir tout
          <ChevronRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      
      <CardContent className="space-y-2">
        {alerts.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <CheckCircle2 className="h-6 w-6 text-emerald-400" />
            </div>
            <p className="text-white font-medium text-sm">Tout va bien !</p>
            <p className="text-xs text-slate-500 mt-1">Aucune alerte à signaler</p>
          </div>
        ) : (
          alerts.slice(0, 5).map((alert) => {
            const config = alertConfig[alert.type];
            const Icon = config.icon;
            
            return (
              <div
                key={alert.id}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-xl border transition-colors",
                  config.bgColor,
                  config.borderColor
                )}
              >
                <Icon className={cn("h-4 w-4 mt-0.5 flex-shrink-0", config.color)} />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-medium text-xs text-white truncate">
                      {alert.title}
                    </span>
                    <Badge variant="outline" className="text-[10px] flex-shrink-0 border-white/10 text-slate-400">
                      {config.badge}
                    </Badge>
                  </div>
                  
                  <p className="text-xs text-slate-400 line-clamp-2">
                    {alert.description}
                  </p>
                  
                  {alert.vehicle && (
                    <p className="text-[10px] text-slate-500 mt-1">
                      Véhicule : {alert.vehicle}
                    </p>
                  )}
                  
                  {alert.action && alert.actionHref && (
                    <Link
                      href={alert.actionHref}
                      className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-cyan-400 hover:text-cyan-300"
                    >
                      {alert.action}
                      <ChevronRight className="h-3 w-3" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })
        )}
        
        {alerts.length > 5 && (
          <p className="text-center text-xs text-slate-500 pt-2">
            + {alerts.length - 5} autres alertes
          </p>
        )}
      </CardContent>
    </Card>
  );
}
