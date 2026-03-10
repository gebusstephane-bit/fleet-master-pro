'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import type { AxleConfiguration, AxlePosition } from '@/lib/axle-configurations';

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

export interface TireState {
  tireId?: string;
  brand?: string;
  model?: string;
  dimensions?: string;
  treadDepth?: number | null; // null = non mesuré
  status: 'ok' | 'warning' | 'critical' | 'empty' | 'unknown';
  mountType: 'simple' | 'jumele_ext' | 'jumele_int';
}

export interface TireSchematicProps {
  config: AxleConfiguration;
  tireStates: Record<string, TireState>;
  onTireClick: (positionId: string) => void;
  selectedPosition?: string;
}

// ----------------------------------------------------------------
// Constants
// ----------------------------------------------------------------

const STATUS_FILL: Record<string, string> = {
  ok:       '#22c55e',
  warning:  '#f97316',
  critical: '#ef4444',
  empty:    'url(#tire-hatch)',
  unknown:  '#9ca3af',
};

const STATUS_STROKE: Record<string, string> = {
  ok:       '#16a34a',
  warning:  '#ea580c',
  critical: '#dc2626',
  empty:    '#4b5563',
  unknown:  '#6b7280',
};

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

/** Dimensions du rectangle SVG selon le type de monte */
function getTireRect(pos: AxlePosition): { x: number; y: number; w: number; h: number } {
  let w: number;
  switch (pos.mount_type) {
    case 'jumele_ext': w = 5.5; break;
    case 'jumele_int': w = 4.5; break;
    default:           w = 7.5; break;
  }
  const h = 13;
  return { x: pos.svg_x - w / 2, y: pos.svg_y - h / 2, w, h };
}

function getTireStatus(posId: string, tireStates: Record<string, TireState>): string {
  return tireStates[posId]?.status ?? 'empty';
}

// ----------------------------------------------------------------
// Component
// ----------------------------------------------------------------

export function TireSchematic({ config, tireStates, onTireClick, selectedPosition }: TireSchematicProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const hoveredPos = hoveredId ? config.positions.find(p => p.id === hoveredId) : null;
  const hoveredState = hoveredId ? tireStates[hoveredId] : undefined;

  return (
    <div className="space-y-3">
      {/* Configuration badge */}
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="font-mono text-xs border-slate-600 text-slate-300">
          {config.formula}
        </Badge>
        <span className="text-sm text-slate-400">{config.total_tire_count} pneus</span>
      </div>

      {/* SVG + Tooltip wrapper */}
      <div className="relative select-none">
        <svg
          viewBox="0 0 100 100"
          className="w-full"
          style={{ maxHeight: '320px' }}
          aria-label={`Schéma pneumatiques ${config.label}`}
        >
          <defs>
            {/* Hatch pattern for empty slots */}
            <pattern
              id="tire-hatch"
              patternUnits="userSpaceOnUse"
              width="3"
              height="3"
              patternTransform="rotate(45)"
            >
              <line x1="0" y1="0" x2="0" y2="3" stroke="#4b5563" strokeWidth="1" />
            </pattern>
          </defs>

          {/* Vehicle body / chassis */}
          <rect
            x="38" y="3" width="24" height="94"
            rx="4"
            fill="#1e293b"
            stroke="#334155"
            strokeWidth="0.5"
          />
          {/* Chassis center line (axle reference) */}
          <line x1="50" y1="3" x2="50" y2="97" stroke="#334155" strokeWidth="0.3" strokeDasharray="2 2" />

          {/* Tires */}
          {config.positions.map(pos => {
            const { x, y, w, h } = getTireRect(pos);
            const status = getTireStatus(pos.id, tireStates);
            const fill   = STATUS_FILL[status]   ?? STATUS_FILL.empty;
            const stroke = STATUS_STROKE[status]  ?? STATUS_STROKE.empty;
            const isSelected = selectedPosition === pos.id;
            const isHovered  = hoveredId === pos.id;
            const isCritical = status === 'critical';

            return (
              <g
                key={pos.id}
                onClick={() => onTireClick(pos.id)}
                onMouseEnter={() => setHoveredId(pos.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{ cursor: 'pointer' }}
                role="button"
                aria-label={pos.label}
              >
                {/* Critical pulse glow */}
                {isCritical && (
                  <rect
                    x={x - 1.5} y={y - 1.5}
                    width={w + 3} height={h + 3}
                    rx="3"
                    fill={fill}
                    opacity="0.35"
                    className="animate-pulse"
                  />
                )}

                {/* Hover highlight */}
                {isHovered && !isSelected && (
                  <rect
                    x={x - 1} y={y - 1}
                    width={w + 2} height={h + 2}
                    rx="2.5"
                    fill="white"
                    opacity="0.15"
                  />
                )}

                {/* Tire rectangle */}
                <rect
                  x={x} y={y}
                  width={w} height={h}
                  rx="2"
                  fill={fill}
                  stroke={isSelected ? '#ffffff' : stroke}
                  strokeWidth={isSelected ? 1 : 0.4}
                />

                {/* Liftable indicator (small triangle) */}
                {pos.is_liftable && (
                  <text
                    x={pos.svg_x} y={pos.svg_y + h / 2 + 3.5}
                    textAnchor="middle"
                    fontSize="2.5"
                    fill="#94a3b8"
                  >
                    ↑
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Floating tooltip */}
        {hoveredId && hoveredPos && (
          <div
            className="absolute z-20 bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-white shadow-xl pointer-events-none min-w-[140px]"
            style={{
              left: `${hoveredPos.svg_x}%`,
              top: `${hoveredPos.svg_y}%`,
              transform: hoveredPos.svg_x > 50
                ? 'translate(-105%, -50%)'
                : 'translate(10%, -50%)',
            }}
          >
            <div className="font-semibold text-slate-200 mb-1">{hoveredPos.label}</div>
            {hoveredState && hoveredState.status !== 'empty' ? (
              <div className="space-y-0.5 text-slate-400">
                {hoveredState.brand && (
                  <div>{hoveredState.brand}{hoveredState.model ? ` ${hoveredState.model}` : ''}</div>
                )}
                {hoveredState.dimensions && (
                  <div className="font-mono">{hoveredState.dimensions}</div>
                )}
                <div className={
                  hoveredState.treadDepth == null ? 'text-slate-500' :
                  hoveredState.treadDepth <= 2    ? 'text-red-400 font-semibold' :
                  hoveredState.treadDepth <= 3    ? 'text-orange-400' :
                  'text-green-400'
                }>
                  {hoveredState.treadDepth != null
                    ? `Profondeur : ${hoveredState.treadDepth} mm`
                    : 'Non mesuré'}
                </div>
              </div>
            ) : (
              <div className="text-slate-500">Emplacement vide</div>
            )}
            <div className="mt-1 text-slate-500 text-[10px]">
              {hoveredPos.is_steering && 'Directeur · '}
              {hoveredPos.is_drive    && 'Moteur · '}
              {hoveredPos.is_liftable && 'Relevable'}
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-400 justify-center">
        <LegendItem color="#22c55e" label="OK (>3mm)" />
        <LegendItem color="#f97316" label="A surveiller (2-3mm)" />
        <LegendItem color="#ef4444" label="Critique (<2mm)" />
        <LegendItem color="#9ca3af" label="Non mesuré" />
        <LegendItem hatch label="Vide" />
      </div>
    </div>
  );
}

// ----------------------------------------------------------------
// Legend item
// ----------------------------------------------------------------

function LegendItem({ color, hatch, label }: { color?: string; hatch?: boolean; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="w-3 h-3 rounded-sm inline-block flex-shrink-0 border border-slate-600"
        style={
          hatch
            ? { backgroundImage: 'repeating-linear-gradient(45deg, #4b5563 0, #4b5563 1px, transparent 0, transparent 50%)', backgroundSize: '4px 4px' }
            : { backgroundColor: color }
        }
      />
      {label}
    </span>
  );
}
