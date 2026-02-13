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
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    badge: "Critique"
  },
  WARNING: {
    icon: Clock,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    badge: "Attention"
  },
  INFO: {
    icon: CheckCircle2,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    badge: "Info"
  }
};

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  const criticalCount = alerts.filter(a => a.type === "CRITICAL").length;
  const warningCount = alerts.filter(a => a.type === "WARNING").length;

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg font-semibold">Alertes</CardTitle>
          {criticalCount > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              {criticalCount} critique{criticalCount > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        <Link 
          href="/alerts" 
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          Voir tout
          <ChevronRight className="h-4 w-4" />
        </Link>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {alerts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">Tout va bien !</p>
            <p className="text-sm text-gray-400 mt-1">Aucune alerte à signaler</p>
          </div>
        ) : (
          alerts.slice(0, 5).map((alert) => {
            const config = alertConfig[alert.type];
            const Icon = config.icon;
            
            return (
              <div
                key={alert.id}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                  config.bgColor,
                  config.borderColor
                )}
              >
                <Icon className={cn("h-5 w-5 mt-0.5 flex-shrink-0", config.color)} />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-gray-900 truncate">
                      {alert.title}
                    </span>
                    <Badge variant="outline" className="text-xs flex-shrink-0">
                      {config.badge}
                    </Badge>
                  </div>
                  
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {alert.description}
                  </p>
                  
                  {alert.vehicle && (
                    <p className="text-xs text-gray-500 mt-1">
                      Véhicule : {alert.vehicle}
                    </p>
                  )}
                  
                  {alert.action && alert.actionHref && (
                    <Link
                      href={alert.actionHref}
                      className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-blue-600 hover:text-blue-800"
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
          <p className="text-center text-sm text-gray-500 pt-2">
            + {alerts.length - 5} autres alertes
          </p>
        )}
      </CardContent>
    </Card>
  );
}
