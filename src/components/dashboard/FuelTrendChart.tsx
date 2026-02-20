"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FuelData {
  month: string;
  liters: number;
  cost: number;
}

interface FuelTrendChartProps {
  data: FuelData[];
}

export function FuelTrendChart({ data }: FuelTrendChartProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Évolution carburant</CardTitle>
        <p className="text-sm text-gray-500">6 derniers mois</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="month" 
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => {
                const [year, month] = value.split('-');
                return `${month}/${year}`;
              }}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              // @ts-ignore
              formatter={(value: number, name: string) => [
                name === 'cost' ? `${value.toFixed(0)}€` : `${value.toFixed(0)}L`,
                name === 'cost' ? 'Coût' : 'Volume'
              ]}
            />
            <Line 
              type="monotone" 
              dataKey="cost" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={{ fill: '#3b82f6', r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line 
              type="monotone" 
              dataKey="liters" 
              stroke="#10b981" 
              strokeWidth={2}
              dot={{ fill: '#10b981', r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
