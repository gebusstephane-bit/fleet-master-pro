'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, CheckCircle2, AlertTriangle, AlertOctagon,
  Gauge, Fuel, Thermometer, Pen, Camera, Sparkles, X,
  Car, Circle, CircleCheck, CircleAlert, CircleX
} from 'lucide-react';
import { useVehicle } from '@/hooks/use-vehicles';
import { createInspectionSafe } from '@/actions/inspections-safe';
import { Skeleton } from '@/components/ui/skeleton';

// Types simplifiés
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

// Points de contrôle ESSENTIELS uniquement
const getEssentialChecks = (vehicleType: string): CheckItem[] => {
  const checks: CheckItem[] = [
    // CRITIQUES - Sécurité
    { id: 'brakes', label: 'Freinage (pédale, efficacité)', category: 'CRITICAL', status: 'OK' },
    { id: 'tires', label: 'Pneus (usure, pression, hernie)', category: 'CRITICAL', status: 'OK' },
    { id: 'lights', label: 'Éclairage (feux, clignotants, stop)', category: 'CRITICAL', status: 'OK' },
    { id: 'steering', label: 'Direction (jeu, bruit)', category: 'CRITICAL', status: 'OK' },
    
    // IMPORTANTS - Fonctionnement
    { id: 'fluids', label: 'Niveaux (huile, liquide frein, refroidissement)', category: 'IMPORTANT', status: 'OK' },
    { id: 'wipers', label: 'Essuie-glaces (état, fonctionnement)', category: 'IMPORTANT', status: 'OK' },
    { id: ' horn', label: 'Avertisseur sonore', category: 'IMPORTANT', status: 'OK' },
    { id: 'seatbelts', label: 'Ceintures de sécurité', category: 'IMPORTANT', status: 'OK' },
    { id: 'documents', label: 'Documents (carte grise, assurance, CT)', category: 'IMPORTANT', status: 'OK' },
    
    // STANDARDS - Équipement
    { id: 'safety_kit', label: 'Kit de sécurité (triangle, gilet, extincteur)', category: 'STANDARD', status: 'OK' },
    { id: 'spare_tire', label: 'Roue de secours / Kit anti-crevaison', category: 'STANDARD', status: 'OK' },
  ];
  
  // Ajouts PL
  if (isPL(vehicleType)) {
    checks.push(
      { id: 'tachograph', label: 'Tachygraphe (carte, fonctionnement)', category: 'IMPORTANT', status: 'OK' },
      { id: 'tail_lift', label: 'Hayon élévateur (si équipé)', category: 'IMPORTANT', status: 'OK' },
    );
  }
  
  // Ajouts PL Frigo
  if (isPLFrigo(vehicleType)) {
    checks.push(
      { id: 'fridge_temp', label: 'Groupe frigorifique (température)', category: 'CRITICAL', status: 'OK' },
    );
  }
  
  return checks;
};

// Propreté simplifiée
const getCleanlinessChecks = (vehicleType: string): CleanlinessItem[] => {
  const items: CleanlinessItem[] = [
    { id: 'ext_body', label: 'Carrosserie extérieure', status: 'CLEAN' },
    { id: 'windows', label: 'Vitres et rétroviseurs', status: 'CLEAN' },
    { id: 'int_cabin', label: 'Habitacle (sièges, sol, tableau)', status: 'CLEAN' },
  ];
  
  if (isPL(vehicleType)) {
    items.push({ id: 'cargo_area', label: 'Caisse / Soute', status: 'CLEAN' });
  }
  
  return items;
};

// Calculer le score
const calculateScore = (checks: CheckItem[]): { score: number; status: 'excellent' | 'good' | 'warning' | 'critical' } => {
  const criticalCount = checks.filter(c => c.category === 'CRITICAL' && c.status !== 'OK').length;
  const warningCount = checks.filter(c => c.status === 'WARNING').length;
  const criticalOk = checks.filter(c => c.category === 'CRITICAL' && c.status === 'OK').length;
  const totalCritical = checks.filter(c => c.category === 'CRITICAL').length;
  
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
  excellent: { color: 'bg-green-500', label: 'Excellent', badge: 'bg-green-100 text-green-800' },
  good: { color: 'bg-blue-500', label: 'Bon', badge: 'bg-blue-100 text-blue-800' },
  warning: { color: 'bg-amber-500', label: 'À surveiller', badge: 'bg-amber-100 text-amber-800' },
  critical: { color: 'bg-red-500', label: 'Critique', badge: 'bg-red-100 text-red-800' },
};

const cleanlinessConfig = {
  CLEAN: { label: 'Propre', icon: Sparkles, color: 'text-green-600 bg-green-50 border-green-200' },
  DIRTY: { label: 'Sale', icon: AlertTriangle, color: 'text-amber-600 bg-amber-50 border-amber-200' },
  DAMAGED: { label: 'Abîmé', icon: AlertOctagon, color: 'text-red-600 bg-red-50 border-red-200' },
};

export default function InspectionPage() {
  const params = useParams();
  const router = useRouter();
  const vehicleId = params.vehicleId as string;
  
  const { data: vehicle, isLoading } = useVehicle(vehicleId);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState(1);
  
  // Données formulaire
  const [mileage, setMileage] = useState('');
  const [fuelLevel, setFuelLevel] = useState(50);
  const [adblueLevel, setAdblueLevel] = useState(50);
  const [gnrLevel, setGnrLevel] = useState(50);
  const [driverName, setDriverName] = useState('');
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState('Dépôt');
  
  // Points de contrôle
  const [checks, setChecks] = useState<CheckItem[]>([]);
  const [cleanliness, setCleanliness] = useState<CleanlinessItem[]>([]);
  
  useEffect(() => {
    if (vehicle) {
      setChecks(getEssentialChecks(vehicle.type));
      setCleanliness(getCleanlinessChecks(vehicle.type));
    }
  }, [vehicle]);
  
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
    
    setSubmitting(true);
    setError('');
    
    try {
      const defects = checks
        .filter(c => c.status !== 'OK')
        .map(c => ({
          id: crypto.randomUUID(),
          category: c.category === 'CRITICAL' ? 'MECANIQUE' : 'AUTRE',
          description: `${c.label}: ${c.status === 'CRITICAL' ? 'Problème critique' : 'À surveiller'}`,
          severity: (c.status === 'CRITICAL' ? 'CRITIQUE' : 'MAJEUR') as 'CRITIQUE' | 'MAJEUR' | 'MINEUR',
        }));
      
      // Ajouter les problèmes de propreté
      const dirtyItems = cleanliness.filter(c => c.status !== 'CLEAN');
      if (dirtyItems.length > 0) {
        defects.push({
          id: crypto.randomUUID(),
          category: 'PROPRETE',
          description: `Propreté: ${dirtyItems.map(i => i.label).join(', ')} - ${dirtyItems.map(i => cleanlinessConfig[i.status].label).join(', ')}`,
          severity: (dirtyItems.some(i => i.status === 'DAMAGED') ? 'MAJEUR' : 'MINEUR') as 'CRITIQUE' | 'MAJEUR' | 'MINEUR',
        });
      }
      
      const result = await createInspectionSafe({
        vehicleId,
        mileage: parseInt(mileage) || 0,
        fuelLevel,
        adblueLevel: isPL((vehicle as any)?.type) ? adblueLevel : undefined,
        gnrLevel: isPLFrigo((vehicle as any)?.type) ? gnrLevel : undefined,
        cleanlinessExterior: 3,
        cleanlinessInterior: 3,
        compartmentC1Temp: undefined,
        compartmentC2Temp: undefined,
        tiresCondition: {
          frontLeft: 'GOOD',
          frontRight: 'GOOD',
          rearLeft: 'GOOD',
          rearRight: 'GOOD',
          spare: 'GOOD',
        },
        reportedDefects: defects,
        driverName,
        inspectorNotes: notes + `\n\nÉtat global: ${config.label} (${score}%)\nPoints contrôlés: ${checks.filter(c => c.status === 'OK').length}/${checks.length} OK`,
        location,
        score,
        grade: status === 'excellent' ? 'A' : status === 'good' ? 'B' : status === 'warning' ? 'C' : 'D',
        status: 'PENDING',
      });
      
      if (result?.error) {
        setError(result.error);
      } else {
        router.push('/inspections?success=true');
      }
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la soumission');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
        <div className="max-w-3xl mx-auto px-4">
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
        <div className="max-w-3xl mx-auto px-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>Véhicule non trouvé</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-6">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header Élégant */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Button variant="ghost" size="sm" asChild className="mb-4">
            <Link href="/vehicles">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Link>
          </Button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Contrôle technique</h1>
              <p className="text-slate-500 mt-1">
                {(vehicle as any)?.registration_number || ''} • {(vehicle as any)?.brand || ''} {(vehicle as any)?.model || ''}
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{score}%</div>
              <Badge className={config.badge}>{config.label}</Badge>
            </div>
          </div>
          
          {/* Barre de progression */}
          <div className="mt-4">
            <Progress value={score} className="h-2" />
            <div className="flex justify-between mt-2">
              {[1, 2, 3].map(s => (
                <button
                  key={s}
                  onClick={() => setStep(s)}
                  className={`flex items-center gap-2 text-sm ${step === s ? 'text-blue-600 font-medium' : 'text-slate-400'}`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    step > s ? 'bg-green-500 text-white' : 
                    step === s ? 'bg-blue-600 text-white' : 
                    'bg-slate-200'
                  }`}>
                    {step > s ? <CheckCircle2 className="h-4 w-4" /> : s}
                  </div>
                  {s === 1 ? 'Informations' : s === 2 ? 'Points de contrôle' : 'Validation'}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <AnimatePresence mode="wait">
          {/* ÉTAPE 1: Informations */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6 space-y-6">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Gauge className="h-5 w-5 text-blue-600" />
                    Informations générales
                  </h2>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Kilométrage *</Label>
                      <Input
                        type="number"
                        placeholder={(vehicle as any)?.mileage?.toString()}
                        value={mileage}
                        onChange={(e) => setMileage(e.target.value)}
                        className="text-lg"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Lieu</Label>
                      <Input
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Niveau carburant - TOUS les véhicules */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Fuel className="h-4 w-4 text-red-500" />
                        Niveau carburant (gasoil/essence): {fuelLevel}%
                      </Label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={fuelLevel}
                        onChange={(e) => setFuelLevel(parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Vide</span>
                        <span>1/2</span>
                        <span>Plein</span>
                      </div>
                    </div>

                    {/* AdBlue - PL et PL Frigo uniquement */}
                    {isPL((vehicle as any)?.type) && (
                      <div className="space-y-2 pt-4 border-t">
                        <Label className="flex items-center gap-2">
                          <Fuel className="h-4 w-4 text-blue-500" />
                          Niveau AdBlue: {adblueLevel}%
                        </Label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={adblueLevel}
                          onChange={(e) => setAdblueLevel(parseInt(e.target.value))}
                          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-slate-400">
                          <span>Vide</span>
                          <span>1/2</span>
                          <span>Plein</span>
                        </div>
                      </div>
                    )}

                    {/* GNR - PL Frigo uniquement */}
                    {isPLFrigo((vehicle as any)?.type) && (
                      <div className="space-y-2 pt-4 border-t">
                        <Label className="flex items-center gap-2">
                          <Fuel className="h-4 w-4 text-green-500" />
                          Niveau GNR (groupe frigo): {gnrLevel}%
                        </Label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={gnrLevel}
                          onChange={(e) => setGnrLevel(parseInt(e.target.value))}
                          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between text-xs text-slate-400">
                          <span>Vide</span>
                          <span>1/2</span>
                          <span>Plein</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <Button onClick={() => setStep(2)} className="w-full" size="lg">
                    Continuer
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ÉTAPE 2: Points de contrôle */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Points critiques */}
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <AlertOctagon className="h-5 w-5 text-red-600" />
                    Points critiques
                  </h2>
                  <div className="space-y-3">
                    {checks.filter(c => c.category === 'CRITICAL').map(check => (
                      <CheckItemRow 
                        key={check.id} 
                        check={check} 
                        onUpdate={updateCheck}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Points importants */}
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    Points importants
                  </h2>
                  <div className="space-y-3">
                    {checks.filter(c => c.category === 'IMPORTANT').map(check => (
                      <CheckItemRow 
                        key={check.id} 
                        check={check} 
                        onUpdate={updateCheck}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Propreté - Nouveau système */}
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                    État de propreté
                  </h2>
                  <div className="space-y-3">
                    {cleanliness.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <span className="font-medium text-slate-900">{item.label}</span>
                        <div className="flex gap-2">
                          {(['CLEAN', 'DIRTY', 'DAMAGED'] as CleanlinessStatus[]).map(status => {
                            const config = cleanlinessConfig[status];
                            return (
                              <button
                                key={status}
                                onClick={() => updateCleanliness(item.id, status)}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                  item.status === status 
                                    ? config.color + ' ring-2 ring-offset-1' 
                                    : 'bg-white border hover:bg-slate-50'
                                }`}
                              >
                                <config.icon className="h-4 w-4 inline mr-1" />
                                {config.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Points standard */}
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4">Équipement</h2>
                  <div className="grid grid-cols-1 gap-3">
                    {checks.filter(c => c.category === 'STANDARD').map(check => (
                      <CheckItemRow 
                        key={check.id} 
                        check={check} 
                        onUpdate={updateCheck}
                        compact
                      />
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

          {/* ÉTAPE 3: Validation */}
          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="border-0 shadow-lg">
                <CardContent className="p-6 space-y-6">
                  <h2 className="text-xl font-semibold flex items-center gap-2">
                    <Pen className="h-5 w-5 text-blue-600" />
                    Validation
                  </h2>

                  {/* Récap visuel */}
                  <div className="bg-slate-50 p-4 rounded-xl">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-sm text-slate-500">État du véhicule</p>
                        <p className="text-2xl font-bold">{config.label}</p>
                      </div>
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold ${config.color}`}>
                        {score}%
                      </div>
                    </div>
                    
                    {checks.filter(c => c.status !== 'OK').length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-slate-700">Points à vérifier:</p>
                        {checks.filter(c => c.status !== 'OK').map(c => (
                          <div key={c.id} className={`text-sm p-2 rounded ${c.status === 'CRITICAL' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
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

                  <div className="space-y-2">
                    <Label>Observations</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Remarques éventuelles..."
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-3">
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
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Valider le contrôle
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
      check.status === 'CRITICAL' ? 'bg-red-50 border-red-200' :
      check.status === 'WARNING' ? 'bg-amber-50 border-amber-200' :
      'bg-white border-slate-200'
    }`}>
      <div className="flex items-center gap-3">
        {check.status === 'OK' && <CircleCheck className="h-5 w-5 text-green-600" />}
        {check.status === 'WARNING' && <CircleAlert className="h-5 w-5 text-amber-600" />}
        {check.status === 'CRITICAL' && <CircleX className="h-5 w-5 text-red-600" />}
        <span className="font-medium text-slate-900">{check.label}</span>
      </div>
      <div className="flex gap-1">
        <button
          onClick={() => onUpdate(check.id, 'OK')}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            check.status === 'OK' 
              ? 'bg-green-600 text-white' 
              : 'bg-slate-100 text-slate-600 hover:bg-green-100'
          }`}
        >
          OK
        </button>
        <button
          onClick={() => onUpdate(check.id, 'WARNING')}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            check.status === 'WARNING' 
              ? 'bg-amber-600 text-white' 
              : 'bg-slate-100 text-slate-600 hover:bg-amber-100'
          }`}
        >
          À surveiller
        </button>
        <button
          onClick={() => onUpdate(check.id, 'CRITICAL')}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
            check.status === 'CRITICAL' 
              ? 'bg-red-600 text-white' 
              : 'bg-slate-100 text-slate-600 hover:bg-red-100'
          }`}
        >
          Critique
        </button>
      </div>
    </div>
  );
}
