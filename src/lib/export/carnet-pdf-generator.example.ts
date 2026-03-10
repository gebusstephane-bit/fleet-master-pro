/**
 * Exemple d'utilisation du générateur PDF "Elite Transport 2026"
 * 
 * Ce fichier montre comment utiliser le nouveau générateur de carnet d'entretien
 * avec le design Dashboard Premium.
 */

import { generateCarnetPDF, VehicleCarnetData } from './carnet-pdf-generator';
import * as fs from 'fs';

// Exemple de données pour tester
const exampleData: VehicleCarnetData = {
  vehicle: {
    id: 'veh-123',
    registration_number: 'AB-123-CD',
    brand: 'Renault',
    model: 'Master',
    year: 2022,
    type: 'VAN',
    fuel_type: 'diesel',
    vin: 'VF1AAAAA555123456',
    mileage: 45230,
    status: 'ACTIVE',
    // Conformité: dates > 30 jours = OK vert
    insurance_expiry: '2026-12-15',
    technical_control_expiry: '2026-08-20',
    tachy_control_expiry: '2026-09-10',
    atp_expiry: '2026-11-05',
  },
  company: {
    name: 'Elite Transport SAS',
    siret: '12345678900012',
    address: '15 Avenue des Champs-Élysées',
    city: 'Paris',
    postal_code: '75008',
    email: 'contact@elitetransport.fr',
  },
  maintenances: [
    {
      id: 'm1',
      type: 'PREVENTIVE',
      description: 'Vidange complète + filtres',
      service_date: '2025-11-15',
      garage_name: 'Garage du Centre',
      final_cost: 320.50,
    },
    {
      id: 'm2',
      type: 'CORRECTIVE',
      description: 'Remplacement plaquettes de frein avant',
      service_date: '2025-10-22',
      garage_name: 'Auto Repair 92',
      final_cost: 580.00,
    },
    {
      id: 'm3',
      type: 'PNEUMATIQUE',
      description: 'Remplacement 2 pneus arrière',
      service_date: '2025-09-08',
      garage_name: 'Pneu Service',
      final_cost: 420.00,
    },
    {
      id: 'm4',
      type: 'INSPECTION',
      description: 'Contrôle visuel niveaux et sécurité',
      service_date: '2025-08-15',
      garage_name: 'Elite Transport (interne)',
      final_cost: 0,
    },
  ],
  inspections: [],
  fuelRecords: [
    {
      fuel_type: 'diesel',
      quantity_liters: 65.5,
      price_total: 110.35,
      date: '2025-12-01',
    },
    {
      fuel_type: 'adblue',
      quantity_liters: 15.0,
      price_total: 24.50,
      date: '2025-11-28',
    },
    {
      fuel_type: 'diesel',
      quantity_liters: 58.2,
      price_total: 98.15,
      date: '2025-11-15',
    },
  ],
};

// Fonction de test
async function generateExample() {
  try {
    console.log('🚀 Génération du carnet d\'entretien Elite Transport 2026...');
    
    const pdfBuffer = await generateCarnetPDF(exampleData);
    
    // Sauvegarde le PDF pour test
    fs.writeFileSync('carnet-elite-example.pdf', pdfBuffer);
    
    console.log('✅ PDF généré avec succès: carnet-elite-example.pdf');
    console.log(`📄 Taille: ${(pdfBuffer.byteLength / 1024).toFixed(2)} KB`);
  } catch (error) {
    console.error('❌ Erreur lors de la génération:', error);
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  generateExample();
}

export { generateExample, exampleData };
