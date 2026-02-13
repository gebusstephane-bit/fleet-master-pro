"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Truck, Route, Wrench, User, ChevronRight } from "lucide-react";
import Link from "next/link";

interface ActivityItem {
  id: string;
  type: "VEHICLE_CREATED" | "ROUTE_COMPLETED" | "MAINTENANCE_DONE" | "DRIVER_ADDED";
  title: string;
  description: string;
  date: Date;
  href?: string;
}

interface RecentActivityProps {
  activities: ActivityItem[];
}

const activityConfig = {
  VEHICLE_CREATED: {
    icon: Truck,
    color: "text-blue-600",
    bgColor: "bg-blue-50"
  },
  ROUTE_COMPLETED: {
    icon: Route,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50"
  },
  MAINTENANCE_DONE: {
    icon: Wrench,
    color: "text-amber-600",
    bgColor: "bg-amber-50"
  },
  DRIVER_ADDED: {
    icon: User,
    color: "text-purple-600",
    bgColor: "bg-purple-50"
  }
};

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays === 1) return "Hier";
  return `Il y a ${diffDays} jours`;
}

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-gray-500" />
          <CardTitle className="text-lg font-semibold">Activité récente</CardTitle>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {activities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>Aucune activité récente</p>
          </div>
        ) : (
          activities.map((activity) => {
            const config = activityConfig[activity.type];
            const Icon = config.icon;
            
            const content = (
              <div className="flex items-start gap-3 group cursor-pointer">
                <div className={`p-2 rounded-lg ${config.bgColor} ${config.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 group-hover:text-blue-600 transition-colors">
                    {activity.title}
                  </p>
                  <p className="text-sm text-gray-500 line-clamp-1">
                    {activity.description}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatTimeAgo(activity.date)}
                  </p>
                </div>
                
                {activity.href && (
                  <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                )}
              </div>
            );
            
            return activity.href ? (
              <Link key={activity.id} href={activity.href}>
                {content}
              </Link>
            ) : (
              <div key={activity.id}>{content}</div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
