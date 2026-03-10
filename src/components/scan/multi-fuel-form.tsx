/**
 * Formulaire Multi-Carburant (Session de Ravitaillement)
 * 
 * UX optimisée pour la saisie rapide sur le terrain:
 * - Maximum 3 carburants par session
 * - Recopie intelligente du kilométrage
 * - GNR sans kilométrage (groupe frigo)
 * - Prix optionnel
 * 
 * Basé sur les retours terrain des conducteurs:
 * 1. Prix optionnel (AS24 automate)
 * 2. GNR sans km (alimentation frigo)
 * 3. Multi-plein en une seule fois (Gasoil + AdBlue + GNR)
 */

'use client';

import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { logger } from '@/lib/logger';
import { 
  Fuel, 
  ArrowLeft, 
  CheckCircle2, 
  AlertTriangle,
  User,
  Building2,
  Plus,
  Ticket
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useFuelSession } from '@/hooks/useFuelSession';
import { fuelKeys } from '@/hooks/use-fuel';
import { FuelLine } from './fuel-line';
import { createFuelSession } from '@/actions/public-scan';
import { createFuelSessionDirect } from '@/actions/public-scan-direct';
import { FUEL_TYPE_FORM_CONFIG } from '@/types/fuel';
import Link from 'next/link';

interface MultiFuelFormProps {
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

export function MultiFuelForm({ vehicleId, accessToken, vehicleInfo }: MultiFuelFormProps) {
  const queryClient = useQueryClient();
  const [success, setSuccess] = useState(false);
  const [ticketNumber, setTicketNumber] = useState('');
  const [createdCount, setCreatedCount] = useState(0);

  const {
    lines,
    driverName,
    stationName,
    isSubmitting,
    error,
    addLine,
    removeLine,
    updateLine,
    setDriverName,
    setStationName,
    setIsSubmitting,
    setError,
    canAddLine,
    isValid,
    validationErrors,
    mileageErrors,
    currentVehicleMileage,
    toSessionData,
    reset,
  } = useFuelSession({ maxFuels: 3, currentVehicleMileage: vehicleInfo.mileage || 0 });

  const handleSubmit = async () => {
    if (!isValid) {
      setError(validationErrors[0] || 'Veuillez corriger les erreurs');
      return;
    }

    const sessionData = toSessionData();
    if (!sessionData) {
      setError('Données invalides');
      return;
    }

    // DEBUG: Log ce qui est envoyé
    logger.debug('[MULTI_FUEL] Session data:', JSON.stringify(sessionData, null, 2));
    logger.debug('[MULTI_FUEL] Fuels:', sessionData.fuels.map(f => ({ type: f.type, liters: f.liters })));

    setIsSubmitting(true);
    setError(null);

    try {
      // Essayer d'abord la fonction RPC
      let result = await createFuelSession({
        vehicleId,
        accessToken,
        fuels: sessionData.fuels,
        driverName: sessionData.driverName,
        stationName: sessionData.stationName,
      });

      logger.debug('[MULTI_FUEL] Résultat RPC:', result);

      // Si échec, essayer l'insertion directe (fallback)
      if (!result?.data?.success) {
        logger.debug('[MULTI_FUEL] Fallback sur insertion directe...');
        result = await createFuelSessionDirect({
          vehicleId,
          accessToken,
          fuels: sessionData.fuels,
          driverName: sessionData.driverName,
          stationName: sessionData.stationName,
        });
        logger.debug('[MULTI_FUEL] Résultat direct:', result);
      }

      if (result?.data?.success) {
        setTicketNumber(result.data.ticketNumber);
        setCreatedCount(result.data.count || 1);
        
        // Invalider le cache React Query pour que la page fuel se rafraîchisse
        queryClient.invalidateQueries({ queryKey: fuelKeys.lists() });
        queryClient.invalidateQueries({ queryKey: fuelKeys.stats() });
        queryClient.invalidateQueries({ queryKey: fuelKeys.byVehicle(vehicleId) });
        
        setSuccess(true);
      } else {
        setError('Erreur lors de l\'enregistrement - vérifiez la console');
      }
    } catch (err: any) {
      logger.error('[MULTI_FUEL] Erreur:', err);
      setError(err.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Écran de succès
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
              Ravitaillement enregistré !
            </h1>
            <p className="text-slate-400 mb-6">
              {createdCount > 1 
                ? `${createdCount} pleins ont été enregistrés avec succès`
                : 'Votre plein a été transmis avec succès'}
            </p>
            
            <Card className="bg-slate-800/50 border-slate-700 mb-6">
              <CardContent className="p-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Ticket className="h-4 w-4 text-cyan-400" />
                  <p className="text-sm text-slate-500">Numéro de ticket</p>
                </div>
                <p className="text-3xl font-mono font-bold text-cyan-400">#{ticketNumber}</p>
                
                {createdCount > 1 && (
                  <>
                    <Separator className="my-4 bg-slate-700" />
                    <p className="text-sm text-slate-500">
                      Carburants enregistrés
                    </p>
                    <p className="text-lg font-medium text-white mt-1">
                      {createdCount} types
                    </p>
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
              <Button 
                onClick={() => {
                  reset();
                  setSuccess(false);
                }} 
                variant="ghost" 
                className="w-full text-slate-500"
              >
                Nouveau ravitaillement
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
              <h1 className="text-xl font-bold text-white">Ravitaillement</h1>
              <p className="text-slate-400 text-sm">{vehicleInfo.registration_number}</p>
            </div>
          </div>
        </motion.div>

        {/* Erreurs */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Lignes de carburant */}
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {lines.map((line, index) => (
              <motion.div
                key={line.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
              >
                <FuelLine
                  line={line}
                  index={index}
                  canRemove={lines.length > 1}
                  mileageError={mileageErrors[line.id]}
                  currentVehicleMileage={currentVehicleMileage}
                  onUpdate={(updates) => updateLine(line.id, updates)}
                  onRemove={() => removeLine(line.id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Bouton Ajouter */}
          {canAddLine && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Button
                type="button"
                variant="outline"
                onClick={addLine}
                className="w-full h-12 border-dashed border-2 border-white/20 text-[#a1a1aa] hover:border-cyan-500/50 hover:text-cyan-400 hover:bg-cyan-500/10"
              >
                <Plus className="w-5 h-5 mr-2" />
                Ajouter un carburant ({lines.length}/3)
              </Button>
            </motion.div>
          )}
        </div>

        {/* Informations complémentaires */}
        <Card className="bg-slate-800/50 border-slate-700 mt-6">
          <CardContent className="p-4 space-y-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-cyan-400" />
              Informations complémentaires
            </h2>
            
            <div className="space-y-2">
              <Label className="text-[#a1a1aa]">Nom de la station (optionnel)</Label>
              <Input
                placeholder="Ex: Total, Shell, AS24..."
                value={stationName}
                onChange={(e) => setStationName(e.target.value)}
                className="bg-[#0f1117] border-white/[0.06] focus:border-cyan-500/50"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[#a1a1aa] flex items-center gap-1">
                <User className="w-4 h-4" />
                Nom et prénom <span className="text-red-400">*</span>
              </Label>
              <Input
                placeholder="Prénom Nom"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                className="bg-[#0f1117] border-white/[0.06] focus:border-cyan-500/50"
              />
            </div>
          </CardContent>
        </Card>

        {/* Récapitulatif */}
        <Card className="bg-slate-800/30 border-slate-700/50 mt-4">
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-slate-400 mb-3">Récapitulatif</h3>
            <div className="space-y-2 text-sm">
              {lines.map((line, idx) => {
                if (!line.liters) return null;
                const liters = parseFloat(line.liters);
                if (isNaN(liters) || liters <= 0) return null;
                
                return (
                  <div key={line.id} className="flex justify-between items-center">
                    <span className="text-slate-500">
                      {idx + 1}. {FUEL_TYPE_FORM_CONFIG.find(c => c.value === line.type)?.label}
                    </span>
                    <span className="text-white">
                      {liters} L
                      {line.price ? ` • ${line.price} €` : ''}
                    </span>
                  </div>
                );
              })}
              
              <Separator className="my-2 bg-slate-700/50" />
              
              <div className="flex justify-between">
                <span className="text-slate-500">Total carburants</span>
                <span className="text-white font-medium">
                  {lines.filter(l => l.liters && parseFloat(l.liters) > 0).length} type(s)
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bouton de validation */}
        <div className="mt-6">
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting || !isValid}
            className="w-full h-14 text-lg"
            size="lg"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Enregistrement...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5 mr-2" />
                Enregistrer tout ({lines.filter(l => l.liters && parseFloat(l.liters) > 0).length})
              </>
            )}
          </Button>
          
          {!isValid && validationErrors.length > 0 && (
            <p className="text-xs text-amber-400 text-center mt-2">
              {validationErrors[0]}
            </p>
          )}
        </div>

        {/* Footer sécurité */}
        <div className="mt-8 text-center">
          <p className="text-slate-600 text-xs">
            🔒 Données cryptées • Token: {accessToken.slice(0, 8)}...
          </p>
          <p className="text-slate-700 text-xs mt-1">
            Prix optionnel • GNR sans kilométrage
          </p>
        </div>
      </div>
    </div>
  );
}
