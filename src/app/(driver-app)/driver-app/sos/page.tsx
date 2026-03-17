'use client';

import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Disc,
  Wrench,
  Snowflake,
  Package,
  Car,
  MapPin,
  Loader2,
  RotateCcw,
  Phone,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useUserContext } from '@/components/providers/user-provider';
import { getSupabaseClient } from '@/lib/supabase/client';
import { EmergencyContractCard } from '@/components/sos/v4/EmergencyContractCard';
import { InsuranceCard } from '@/components/sos/v4/InsuranceCard';
import { GarageCard } from '@/components/sos/v4/GarageCard';

// ============================================================================
// TYPES
// ============================================================================

type BreakdownType = 'pneu' | 'mecanique' | 'frigo' | 'hayon' | 'accident';

const BREAKDOWN_OPTIONS = [
  { value: 'pneu' as const, label: 'Pneu crevé', icon: Disc, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  { value: 'mecanique' as const, label: 'Panne moteur', icon: Wrench, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  { value: 'frigo' as const, label: 'Frigo HS', icon: Snowflake, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' },
  { value: 'hayon' as const, label: 'Hayon bloqué', icon: Package, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
  { value: 'accident' as const, label: 'Accident', icon: Car, color: 'text-red-500', bg: 'bg-red-500/20', border: 'border-red-500/50' },
];

// ============================================================================
// PAGE SOS CHAUFFEUR
// ============================================================================

export default function DriverSOSPage() {
  const { user } = useUserContext();
  const [step, setStep] = useState(1);
  const [breakdownType, setBreakdownType] = useState<BreakdownType | null>(null);
  const [distance, setDistance] = useState<'close' | 'far' | null>(null);
  const [vehicleState, setVehicleState] = useState<'rolling' | 'immobilized' | null>(null);
  const [locationText, setLocationText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Véhicule du chauffeur
  const [vehicleInfo, setVehicleInfo] = useState<{ id: string; immat: string; label: string } | null>(null);

  useEffect(() => {
    const fetchVehicle = async () => {
      if (!user?.id) return;
      const supabase = getSupabaseClient();
      const { data: driver } = await supabase
        .from('drivers')
        .select('current_vehicle_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (driver?.current_vehicle_id) {
        const { data: vehicle } = await supabase
          .from('vehicles')
          .select('id, registration_number, brand, model')
          .eq('id', driver.current_vehicle_id)
          .maybeSingle();

        if (vehicle) {
          setVehicleInfo({
            id: vehicle.id,
            immat: vehicle.registration_number,
            label: `${vehicle.brand} ${vehicle.model}`,
          });
        }
      }
    };
    fetchVehicle();
  }, [user?.id]);

  const handleAnalyze = async () => {
    if (!breakdownType || !distance || !vehicleState || !vehicleInfo) return;
    setLoading(true);
    try {
      const res = await fetch('/api/sos/analyze-driver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId: vehicleInfo.id,
          breakdownType,
          distanceCategory: distance,
          vehicleState,
          location: locationText || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur serveur');
      setResult(data);
      setStep(3);
    } catch (err: any) {
      setResult({ type: 'none', message: err.message || 'Erreur de connexion' });
      setStep(3);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep(1);
    setBreakdownType(null);
    setDistance(null);
    setVehicleState(null);
    setLocationText('');
    setResult(null);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-10 w-10" asChild>
          <Link href="/driver-app">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold text-white">SOS Garage</h1>
          <p className="text-xs text-slate-400">Assistance en cas de panne</p>
        </div>
      </div>

      {/* Véhicule actuel */}
      {vehicleInfo && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
          <Car className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-medium text-white">{vehicleInfo.immat}</span>
          <span className="text-xs text-slate-400">{vehicleInfo.label}</span>
        </div>
      )}

      {!vehicleInfo && (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">
          <AlertTriangle className="h-4 w-4 inline mr-2" />
          Aucun véhicule assigné. Contactez votre gestionnaire.
        </div>
      )}

      {/* ============ STEP 1 — Type de panne ============ */}
      {step === 1 && vehicleInfo && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-300">Quel est le problème ?</h2>
          <div className="grid grid-cols-2 gap-3">
            {BREAKDOWN_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const selected = breakdownType === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => {
                    setBreakdownType(opt.value);
                    setStep(2);
                  }}
                  className={cn(
                    'flex flex-col items-center gap-2 p-4 rounded-xl border transition-all text-center',
                    selected
                      ? cn(opt.bg, opt.border)
                      : 'bg-slate-800/50 border-slate-700 hover:border-slate-500'
                  )}
                >
                  <div className={cn('p-3 rounded-lg', opt.bg)}>
                    <Icon className={cn('h-6 w-6', opt.color)} />
                  </div>
                  <span className="text-sm font-medium text-white">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ============ STEP 2 — Situation ============ */}
      {step === 2 && (
        <div className="space-y-4">
          <button onClick={() => setStep(1)} className="text-xs text-blue-400 hover:underline">
            &larr; Changer le type de panne
          </button>

          {/* Distance */}
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-300">Distance du dépôt ?</h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setDistance('close')}
                className={cn(
                  'p-4 rounded-xl border text-center transition-all',
                  distance === 'close'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:border-slate-500'
                )}
              >
                <div className="text-lg font-bold">&lt; 50 km</div>
                <div className="text-xs mt-1">Zone habituelle</div>
              </button>
              <button
                onClick={() => setDistance('far')}
                className={cn(
                  'p-4 rounded-xl border text-center transition-all',
                  distance === 'far'
                    ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                    : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:border-slate-500'
                )}
              >
                <div className="text-lg font-bold">&gt; 50 km</div>
                <div className="text-xs mt-1">Hors périmètre</div>
              </button>
            </div>
          </div>

          {/* État du véhicule */}
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-300">Le véhicule peut-il rouler ?</h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setVehicleState('rolling')}
                className={cn(
                  'p-4 rounded-xl border text-center transition-all',
                  vehicleState === 'rolling'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:border-slate-500'
                )}
              >
                <div className="text-sm font-bold">Roulant</div>
                <div className="text-xs mt-1">Peut avancer</div>
              </button>
              <button
                onClick={() => setVehicleState('immobilized')}
                className={cn(
                  'p-4 rounded-xl border text-center transition-all',
                  vehicleState === 'immobilized'
                    ? 'bg-red-500/10 border-red-500/30 text-red-400'
                    : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:border-slate-500'
                )}
              >
                <div className="text-sm font-bold">Immobilisé</div>
                <div className="text-xs mt-1">Ne bouge plus</div>
              </button>
            </div>
          </div>

          {/* Localisation optionnelle */}
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-300">Où êtes-vous ? (optionnel)</h2>
            <div className="flex gap-2">
              <Input
                placeholder="Ex: A7 sortie 23, Lyon..."
                value={locationText}
                onChange={(e) => setLocationText(e.target.value)}
                className="bg-slate-900/50 border-slate-700 flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="shrink-0"
                onClick={() => {
                  if (!navigator.geolocation) return;
                  navigator.geolocation.getCurrentPosition(
                    (pos) => setLocationText(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`),
                    () => {}
                  );
                }}
              >
                <MapPin className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Bouton Analyser */}
          <Button
            onClick={handleAnalyze}
            disabled={!distance || !vehicleState || loading}
            className="w-full h-12 text-base bg-red-600 hover:bg-red-500"
          >
            {loading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Recherche en cours...
              </>
            ) : (
              <>
                <Phone className="h-5 w-5 mr-2" />
                Trouver une solution
              </>
            )}
          </Button>
        </div>
      )}

      {/* ============ STEP 3 — Résultat ============ */}
      {step === 3 && result && (
        <div className="space-y-4">
          {result.type === 'contract' && (
            <EmergencyContractCard data={result.data} message={result.message} />
          )}

          {result.type === 'insurance' && (
            <InsuranceCard data={result.data} message={result.message} />
          )}

          {(result.type === 'garage_partner' || result.type === 'garage_external') && (
            <GarageCard data={result.data} type={result.type} message={result.message} />
          )}

          {result.type === 'none' && (
            <Card className="border-slate-500/30 bg-slate-800/50">
              <CardContent className="p-6 space-y-4">
                <p className="text-sm text-slate-300">{result.message}</p>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-400">Numéros d&apos;urgence :</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'SAMU', num: '15' },
                      { label: 'Police', num: '17' },
                      { label: 'Pompiers', num: '18' },
                      { label: 'Urgences EU', num: '112' },
                    ].map((e) => (
                      <a
                        key={e.num}
                        href={`tel:${e.num}`}
                        className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 font-semibold text-sm"
                      >
                        <Phone className="h-4 w-4" />
                        {e.label} — {e.num}
                      </a>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bouton recommencer */}
          <Button onClick={reset} variant="outline" className="w-full">
            <RotateCcw className="h-4 w-4 mr-2" />
            Recommencer
          </Button>
        </div>
      )}
    </div>
  );
}
