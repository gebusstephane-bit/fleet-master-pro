'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ClipboardCheck, 
  ArrowLeft, 
  CheckCircle2, 
  AlertTriangle,
  Gauge,
  User,
  MapPin,
  AlertOctagon,
  Sparkles,
  Car,
  Fuel,
  Thermometer
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { createPublicInspection } from '@/actions/public-scan';
import Link from 'next/link';

interface PublicInspectionFormProps {
  vehicleId: string;
  accessToken: string;
  vehicleInfo: {
    registration_number: string;
    brand?: string;
    model?: string;
    type?: string;
    mileage?: number;
  };
}

type CheckStatus = 'OK' | 'WARNING' | 'CRITICAL';
type CleanlinessStatus = 'CLEAN' | 'DIRTY' | 'DAMAGED';

interface CheckItem {
  id: string;
  label: string;
  category: 'CRITICAL' | 'IMPORTANT' | 'STANDARD';
  status: CheckStatus;
  note?: string;
}

interface CleanlinessItem {
  id: string;
  label: string;
  status: CleanlinessStatus;
}

const isPL = (type: string) => type === 'POIDS_LOURD' || type === 'POIDS_LOURD_FRIGO';
const isPLFrigo = (type: string) => type === 'POIDS_LOURD_FRIGO';
const needsAdBlue = (type: string) => isPL(type);
const needsGNR = (type: string) => isPLFrigo(type);
const needsTemperature = (type: string) => isPLFrigo(type);

const getEssentialChecks = (vehicleType: string): CheckItem[] => {
  const checks: CheckItem[] = [
    { id: 'brakes', label: 'Freinage (pédale, efficacité)', category: 'CRITICAL', status: 'OK' },
    { id: 'tires', label: 'Pneus (usure, pression, hernie)', category: 'CRITICAL', status: 'OK' },
    { id: 'lights', label: 'Éclairage (feux, clignotants, stop)', category: 'CRITICAL', status: 'OK' },
    { id: 'steering', label: 'Direction (jeu, bruit)', category: 'CRITICAL', status: 'OK' },
    { id: 'fluids', label: 'Niveaux (huile, liquide frein)', category: 'IMPORTANT', status: 'OK' },
    { id: 'wipers', label: 'Essuie-glaces', category: 'IMPORTANT', status: 'OK' },
    { id: 'horn', label: 'Avertisseur sonore', category: 'IMPORTANT', status: 'OK' },
    { id: 'seatbelts', label: 'Ceintures de sécurité', category: 'IMPORTANT', status: 'OK' },
    { id: 'documents', label: 'Documents (grise, assurance, CT)', category: 'IMPORTANT', status: 'OK' },
    { id: 'safety_kit', label: 'Kit sécurité (triangle, gilet)', category: 'STANDARD', status: 'OK' },
  ];

  if (isPL(vehicleType)) {
    checks.push(
      { id: 'tachograph', label: 'Tachygraphe', category: 'IMPORTANT', status: 'OK' },
    );
  }

  if (isPLFrigo(vehicleType)) {
    checks.push(
      { id: 'fridge_motor', label: 'Moteur frigorifique', category: 'CRITICAL', status: 'OK' },
      { id: 'fridge_temp', label: 'Température groupe frigo', category: 'CRITICAL', status: 'OK' },
    );
  }

  return checks;
};

const getCleanlinessChecks = (vehicleType: string): CleanlinessItem[] => [
  { id: 'ext_body', label: 'Carrosserie extérieure', status: 'CLEAN' },
  { id: 'windows', label: 'Vitres et rétroviseurs', status: 'CLEAN' },
  { id: 'int_cabin', label: 'Habitacle', status: 'CLEAN' },
];

const calculateScore = (checks: CheckItem[]): { score: number; status: 'excellent' | 'good' | 'warning' | 'critical' } => {
  const criticalCount = checks.filter(c => c.category === 'CRITICAL' && c.status !== 'OK').length;
  const warningCount = checks.filter(c => c.status === 'WARNING').length;
  
  let score = 100;
  if (criticalCount > 0) score -= criticalCount * 25;
  if (warningCount > 0) score -= warningCount * 10;
  
  let status: 'excellent' | 'good' | 'warning' | 'critical' = 'excellent';
  if (criticalCount > 0) status = 'critical';
  else if (score < 80) status = 'warning';
  else if (score < 95) status = 'good';
  
  return { score: Math.max(0, score), status };
};

const statusConfig = {
  excellent: { color: 'bg-green-500', label: 'Excellent', badge: 'bg-green-500/20 text-green-400' },
  good: { color: 'bg-blue-500', label: 'Bon', badge: 'bg-blue-500/20 text-blue-400' },
  warning: { color: 'bg-amber-500', label: 'À surveiller', badge: 'bg-amber-500/20 text-amber-400' },
  critical: { color: 'bg-red-500', label: 'Critique', badge: 'bg-red-500/20 text-red-400' },
};

export function PublicInspectionForm({ vehicleId, accessToken, vehicleInfo }: PublicInspectionFormProps) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [ticketNumber, setTicketNumber] = useState('');

  // Form data
  const [checks, setChecks] = useState<CheckItem[]>([]);
  const [cleanliness, setCleanliness] = useState<CleanlinessItem[]>([]);
  const [mileage, setMileage] = useState('');
  const [fuelLevel, setFuelLevel] = useState(50);
  const [adblueLevel, setAdblueLevel] = useState(50);
  const [gnrLevel, setGnrLevel] = useState(50);
  const [compartmentC1Temp, setCompartmentC1Temp] = useState('');
  const [compartmentC2Temp, setCompartmentC2Temp] = useState('');
  const [driverName, setDriverName] = useState('');
  const [location, setLocation] = useState('Dépôt');

  useEffect(() => {
    if (vehicleInfo.type) {
      setChecks(getEssentialChecks(vehicleInfo.type));
      setCleanliness(getCleanlinessChecks(vehicleInfo.type));
    }
  }, [vehicleInfo.type]);

  const { score, status } = calculateScore(checks);
  const config = statusConfig[status];

  const updateCheck = (id: string, status: CheckStatus) => {
    setChecks(prev => prev.map(c => c.id === id ? { ...c, status } : c));
  };

  const updateCleanliness = (id: string, status: CleanlinessStatus) => {
    setCleanliness(prev => prev.map(c => c.id === id ? { ...c, status } : c));
  };

  const handleSubmit = async () => {
    if (!mileage || !driverName) {
      setError('Veuillez remplir le kilométrage et le nom du conducteur');
      return;
    }
    
    // Validation du kilométrage (doit être >= au kilométrage actuel du véhicule)
    const inputMileage = parseInt(mileage, 10);
    if (vehicleInfo.mileage && inputMileage < vehicleInfo.mileage) {
      setError(`Kilométrage invalide. Le compteur indique ${vehicleInfo.mileage.toLocaleString('fr-FR')} km. Vous ne pouvez pas saisir une valeur inférieure.`);
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const result = await createPublicInspection({
        vehicleId,
        accessToken,
        mileage: parseInt(mileage),
        fuelLevel,
        adblueLevel: needsAdBlue(vehicleInfo.type || '') ? adblueLevel : undefined,
        gnrLevel: needsGNR(vehicleInfo.type || '') ? gnrLevel : undefined,
        driverName,
        location,
        checks: checks.map(c => ({ id: c.id, status: c.status, note: c.note })),
        cleanliness: cleanliness.map(c => ({ id: c.id, status: c.status })),
        compartmentC1Temp: needsTemperature(vehicleInfo.type || '') && compartmentC1Temp ? parseFloat(compartmentC1Temp) : undefined,
        compartmentC2Temp: needsTemperature(vehicleInfo.type || '') && compartmentC2Temp ? parseFloat(compartmentC2Temp) : undefined,
      });

      if (result?.data?.success) {
        setTicketNumber(result.data.ticketNumber ?? '');
        setSuccess(true);
      } else {
        setError((result?.data as { error?: string } | undefined)?.error || 'Erreur lors de l\'enregistrement');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSubmitting(false);
    }
  };

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
              Contrôle enregistré !
            </h1>
            <p className="text-slate-400 mb-6">
              Votre inspection a été transmise avec succès
            </p>
            
            <Card className="bg-slate-800/50 border-slate-700 mb-6">
              <CardContent className="p-6">
                <p className="text-sm text-slate-500 mb-1">Numéro de ticket</p>
                <p className="text-3xl font-mono font-bold text-cyan-400">#{ticketNumber}</p>
                <Separator className="my-4 bg-slate-700" />
                <div className="flex items-center justify-center gap-2">
                  <span className="text-sm text-slate-500">Score:</span>
                  <span className={`text-xl font-bold ${config.badge}`}>{score}%</span>
                </div>
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
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <ClipboardCheck className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Contrôle pré-départ</h1>
                <p className="text-slate-400 text-sm">{vehicleInfo.registration_number}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-white">{score}%</div>
              <Badge className={config.badge}>{config.label}</Badge>
            </div>
          </div>
          
          <Progress value={score} className="h-2 mt-4" />
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
                    <Gauge className="w-5 h-5 text-cyan-400" />
                    Informations générales
                  </h2>
                  
                  <div className="space-y-4">
                    {/* Affichage du kilométrage actuel (référence) */}
                    {vehicleInfo.mileage && vehicleInfo.mileage > 0 && (
                      <div className="mb-4 p-3 bg-slate-800/70 rounded-lg border border-slate-700">
                        <p className="text-sm text-slate-400">Kilométrage actuel du véhicule:</p>
                        <p className="text-lg font-semibold text-amber-400">{vehicleInfo.mileage.toLocaleString('fr-FR')} km</p>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="flex items-center justify-between">
                          <span>Kilométrage *</span>
                          {vehicleInfo.mileage && vehicleInfo.mileage > 0 && (
                            <span className="text-xs text-slate-400">Min: {vehicleInfo.mileage.toLocaleString('fr-FR')} km</span>
                          )}
                        </Label>
                        <Input
                          type="number"
                          min={vehicleInfo.mileage || 0}
                          placeholder={vehicleInfo.mileage ? `Min: ${vehicleInfo.mileage}` : 'Ex: 125000'}
                          value={mileage}
                          onChange={(e) => setMileage(e.target.value)}
                          className="text-lg"
                        />
                        {vehicleInfo.mileage && vehicleInfo.mileage > 0 && (
                          <p className="text-xs text-slate-500">
                            Le kilométrage saisi doit être supérieur ou égal à {vehicleInfo.mileage.toLocaleString('fr-FR')} km
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          Lieu
                        </Label>
                        <Input
                          placeholder="Dépôt"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                        />
                      </div>
                    </div>

                    {/* Niveaux carburant */}
                    <div className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Fuel className="w-4 h-4 text-red-400" />
                          Niveau gasoil : {fuelLevel}%
                        </Label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={fuelLevel}
                          onChange={(e) => setFuelLevel(parseInt(e.target.value))}
                          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                        />
                      </div>

                      {needsAdBlue(vehicleInfo.type || '') && (
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Fuel className="w-4 h-4 text-blue-400" />
                            Niveau AdBlue : {adblueLevel}%
                          </Label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={adblueLevel}
                            onChange={(e) => setAdblueLevel(parseInt(e.target.value))}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                      )}

                      {needsGNR(vehicleInfo.type || '') && (
                        <div className="space-y-2">
                          <Label className="flex items-center gap-2">
                            <Fuel className="w-4 h-4 text-green-400" />
                            Niveau GNR : {gnrLevel}%
                          </Label>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={gnrLevel}
                            onChange={(e) => setGnrLevel(parseInt(e.target.value))}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                      )}

                      {needsTemperature(vehicleInfo.type || '') && (
                        <div className="grid grid-cols-2 gap-4 pt-2">
                          <div className="space-y-1">
                            <Label className="flex items-center gap-1 text-sm">
                              <Thermometer className="w-3 h-3" />
                              Compart. 1 (°C)
                            </Label>
                            <Input
                              type="number"
                              placeholder="-18"
                              value={compartmentC1Temp}
                              onChange={(e) => setCompartmentC1Temp(e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="flex items-center gap-1 text-sm">
                              <Thermometer className="w-3 h-3" />
                              Compart. 2 (°C)
                            </Label>
                            <Input
                              type="number"
                              placeholder="-18"
                              value={compartmentC2Temp}
                              onChange={(e) => setCompartmentC2Temp(e.target.value)}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Button 
                onClick={() => setStep(2)}
                className="w-full"
                size="lg"
                disabled={!mileage}
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
              {/* Points critiques */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-4">
                  <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <AlertOctagon className="w-5 h-5 text-red-400" />
                    Points critiques
                  </h2>
                  <div className="space-y-3">
                    {checks.filter(c => c.category === 'CRITICAL').map(check => (
                      <CheckItemRow key={check.id} check={check} onUpdate={updateCheck} />
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Points importants */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-4">
                  <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                    Points importants
                  </h2>
                  <div className="space-y-3">
                    {checks.filter(c => c.category === 'IMPORTANT').map(check => (
                      <CheckItemRow key={check.id} check={check} onUpdate={updateCheck} />
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Équipement */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-4">
                  <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Car className="w-5 h-5 text-slate-400" />
                    Équipement
                  </h2>
                  <div className="space-y-3">
                    {checks.filter(c => c.category === 'STANDARD').map(check => (
                      <CheckItemRow key={check.id} check={check} onUpdate={updateCheck} compact />
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Propreté */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-4">
                  <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    État de propreté
                  </h2>
                  <div className="space-y-3">
                    {cleanliness.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-slate-800/40 rounded-lg">
                        <span className="text-slate-300 text-sm">{item.label}</span>
                        <div className="flex gap-2">
                          {(['CLEAN', 'DIRTY', 'DAMAGED'] as CleanlinessStatus[]).map(status => {
                            const colors = {
                              CLEAN: 'bg-green-600 text-white',
                              DIRTY: 'bg-amber-600 text-white',
                              DAMAGED: 'bg-red-600 text-white',
                            };
                            const labels = { CLEAN: 'Propre', DIRTY: 'Sale', DAMAGED: 'Abîmé' };
                            return (
                              <button
                                key={status}
                                onClick={() => updateCleanliness(item.id, status)}
                                className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                                  item.status === status ? colors[status] : 'bg-slate-700 text-slate-400'
                                }`}
                              >
                                {labels[status]}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Retour
                </Button>
                <Button onClick={() => setStep(3)} className="flex-1" size="lg">
                  Continuer
                </Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="p-4 space-y-4">
                  <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <User className="w-5 h-5 text-cyan-400" />
                    Validation
                  </h2>

                  {/* Récap visuel */}
                  <div className="bg-slate-800/40 p-4 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm text-slate-400">État du véhicule</p>
                        <p className="text-2xl font-bold text-white">{config.label}</p>
                      </div>
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold ${config.color}`}>
                        {score}%
                      </div>
                    </div>

                    {checks.filter(c => c.status !== 'OK').length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-slate-300">Points à vérifier:</p>
                        {checks.filter(c => c.status !== 'OK').map(c => (
                          <div key={c.id} className={`text-sm p-2 rounded ${c.status === 'CRITICAL' ? 'bg-red-900/30 text-red-400' : 'bg-amber-900/30 text-amber-400'}`}>
                            • {c.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Nom du conducteur *</Label>
                    <Input
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      placeholder="Prénom Nom"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
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
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Composant ligne de contrôle
function CheckItemRow({ 
  check, 
  onUpdate,
  compact = false 
}: { 
  check: CheckItem; 
  onUpdate: (id: string, status: CheckStatus) => void;
  compact?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${
      check.status === 'CRITICAL' ? 'bg-red-900/20 border-red-500/40' :
      check.status === 'WARNING' ? 'bg-amber-900/20 border-amber-500/40' :
      'bg-slate-800/40 border-slate-700/50'
    }`}>
      <span className={`font-medium text-slate-200 ${compact ? 'text-sm' : ''}`}>
        {check.label}
      </span>
      <div className="flex gap-1">
        {(['OK', 'WARNING', 'CRITICAL'] as CheckStatus[]).map(status => {
          const colors = {
            OK: check.status === 'OK' ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-400',
            WARNING: check.status === 'WARNING' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400',
            CRITICAL: check.status === 'CRITICAL' ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400',
          };
          return (
            <button
              key={status}
              onClick={() => onUpdate(check.id, status)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${colors[status]}`}
            >
              {status === 'OK' ? 'OK' : status === 'WARNING' ? '⚠️' : '🔴'}
            </button>
          );
        })}
      </div>
    </div>
  );
}
