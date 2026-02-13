'use client';

import { TrendingUp, DollarSign } from 'lucide-react';

// Données mockées pour le graphique
const revenueData = [
  { month: 'Jan', revenue: 1200 },
  { month: 'Fév', revenue: 1800 },
  { month: 'Mar', revenue: 1600 },
  { month: 'Avr', revenue: 2200 },
  { month: 'Mai', revenue: 2800 },
  { month: 'Juin', revenue: 2450 },
];

export function RevenueChart() {
  const maxRevenue = Math.max(...revenueData.map(d => d.revenue));

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Revenus MRR</h3>
          <p className="text-sm text-white/50">Monthly Recurring Revenue</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 rounded-lg">
          <TrendingUp className="w-4 h-4 text-green-400" />
          <span className="text-sm font-medium text-green-400">+12.5%</span>
        </div>
      </div>

      {/* Chart */}
      <div className="relative h-64">
        <div className="absolute inset-0 flex items-end justify-between gap-4">
          {revenueData.map((data, index) => {
            const height = (data.revenue / maxRevenue) * 100;
            return (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full relative group">
                  <div
                    className="w-full bg-gradient-to-t from-purple-500/80 to-purple-400/80 rounded-t-lg transition-all duration-500 hover:from-purple-400 hover:to-purple-300"
                    style={{ height: `${height}%` }}
                  />
                  {/* Tooltip */}
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/10 backdrop-blur-sm px-2 py-1 rounded text-xs text-white whitespace-nowrap">
                    €{data.revenue}
                  </div>
                </div>
                <span className="text-xs text-white/50">{data.month}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <p className="text-sm text-white/50">Revenu total</p>
            <p className="text-xl font-bold text-white">€12,050</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-white/50">Prévision ce mois</p>
          <p className="text-xl font-bold text-white">€2,800</p>
        </div>
      </div>
    </div>
  );
}
