"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: number | string;
  subtitle: string;
  icon: LucideIcon;
  trend?: number; // Pourcentage variation vs période précédente
  trendLabel?: string;
  alert?: boolean;
  color?: "blue" | "green" | "purple" | "red" | "amber";
}

const colorVariants = {
  blue: "from-blue-500/10 to-blue-600/5 text-blue-600",
  green: "from-emerald-500/10 to-emerald-600/5 text-emerald-600",
  purple: "from-purple-500/10 to-purple-600/5 text-purple-600",
  red: "from-red-500/10 to-red-600/5 text-red-600",
  amber: "from-amber-500/10 to-amber-600/5 text-amber-600"
};

export function KpiCard({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  trend, 
  trendLabel,
  alert,
  color = "blue" 
}: KpiCardProps) {
  const TrendIcon = trend && trend > 0 ? TrendingUp : trend && trend < 0 ? TrendingDown : Minus;
  const trendColor = trend && trend > 0 ? "text-emerald-600" : trend && trend < 0 ? "text-red-600" : "text-gray-500";
  
  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1",
      alert && "border-red-300 shadow-red-100"
    )}>
      {/* Background gradient subtil */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br opacity-50",
        colorVariants[color].split(' ').slice(0, 2).join(' ')
      )} />
      
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
        <CardTitle className="text-sm font-medium text-gray-600">
          {title}
        </CardTitle>
        <div className={cn(
          "p-2 rounded-lg bg-gradient-to-br",
          colorVariants[color]
        )}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      
      <CardContent className="relative">
        <div className="text-3xl font-bold tracking-tight text-gray-900">
          {value}
        </div>
        
        <div className="flex items-center gap-2 mt-1">
          <p className="text-xs text-gray-500">{subtitle}</p>
          
          {trend !== undefined && (
            <div className={cn("flex items-center gap-1 text-xs font-medium", trendColor)}>
              <TrendIcon className="h-3 w-3" />
              <span>{Math.abs(trend)}%</span>
              {trendLabel && <span className="text-gray-400 font-normal">({trendLabel})</span>}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
