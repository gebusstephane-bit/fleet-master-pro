'use client';

/**
 * Hook pour gérer une session de ravitaillement multi-carburants
 * Optimisé pour la saisie rapide sur le terrain (mobile-first)
 */

import { useState, useCallback, useMemo } from 'react';
import { FuelInputLine, FuelType, FUEL_TYPE_FORM_CONFIG } from '@/types/fuel';

// Génère un ID unique local pour React keys
const generateLineId = () => `fuel-line-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Valeurs initiales d'une ligne vide
const createEmptyLine = (index: number): FuelInputLine => ({
  id: generateLineId(),
  type: index === 0 ? 'diesel' : index === 1 ? 'adblue' : 'gnr',
  liters: '',
  price: '',
  mileage: '',
});

export interface UseFuelSessionOptions {
  maxFuels?: number;
  initialMileage?: number;
  currentVehicleMileage?: number;
}

export interface UseFuelSessionReturn {
  // État
  lines: FuelInputLine[];
  driverName: string;
  stationName: string;
  isSubmitting: boolean;
  error: string | null;
  
  // Actions
  addLine: () => boolean;
  removeLine: (id: string) => void;
  updateLine: (id: string, updates: Partial<Omit<FuelInputLine, 'id'>>) => void;
  setDriverName: (name: string) => void;
  setStationName: (name: string) => void;
  setIsSubmitting: (value: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
  
  // Validations
  canAddLine: boolean;
  isValid: boolean;
  validationErrors: string[];
  mileageErrors: Record<string, string>;
  
  // Référence
  currentVehicleMileage: number;
  
  // Données formatées pour l'API
  toSessionData: () => {
    fuels: {
      type: FuelType;
      liters: number;
      price: number | null;
      mileage: number | null;
    }[];
    driverName: string;
    stationName: string;
  } | null;
}

export function useFuelSession(options: UseFuelSessionOptions = {}): UseFuelSessionReturn {
  const { maxFuels = 3, initialMileage, currentVehicleMileage = 0 } = options;
  
  // État local
  const [lines, setLines] = useState<FuelInputLine[]>(() => [
    createEmptyLine(0)
  ]);
  const [driverName, setDriverNameState] = useState('');
  const [stationName, setStationNameState] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setErrorState] = useState<string | null>(null);

  // Ajouter une nouvelle ligne
  const addLine = useCallback((): boolean => {
    if (lines.length >= maxFuels) {
      return false;
    }
    
    setLines(current => {
      const newIndex = current.length;
      const firstLineMileage = current[0]?.mileage || '';
      
      const newLine: FuelInputLine = {
        id: generateLineId(),
        type: newIndex === 1 ? 'adblue' : newIndex === 2 ? 'gnr' : 'diesel',
        liters: '',
        price: '',
        // Recopie intelligente: pré-remplir le km avec la valeur de la ligne 1
        mileage: firstLineMileage,
      };
      
      return [...current, newLine];
    });
    
    return true;
  }, [lines.length, maxFuels]);

  // Supprimer une ligne
  const removeLine = useCallback((id: string) => {
    setLines(current => {
      // Garder au moins une ligne
      if (current.length <= 1) {
        return current;
      }
      return current.filter(line => line.id !== id);
    });
  }, []);

  // Mettre à jour une ligne
  const updateLine = useCallback((id: string, updates: Partial<Omit<FuelInputLine, 'id'>>) => {
    setLines(current => 
      current.map(line => {
        if (line.id !== id) return line;
        
        const updated = { ...line, ...updates };
        
        // Logique GNR: si on change en GNR, vider le kilométrage
        if (updates.type === 'gnr') {
          updated.mileage = '';
        }
        
        return updated;
      })
    );
  }, []);

  // Reset complet
  const reset = useCallback(() => {
    setLines([createEmptyLine(0)]);
    setDriverNameState('');
    setStationNameState('');
    setErrorState(null);
    setIsSubmitting(false);
  }, []);

  // Vérifier si on peut ajouter une ligne
  const canAddLine = lines.length < maxFuels;

  // Validation du formulaire
  const { isValid, validationErrors, mileageErrors } = useMemo(() => {
    const errors: string[] = [];
    const mileageErrorsMap: Record<string, string> = {};
    
    // Au moins une ligne avec des litres
    const hasValidLine = lines.some(line => {
      const liters = parseFloat(line.liters);
      return !isNaN(liters) && liters > 0;
    });
    
    if (!hasValidLine) {
      errors.push('Au moins un carburant doit avoir une quantité valide');
    }
    
    // Vérifier chaque ligne
    lines.forEach((line, index) => {
      const liters = parseFloat(line.liters);
      const config = FUEL_TYPE_FORM_CONFIG.find(c => c.value === line.type);
      
      if (line.liters && (isNaN(liters) || liters <= 0)) {
        errors.push(`Ligne ${index + 1}: Quantité invalide`);
      }
      
      // Kilométrage requis sauf pour GNR
      if (config?.requiresMileage && line.liters) {
        const mileage = parseInt(line.mileage);
        if (!line.mileage || isNaN(mileage) || mileage <= 0) {
          errors.push(`Ligne ${index + 1}: Kilométrage requis pour ${config.label}`);
        } else if (currentVehicleMileage > 0 && mileage < currentVehicleMileage) {
          // VALIDATION: Le kilométrage saisi ne peut pas être inférieur au kilométrage actuel
          const errorMsg = `Kilométrage invalide: ${mileage.toLocaleString('fr-FR')} km est inférieur au kilométrage actuel du véhicule (${currentVehicleMileage.toLocaleString('fr-FR')} km)`;
          errors.push(`Ligne ${index + 1}: ${errorMsg}`);
          mileageErrorsMap[line.id] = errorMsg;
        }
      }
    });
    
    // Conducteur requis
    if (!driverName.trim()) {
      errors.push('Nom du conducteur requis');
    }
    
    return {
      isValid: errors.length === 0,
      validationErrors: errors,
      mileageErrors: mileageErrorsMap
    };
  }, [lines, driverName, currentVehicleMileage]);

  // Formater les données pour l'API
  const toSessionData = useCallback(() => {
    if (!isValid) return null;
    
    const validFuels = lines
      .filter(line => {
        const liters = parseFloat(line.liters);
        return !isNaN(liters) && liters > 0;
      })
      .map(line => {
        const config = FUEL_TYPE_FORM_CONFIG.find(c => c.value === line.type);
        const price = line.price ? parseFloat(line.price) : null;
        
        // GNR: pas de kilométrage
        const mileage = config?.requiresMileage && line.mileage 
          ? parseInt(line.mileage) 
          : null;
        
        return {
          type: line.type,
          liters: parseFloat(line.liters),
          price: price && price > 0 ? price : null,
          mileage,
        };
      });
    
    if (validFuels.length === 0) return null;
    
    return {
      fuels: validFuels,
      driverName: driverName.trim(),
      stationName: stationName.trim(),
    };
  }, [lines, driverName, stationName, isValid]);

  return {
    // État
    lines,
    driverName,
    stationName,
    isSubmitting,
    error,
    
    // Actions
    addLine,
    removeLine,
    updateLine,
    setDriverName: setDriverNameState,
    setStationName: setStationNameState,
    setIsSubmitting,
    setError: setErrorState,
    reset,
    
    // Validations
    canAddLine,
    isValid,
    validationErrors,
    mileageErrors,
    
    // Référence
    currentVehicleMileage,
    
    // Données formatées
    toSessionData,
  };
}
