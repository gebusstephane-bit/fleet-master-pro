"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Star, Medal, TrendingUp } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

interface Driver {
  id: string;
  name: string;
  score: number;
  trips: number;
  distance: number;
  rank: number;
}

interface TopDriversProps {
  drivers: Driver[];
}

const rankColors = {
  1: "text-yellow-500 bg-yellow-50 border-yellow-200",
  2: "text-gray-400 bg-gray-50 border-gray-200",
  3: "text-amber-600 bg-amber-50 border-amber-200"
};

export function TopDrivers({ drivers }: TopDriversProps) {
  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <CardTitle className="text-lg font-semibold">Top Chauffeurs</CardTitle>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {drivers.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>Aucun chauffeur classé ce mois</p>
          </div>
        ) : (
          drivers.slice(0, 5).map((driver) => {
            const rankStyle = rankColors[driver.rank as keyof typeof rankColors] || "text-gray-600 bg-gray-50 border-gray-200";
            
            return (
              <div key={driver.id} className="flex items-center gap-3">
                {/* Rank */}
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold text-sm ${rankStyle}`}>
                  {driver.rank <= 3 ? (
                    <Medal className="h-4 w-4" />
                  ) : (
                    driver.rank
                  )}
                </div>
                
                {/* Avatar */}
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-sm">
                    {driver.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm text-gray-900 truncate">
                      {driver.name}
                    </p>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                      <span className="text-sm font-semibold">{driver.score}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-1">
                    <Progress value={driver.score} className="h-1.5 flex-1" />
                  </div>
                  
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span>{driver.trips} tournées</span>
                    <span>•</span>
                    <span>{driver.distance} km</span>
                    <span className="flex items-center gap-0.5 text-emerald-600">
                      <TrendingUp className="h-3 w-3" />
                      +{Math.floor(Math.random() * 10)}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
