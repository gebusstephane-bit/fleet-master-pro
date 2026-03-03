'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Fuel, 
  ArrowLeft, 
  CheckCircle2, 
  AlertTriangle,
  Droplets,
  DollarSign,
  Gauge,
  User,
  Building2,
  Camera
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { createPublicFuelRecord } from '@/actions/public-scan';
import Link from 'next/link';

interface PublicFuelFormProps {
  vehicleId: string;
  accessToken: string;
  vehicleInfo: {
    registration_number: string;
    brand?: string;
    model?: string;
    type?: string;
  };
}

type FuelType = 'diesel' | 'adblue' | 'gnr' | 'gasoline' | 'electric' | 'hybrid' | 'lpg';

const fuelTypes: { value: FuelType; label: string; icon: string; color: string }[] = [
  { value: 'diesel', label: 'Gasoil', icon: '⛽', color: 'bg-red-500/20 text-red-400 border-red-500/40' },
  { value: 'adblue', label: 'AdBlue', icon: '💧', color: 'bg-blue-500/20 text-blue-400 border-blue-500/40' },
  { value: 'gnr', label: 'GNR', icon: '🌿', color: 'bg-green-500/20 text-green-400 border-green-500/40' },
  { value: 'gasoline', label: 'Essence', icon: '⛽', color: 'bg-orange-500/20 text-orange-400 border-orange-500/40' },
];

export function PublicFuelForm({ vehicleId, accessToken, vehicleInfo }: PublicFuelFormProps) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [ticketNumber, setTicketNumber] = useState('');
  const [consumption, setConsumption] = useState<number | null>(null);

  // Form data
  const [fuelType, setFuelType] = useState<FuelType>('diesel');
  const [liters, setLiters] = useState('');
  const [priceTotal, setPriceTotal] = useState('');
  const [mileage, setMileage] = useState('');
  const [stationName, setStationName] = useState('');
  const [driverName, setDriverName] = useState('');

  const handleSubmit = async () => {
    if (!liters || !priceTotal || !mileage || !driverName) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const result = await createPublicFuelRecord({
        vehicleId,
        accessToken,
        fuelType,
        liters: parseFloat(liters),
        priceTotal: parseFloat(priceTotal),
        mileage: parseInt(mileage),
        stationName: stationName || undefined,
        driverName,
      });

      if (result?.data?.success) {
        setTicketNumber(result.data.ticketNumber);
        setConsumption(result.data.consumption);
        setSuccess(true);
      } else {
        setError('Erreur lors de l\'enregistrement');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSubmitting(false);
    }
  };

  const pricePerLiter = liters && priceTotal 
    ? (parseFloat(priceTotal) / parseFloat(liters)).toFixed(3)
    : null;

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-4">
        <div className="max-w-md mx-auto pt-12">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center"
          >
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Plein enregistré !
            </h1>
            <p className="text-slate-400 mb-6">
              Votre saisie a été transmise avec succès
            </p>
            
            <Card className="bg-slate-800/50 border-slate-700 mb-6">
              <CardContent className="p-6">
                <p className="text-sm text-slate-500 mb-1">Numéro de ticket</p>
                <p className="text-3xl font-mono font-bold text-cyan-400">#{ticketNumber}</p>
                {consumption && (
                  <>
                    <Separator className="my-4 bg-slate-700" />
                    <p className="text-sm text-slate-500 mb-1">Consommation calculée</p>
                    <p className="text-xl font-bold text-green-400">{consumption} L/100km</p>
                  </>
                )}
              </CardContent>
            </Card>

            <div className="space-y-3">
              <Link href={`/scan/${vehicleId}?token=${accessToken}`}>
                <Button variant="outline" className="w-full">
                  Retour au menu
                </Button>
              </Link>
              <Button onClick={() => window.close()} variant="ghost" className="w-full text-slate-500">
                Fermer
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-4">
      <div className="max-w-2xl mx-auto py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Link href={`/scan/${vehicleId}?token=${accessToken}`}>
            <Button variant="ghost" size="sm" className="mb-4 -ml-2 text-slate-400">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Retour
            </Button>
          </Link>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
              <Fuel className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Saisir un plein</h1>
              <p className="text-slate-400 text-sm">{vehicleInfo.registration_number}</p>
            </div>
          </div>
        </motion.div>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-4 space-y-4">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Droplets className="w-5 h-5 text-cyan-400" />
                    Type de carburant
                  </h2>
                  
                  <div className="grid grid-cols-2 gap-3">
                    {fuelTypes.map((type) => (
                      <button
                        key={type.value}
                        onClick={() => setFuelType(type.value)}
                        className={`p-4 rounded-xl border-2 transition-all text-left ${
                          fuelType === type.value
                            ? type.color
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                        }`}
                      >
                        <span className="text-2xl mb-2 block">{type.icon}</span>
                        <span className="font-medium">{type.label}</span>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-4 space-y-4">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Gauge className="w-5 h-5 text-cyan-400" />
                    Informations
                  </h2>
                  
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Litres *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={liters}
                          onChange={(e) => setLiters(e.target.value)}
                          className="text-lg"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Prix total (€) *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={priceTotal}
                          onChange={(e) => setPriceTotal(e.target.value)}
                          className="text-lg"
                        />
                      </div>
                    </div>
                    
                    {pricePerLiter && (
                      <p className="text-sm text-slate-400 text-center">
                        ≈ {pricePerLiter} €/L
                      </p>
                    )}
                    
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Gauge className="w-4 h-4" />
                        Kilométrage compteur *
                      </Label>
                      <Input
                        type="number"
                        placeholder="Ex: 125000"
                        value={mileage}
                        onChange={(e) => setMileage(e.target.value)}
                        className="text-lg"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button 
                onClick={() => setStep(2)}
                className="w-full"
                size="lg"
                disabled={!liters || !priceTotal || !mileage}
              >
                Continuer
              </Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-4 space-y-4">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-cyan-400" />
                    Station service
                  </h2>
                  
                  <div className="space-y-2">
                    <Label>Nom de la station (optionnel)</Label>
                    <Input
                      placeholder="Ex: Total, Shell..."
                      value={stationName}
                      onChange={(e) => setStationName(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-4 space-y-4">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <User className="w-5 h-5 text-cyan-400" />
                    Conducteur
                  </h2>
                  
                  <div className="space-y-2">
                    <Label>Nom et prénom *</Label>
                    <Input
                      placeholder="Prénom Nom"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Récapitulatif */}
              <Card className="bg-slate-800/30 border-slate-700/50">
                <CardContent className="p-4">
                  <h3 className="text-sm font-medium text-slate-400 mb-3">Récapitulatif</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Carburant</span>
                      <span className="text-white">{fuelTypes.find(f => f.value === fuelType)?.label}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Quantité</span>
                      <span className="text-white">{liters} L</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Prix total</span>
                      <span className="text-white">{priceTotal} €</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Kilométrage</span>
                      <span className="text-white">{mileage} km</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Retour
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={submitting || !driverName}
                  className="flex-1"
                  size="lg"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Valider
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer sécurité */}
        <div className="mt-8 text-center">
          <p className="text-slate-600 text-xs">
            🔒 Données cryptées • Token: {accessToken.slice(0, 8)}...
          </p>
        </div>
      </div>
    </div>
  );
}
