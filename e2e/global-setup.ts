/**
 * Global Setup pour les tests E2E
 * 
 * Ce fichier est exécuté une seule fois avant tous les tests.
 * Il peut être utilisé pour:
 * - Vérifier que l'environnement de test est configuré
 * - Créer des données de test initiales
 * - Vérifier la connexion à la base de données
 */

import { FullConfig } from '@playwright/test';
import { validateTestEnvironment } from './fixtures/test-data';

async function globalSetup(config: FullConfig) {
  console.log('🎭 Global Setup - E2E Tests FleetMaster Pro');
  
  // Vérifier l'environnement
  const envCheck = validateTestEnvironment();
  if (!envCheck.valid) {
    console.warn('⚠️  Variables d\'environnement manquantes:', envCheck.missing);
    console.log('💡 Copiez .env.test.example vers .env.test et configurez les valeurs');
  } else {
    console.log('✅ Variables d\'environnement OK');
  }
  
  console.log('✅ Global setup terminé');
}

export default globalSetup;
