'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { STANDARD_DIMENSIONS } from '@/lib/axle-configurations';
import { mountTire, getStockTires, type StockTire } from '@/actions/tires';

// ----------------------------------------------------------------

interface MountTireModalProps {
  vehicleId: string;
  vehicleCurrentKm: number;
  position: string;
  positionLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMounted: () => void;
}

const TODAY = new Date().toISOString().split('T')[0];
const ALL_DIMS = [...new Set(Object.values(STANDARD_DIMENSIONS).flat())].sort();

// ----------------------------------------------------------------

export function MountTireModal({
  vehicleId, vehicleCurrentKm, position, positionLabel, open, onOpenChange, onMounted,
}: MountTireModalProps) {
  const [tab, setTab] = useState<'stock' | 'new'>('stock');
  const [stockTires, setStockTires] = useState<StockTire[]>([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [selectedStockId, setSelectedStockId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Nouveau pneu
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [dimensions, setDimensions] = useState('');
  const [dotCode, setDotCode] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [treadDepthNew, setTreadDepthNew] = useState('');

  // Infos montage
  const [mountedKm, setMountedKm] = useState(vehicleCurrentKm);
  const [mountedDate, setMountedDate] = useState(TODAY);
  const [treadDepthAtMount, setTreadDepthAtMount] = useState('');
  const [performedBy, setPerformedBy] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open && tab === 'stock') {
      setStockLoading(true);
      getStockTires().then(res => {
        setStockTires(res.data ?? []);
        setStockLoading(false);
      });
    }
  }, [open, tab]);

  useEffect(() => {
    if (open) setMountedKm(vehicleCurrentKm);
  }, [open, vehicleCurrentKm]);

  async function handleSubmit() {
    if (tab === 'stock' && !selectedStockId) {
      toast.error('Sélectionnez un pneu dans le stock');
      return;
    }
    if (tab === 'new' && (!brand || !dimensions)) {
      toast.error('La marque et les dimensions sont obligatoires');
      return;
    }
    if (!mountedKm || mountedKm <= 0) {
      toast.error('Le kilométrage doit être supérieur à 0');
      return;
    }

    setLoading(true);
    const result = await mountTire({
      vehicleId,
      position,
      mountType: position.includes('EXT') ? 'jumele_ext' : position.includes('INT') ? 'jumele_int' : 'simple',
      tireId: tab === 'stock' ? selectedStockId : undefined,
      tireData: tab === 'new' ? {
        brand,
        dimensions,
        model: model || undefined,
        purchase_price: purchasePrice ? parseFloat(purchasePrice) : undefined,
        tread_depth_new: treadDepthNew ? parseFloat(treadDepthNew) : undefined,
        dot_code: dotCode || undefined,
      } : undefined,
      mountedKm,
      mountedDate,
      treadDepthAtMount: treadDepthAtMount ? parseFloat(treadDepthAtMount) : undefined,
      performedBy: performedBy || undefined,
      notes: notes || undefined,
    });

    setLoading(false);

    if (!result.success) {
      toast.error(result.error ?? 'Erreur lors du montage');
      return;
    }

    toast.success(`Pneu monté en position ${positionLabel}`);
    onOpenChange(false);
    onMounted();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Monter un pneu</DialogTitle>
          <p className="text-sm text-slate-400">Position : <span className="text-cyan-400">{positionLabel}</span></p>
        </DialogHeader>

        {/* Choix du pneu */}
        <Tabs value={tab} onValueChange={v => setTab(v as 'stock' | 'new')}>
          <TabsList className="grid grid-cols-2 bg-slate-800">
            <TabsTrigger value="stock">Depuis le stock</TabsTrigger>
            <TabsTrigger value="new">Nouveau pneu</TabsTrigger>
          </TabsList>

          {/* Stock */}
          <TabsContent value="stock" className="space-y-3 mt-3">
            {stockLoading ? (
              <p className="text-sm text-slate-400 text-center py-4">Chargement du stock...</p>
            ) : stockTires.length === 0 ? (
              <div className="text-center py-6 text-slate-400">
                <p className="font-medium">Aucun pneu en stock</p>
                <p className="text-sm mt-1">Utilisez l&apos;onglet &quot;Nouveau pneu&quot;.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {stockTires.map(tire => (
                  <button
                    key={tire.id}
                    onClick={() => setSelectedStockId(tire.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedStockId === tire.id
                        ? 'border-cyan-500 bg-cyan-500/10'
                        : 'border-slate-700 hover:border-slate-500'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-white">{tire.brand} {tire.model}</span>
                      <Badge variant="outline" className="font-mono text-xs border-slate-600 text-slate-300">
                        {tire.dimensions}
                      </Badge>
                    </div>
                    <div className="flex gap-4 mt-1 text-xs text-slate-400">
                      {tire.tread_depth_current != null && (
                        <span>Prof. : {tire.tread_depth_current} mm</span>
                      )}
                      {tire.purchase_price != null && (
                        <span>Prix : {tire.purchase_price.toFixed(0)} €</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Nouveau pneu */}
          <TabsContent value="new" className="space-y-3 mt-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-slate-300 text-sm">Marque *</Label>
                <Input
                  value={brand}
                  onChange={e => setBrand(e.target.value)}
                  placeholder="Michelin, Bridgestone..."
                  className="bg-slate-800 border-slate-700 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-slate-300 text-sm">Modèle</Label>
                <Input
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  placeholder="X Line Energy..."
                  className="bg-slate-800 border-slate-700 text-white mt-1"
                />
              </div>
              <div className="col-span-2">
                <Label className="text-slate-300 text-sm">Dimensions *</Label>
                <Input
                  value={dimensions}
                  onChange={e => setDimensions(e.target.value)}
                  placeholder="315/70 R22.5"
                  list="dims-list"
                  className="bg-slate-800 border-slate-700 text-white mt-1"
                />
                <datalist id="dims-list">
                  {ALL_DIMS.map(d => <option key={d} value={d} />)}
                </datalist>
              </div>
              <div>
                <Label className="text-slate-300 text-sm">Code DOT</Label>
                <Input
                  value={dotCode}
                  onChange={e => setDotCode(e.target.value)}
                  placeholder="DOT MA L9 ABCD 2024"
                  className="bg-slate-800 border-slate-700 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-slate-300 text-sm">Prix TTC (€)</Label>
                <Input
                  type="number"
                  value={purchasePrice}
                  onChange={e => setPurchasePrice(e.target.value)}
                  placeholder="450"
                  className="bg-slate-800 border-slate-700 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-slate-300 text-sm">Profondeur neuve (mm)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={treadDepthNew}
                  onChange={e => setTreadDepthNew(e.target.value)}
                  placeholder="16.0"
                  className="bg-slate-800 border-slate-700 text-white mt-1"
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Infos du montage */}
        <div className="border-t border-slate-700 pt-4 space-y-3">
          <p className="text-sm font-medium text-slate-300">Informations de montage</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-slate-300 text-sm">Kilométrage actuel *</Label>
              <Input
                type="number"
                value={mountedKm}
                onChange={e => setMountedKm(parseInt(e.target.value, 10))}
                className="bg-slate-800 border-slate-700 text-white mt-1"
              />
            </div>
            <div>
              <Label className="text-slate-300 text-sm">Date de montage *</Label>
              <Input
                type="date"
                value={mountedDate}
                onChange={e => setMountedDate(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white mt-1"
              />
            </div>
            <div>
              <Label className="text-slate-300 text-sm">Profondeur au montage (mm)</Label>
              <Input
                type="number"
                step="0.1"
                value={treadDepthAtMount}
                onChange={e => setTreadDepthAtMount(e.target.value)}
                placeholder="optionnel"
                className="bg-slate-800 border-slate-700 text-white mt-1"
              />
            </div>
            <div>
              <Label className="text-slate-300 text-sm">Technicien / Garage</Label>
              <Input
                value={performedBy}
                onChange={e => setPerformedBy(e.target.value)}
                placeholder="optionnel"
                className="bg-slate-800 border-slate-700 text-white mt-1"
              />
            </div>
          </div>
          <div>
            <Label className="text-slate-300 text-sm">Notes</Label>
            <Input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="optionnel"
              className="bg-slate-800 border-slate-700 text-white mt-1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-400">
            Annuler
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-cyan-600 hover:bg-cyan-700">
            {loading ? 'Montage en cours...' : 'Monter le pneu'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
