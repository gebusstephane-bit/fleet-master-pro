'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertTriangle, CircleCheck, Settings, PlusCircle,
  TrendingDown, History, Euro,
} from 'lucide-react';
import {
  getVehicleTireState, getVehicleTireHistory, getTireCosts,
  type VehicleTireStateData, type TireHistoryEntry, type TireCostData,
} from '@/actions/tires';
import {
  getConfigurationByFormula, getTireStatus,
  TREAD_DEPTH_THRESHOLDS, type AxleConfiguration,
} from '@/lib/axle-configurations';
import { TireSchematic } from './TireSchematic';
import type { TireState } from './TireSchematic';
import { AxleConfigWizard } from './AxleConfigWizard';
import { MountTireModal } from './MountTireModal';
import { UnmountTireModal } from './UnmountTireModal';
import { DepthCheckModal, type DepthCheckRow } from './DepthCheckModal';

// ----------------------------------------------------------------

interface VehicleTiresTabProps {
  vehicleId: string;
  vehicleType: string;
  vehicleCurrentKm: number;
  onAlertCount?: (count: number) => void;
}

interface MountModalState {
  open: boolean;
  positionId: string;
  positionLabel: string;
}

interface UnmountModalState {
  open: boolean;
  mountingId: string;
  position: string;
  positionLabel: string;
  tireBrand: string;
  tireDimensions: string;
  currentTreadDepth: number | null;
}

// ----------------------------------------------------------------

export function VehicleTiresTab({ vehicleId, vehicleType, vehicleCurrentKm, onAlertCount }: VehicleTiresTabProps) {
  const [tireState, setTireState] = useState<VehicleTireStateData | null>(null);
  const [history,   setHistory]   = useState<TireHistoryEntry[]>([]);
  const [costs,     setCosts]     = useState<TireCostData | null>(null);
  const [loading,   setLoading]   = useState(true);

  // Modal states
  const [wizardOpen,  setWizardOpen]  = useState(false);
  const [depthOpen,   setDepthOpen]   = useState(false);
  const [selectedPos, setSelectedPos] = useState<string | undefined>(undefined);

  const [mountModal, setMountModal] = useState<MountModalState>({
    open: false, positionId: '', positionLabel: '',
  });
  const [unmountModal, setUnmountModal] = useState<UnmountModalState>({
    open: false, mountingId: '', position: '', positionLabel: '',
    tireBrand: '', tireDimensions: '', currentTreadDepth: null,
  });

  // ----------------------------------------------------------------
  // Load data
  // ----------------------------------------------------------------

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [stateRes, histRes, costRes] = await Promise.all([
      getVehicleTireState(vehicleId),
      getVehicleTireHistory(vehicleId),
      getTireCosts(vehicleId),
    ]);
    if (stateRes.success && stateRes.data) {
      setTireState(stateRes.data);
      onAlertCount?.(stateRes.data.criticalCount);
    }
    if (histRes.success && histRes.data)   setHistory(histRes.data);
    if (costRes.success && costRes.data)   setCosts(costRes.data);
    setLoading(false);
  }, [vehicleId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ----------------------------------------------------------------
  // Derived data — build TireSchematic props
  // ----------------------------------------------------------------

  const axleConfig: AxleConfiguration | null = tireState?.config?.axle_formula
    ? (getConfigurationByFormula(tireState.config.axle_formula) ?? null)
    : null;

  const tireStates: Record<string, TireState> = {};
  if (axleConfig && tireState) {
    for (const pos of axleConfig.positions) {
      const mounting = tireState.activeMountings.find(m => m.axle_position === pos.id);
      if (mounting) {
        const depth = mounting.tread_depth_current;
        tireStates[pos.id] = {
          tireId:      mounting.tire_id,
          brand:       mounting.brand,
          model:       mounting.model ?? undefined,
          dimensions:  mounting.dimensions,
          treadDepth:  depth,
          status:      getTireStatus(depth),
          mountType:   mounting.mount_type,
        };
      } else {
        tireStates[pos.id] = { status: 'empty', mountType: pos.mount_type };
      }
    }
  }

  // ----------------------------------------------------------------
  // Handlers
  // ----------------------------------------------------------------

  function handleTireClick(positionId: string) {
    setSelectedPos(positionId);
    if (!axleConfig) return;
    const pos = axleConfig.positions.find(p => p.id === positionId);
    if (!pos) return;

    const mounting = tireState?.activeMountings.find(m => m.axle_position === positionId);

    if (mounting) {
      // Unmount flow
      setUnmountModal({
        open: true,
        mountingId:       mounting.mounting_id,
        position:         positionId,
        positionLabel:    pos.label,
        tireBrand:        mounting.brand,
        tireDimensions:   mounting.dimensions,
        currentTreadDepth: mounting.tread_depth_current,
      });
    } else {
      // Mount flow
      setMountModal({ open: true, positionId, positionLabel: pos.label });
    }
  }

  // Build rows for depth check modal
  const depthCheckRows: DepthCheckRow[] = (tireState?.activeMountings ?? []).map(m => {
    const label = axleConfig?.positions.find(p => p.id === m.axle_position)?.label ?? m.axle_position;
    return {
      mountingId:       m.mounting_id,
      tireId:           m.tire_id,
      positionLabel:    label,
      brand:            m.brand,
      dimensions:       m.dimensions,
      currentTreadDepth: m.tread_depth_current,
    };
  });

  // ----------------------------------------------------------------
  // Render — loading
  // ----------------------------------------------------------------

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  // ----------------------------------------------------------------
  // Render — no config yet
  // ----------------------------------------------------------------

  if (!tireState?.config) {
    return (
      <>
        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <Settings className="h-12 w-12 text-slate-500" />
            <div className="text-center">
              <p className="text-white font-semibold text-lg">Configuration des essieux requise</p>
              <p className="text-slate-400 text-sm mt-1">
                Définissez la formule d&apos;essieux du véhicule pour activer le suivi pneumatiques.
              </p>
            </div>
            <Button
              onClick={() => setWizardOpen(true)}
              className="bg-cyan-700 hover:bg-cyan-800 mt-2"
            >
              <Settings className="h-4 w-4 mr-2" />
              Configurer les essieux
            </Button>
          </CardContent>
        </Card>

        <AxleConfigWizard
          vehicleId={vehicleId}
          vehicleType={vehicleType}
          open={wizardOpen}
          onOpenChange={setWizardOpen}
          onConfigSaved={loadAll}
        />
      </>
    );
  }

  // ----------------------------------------------------------------
  // Render — main view
  // ----------------------------------------------------------------

  const alertCount = (tireState.criticalCount ?? 0) + (tireState.warningCount ?? 0);

  return (
    <>
      <div className="space-y-6">
        {/* Alert banner */}
        {tireState.criticalCount > 0 && (
          <div className="flex items-center gap-3 bg-red-950/50 border border-red-700 rounded-lg px-4 py-2.5">
            <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
            <span className="text-red-300 text-sm font-medium">
              {tireState.criticalCount} pneu(s) en état critique — remplacement immédiat requis
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Schéma */}
          <Card className="lg:col-span-1 bg-slate-900 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-white text-base">Schéma</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-white h-7 text-xs"
                onClick={() => setWizardOpen(true)}
              >
                <Settings className="h-3 w-3 mr-1" />
                Modifier config
              </Button>
            </CardHeader>
            <CardContent>
              {axleConfig ? (
                <TireSchematic
                  config={axleConfig}
                  tireStates={tireStates}
                  onTireClick={handleTireClick}
                  selectedPosition={selectedPos}
                />
              ) : (
                <p className="text-slate-400 text-sm">
                  Configuration &quot;{tireState.config.axle_formula}&quot; inconnue.
                </p>
              )}
              <p className="text-[10px] text-slate-500 text-center mt-2">
                Cliquez sur un pneu pour monter / démonter
              </p>
            </CardContent>
          </Card>

          {/* Table des pneus actifs */}
          <Card className="lg:col-span-2 bg-slate-900 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-white text-base">Pneus montés</CardTitle>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="border-slate-600 text-slate-300 hover:text-white h-8 text-xs"
                  onClick={() => setDepthOpen(true)}
                  disabled={tireState.activeMountings.length === 0}
                >
                  <TrendingDown className="h-3 w-3 mr-1" />
                  Relever profondeurs
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {tireState.activeMountings.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">
                  Aucun pneu monté — cliquez sur une position dans le schéma
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-slate-400 text-xs uppercase border-b border-slate-700">
                        <th className="text-left pb-2 font-medium">Position</th>
                        <th className="text-left pb-2 font-medium">Pneu</th>
                        <th className="text-right pb-2 font-medium">Profondeur</th>
                        <th className="text-right pb-2 font-medium">Monté (km)</th>
                        <th className="pb-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {tireState.activeMountings.map(m => {
                        const posLabel = axleConfig?.positions.find(p => p.id === m.axle_position)?.label ?? m.axle_position;
                        const depth = m.tread_depth_current;
                        const status = getTireStatus(depth);
                        const depthColor =
                          status === 'critical' ? 'text-red-400' :
                          status === 'warning'  ? 'text-orange-400' :
                          status === 'ok'       ? 'text-green-400' :
                          'text-slate-500';
                        return (
                          <tr key={m.mounting_id} className="hover:bg-slate-800/50">
                            <td className="py-2 text-cyan-400 font-mono font-semibold">{posLabel}</td>
                            <td className="py-2">
                              <div className="text-white">{m.brand}{m.model ? ` ${m.model}` : ''}</div>
                              <div className="text-xs text-slate-400 font-mono">{m.dimensions}</div>
                            </td>
                            <td className="py-2 text-right">
                              {depth != null ? (
                                <span className={`font-semibold ${depthColor}`}>{depth} mm</span>
                              ) : (
                                <span className="text-slate-500">—</span>
                              )}
                            </td>
                            <td className="py-2 text-right text-slate-400">
                              {m.mounted_km.toLocaleString('fr-FR')} km
                            </td>
                            <td className="py-2 pl-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30"
                                onClick={() => {
                                  const pos = axleConfig?.positions.find(p => p.id === m.axle_position);
                                  setUnmountModal({
                                    open: true,
                                    mountingId: m.mounting_id,
                                    position: m.axle_position,
                                    positionLabel: pos?.label ?? m.axle_position,
                                    tireBrand: m.brand,
                                    tireDimensions: m.dimensions,
                                    currentTreadDepth: m.tread_depth_current,
                                  });
                                }}
                              >
                                Démonter
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats / Costs */}
          {costs && (
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Euro className="h-4 w-4 text-cyan-400" />
                  Coûts (12 mois)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-800 rounded-lg p-3">
                    <p className="text-xs text-slate-400">Total dépensé</p>
                    <p className="text-lg font-bold text-white">
                      {costs.total_spent.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                    </p>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-3">
                    <p className="text-xs text-slate-400">Pneus achetés</p>
                    <p className="text-lg font-bold text-white">{costs.tire_count}</p>
                  </div>
                  {costs.avg_cost_per_tire > 0 && (
                    <div className="bg-slate-800 rounded-lg p-3 col-span-2">
                      <p className="text-xs text-slate-400">Coût moyen / pneu</p>
                      <p className="text-lg font-bold text-white">
                        {costs.avg_cost_per_tire.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Alert summary */}
          <Card className="bg-slate-900 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-400" />
                État des pneus
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {alertCount === 0 ? (
                <div className="flex items-center gap-2 text-green-400">
                  <CircleCheck className="h-5 w-5" />
                  <span className="text-sm">Tous les pneus sont en bon état</span>
                </div>
              ) : (
                <>
                  {tireState.criticalCount > 0 && (
                    <div className="flex items-center justify-between bg-red-950/40 border border-red-800 rounded-lg px-3 py-2">
                      <span className="text-red-300 text-sm">Critique (&lt;{TREAD_DEPTH_THRESHOLDS.critical}mm)</span>
                      <Badge className="bg-red-800 text-red-100">{tireState.criticalCount}</Badge>
                    </div>
                  )}
                  {tireState.warningCount > 0 && (
                    <div className="flex items-center justify-between bg-orange-950/40 border border-orange-800 rounded-lg px-3 py-2">
                      <span className="text-orange-300 text-sm">À surveiller (&lt;{TREAD_DEPTH_THRESHOLDS.warning}mm)</span>
                      <Badge className="bg-orange-800 text-orange-100">{tireState.warningCount}</Badge>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* History */}
          {history.length > 0 && (
            <Card className="lg:col-span-3 bg-slate-900 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <History className="h-4 w-4 text-cyan-400" />
                  Historique des montages
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-400 uppercase border-b border-slate-700">
                        <th className="text-left pb-2 font-medium">Position</th>
                        <th className="text-left pb-2 font-medium">Pneu</th>
                        <th className="text-right pb-2 font-medium">Monté</th>
                        <th className="text-right pb-2 font-medium">Démonté</th>
                        <th className="text-left pb-2 font-medium">Raison</th>
                        <th className="text-right pb-2 font-medium">Coût</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {history.map(h => (
                        <tr key={h.mounting_id} className="hover:bg-slate-800/40">
                          <td className="py-1.5 text-cyan-400 font-mono">{h.axle_position}</td>
                          <td className="py-1.5 text-white">
                            {h.brand} <span className="text-slate-400 font-mono">{h.dimensions}</span>
                          </td>
                          <td className="py-1.5 text-right text-slate-300">
                            {new Date(h.mounted_date).toLocaleDateString('fr-FR')}
                          </td>
                          <td className="py-1.5 text-right text-slate-400">
                            {h.unmounted_date
                              ? new Date(h.unmounted_date).toLocaleDateString('fr-FR')
                              : <span className="text-green-500">En service</span>}
                          </td>
                          <td className="py-1.5 text-slate-400 capitalize">
                            {h.reason_unmounted?.replace('_', ' ') ?? '—'}
                          </td>
                          <td className="py-1.5 text-right text-slate-300">
                            {h.purchase_price != null
                              ? h.purchase_price.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Modals */}
      <AxleConfigWizard
        vehicleId={vehicleId}
        vehicleType={vehicleType}
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onConfigSaved={loadAll}
      />

      <MountTireModal
        vehicleId={vehicleId}
        vehicleCurrentKm={vehicleCurrentKm}
        position={mountModal.positionId}
        positionLabel={mountModal.positionLabel}
        open={mountModal.open}
        onOpenChange={open => setMountModal(s => ({ ...s, open }))}
        onMounted={() => { setMountModal(s => ({ ...s, open: false })); loadAll(); }}
      />

      <UnmountTireModal
        mountingId={unmountModal.mountingId}
        vehicleId={vehicleId}
        vehicleCurrentKm={vehicleCurrentKm}
        position={unmountModal.position}
        positionLabel={unmountModal.positionLabel}
        tireBrand={unmountModal.tireBrand}
        tireDimensions={unmountModal.tireDimensions}
        currentTreadDepth={unmountModal.currentTreadDepth}
        open={unmountModal.open}
        onOpenChange={open => setUnmountModal(s => ({ ...s, open }))}
        onUnmounted={() => { setUnmountModal(s => ({ ...s, open: false })); loadAll(); }}
      />

      <DepthCheckModal
        vehicleId={vehicleId}
        vehicleCurrentKm={vehicleCurrentKm}
        rows={depthCheckRows}
        open={depthOpen}
        onOpenChange={setDepthOpen}
        onSaved={loadAll}
      />
    </>
  );
}
