/**
 * Bibliothèque de configurations d'essieux — FleetMaster Pro
 *
 * Définit les configurations réelles pour chaque type de véhicule
 * dans la flotte française (PL, VUL, remorques, semi-remorques).
 *
 * Sources : Wikipedia Tracteur routier & Essieu, BAS World configurations essieux,
 * 1001pneus dimensions PL, Code de la route France
 */

export interface AxlePosition {
  id: string;           // ex: "AV-G", "AR1-EXT-G", "R1-EXT-G"
  label: string;        // ex: "Avant Gauche", "Arrière 1 Ext. Gauche"
  axle: string;         // ex: "AV", "AR1", "AR2", "R1"
  side: 'G' | 'D';
  mount_type: 'simple' | 'jumele_ext' | 'jumele_int';
  is_steering: boolean; // essieu directeur
  is_drive: boolean;    // essieu moteur
  is_liftable: boolean; // essieu relevable
  svg_x: number;        // position SVG en % (0-100)
  svg_y: number;        // position SVG en % (0-100)
}

export interface AxleConfiguration {
  formula: string;            // "4x2_simple", "tracteur_6x4", etc.
  label: string;              // label lisible
  vehicle_types: string[];    // types de véhicules compatibles
  total_tire_count: number;   // nombre total de pneus physiques
  positions: AxlePosition[];
  notes: string;              // description technique
}

// ================================================================
// CONFIGURATIONS RÉELLES — VÉHICULES MOTEURS
// ================================================================

export const AXLE_CONFIGURATIONS: AxleConfiguration[] = [

  // ---- FOURGON / UTILITAIRE LÉGER < 3,5T ----
  {
    formula: '4x2_simple',
    label: 'Fourgon / Utilitaire (4 roues simples)',
    vehicle_types: ['Fourgon', 'Utilitaire', 'Camionnette', 'Fourgon tôlé'],
    total_tire_count: 4,
    notes: 'Essieu avant simple + essieu arrière simple. Ex: Master, Sprinter, Transit.',
    positions: [
      { id: 'AV-G',  label: 'Avant Gauche',   axle: 'AV',  side: 'G', mount_type: 'simple', is_steering: true,  is_drive: false, is_liftable: false, svg_x: 20, svg_y: 15 },
      { id: 'AV-D',  label: 'Avant Droit',    axle: 'AV',  side: 'D', mount_type: 'simple', is_steering: true,  is_drive: false, is_liftable: false, svg_x: 80, svg_y: 15 },
      { id: 'AR1-G', label: 'Arrière Gauche', axle: 'AR1', side: 'G', mount_type: 'simple', is_steering: false, is_drive: true,  is_liftable: false, svg_x: 20, svg_y: 85 },
      { id: 'AR1-D', label: 'Arrière Droit',  axle: 'AR1', side: 'D', mount_type: 'simple', is_steering: false, is_drive: true,  is_liftable: false, svg_x: 80, svg_y: 85 },
    ],
  },

  // ---- FOURGON / UTILITAIRE LOURD AVEC ROUES JUMELÉES ARRIÈRE ----
  {
    formula: '4x2_jumele_ar',
    label: 'Fourgon lourd arrière jumelé (6 pneus)',
    vehicle_types: ['Fourgon', 'Utilitaire', 'Fourgon frigorifique'],
    total_tire_count: 6,
    notes: '4,9T PTAC. Roues jumelées à l\'arrière (ex: Master 170ch, Sprinter 5T). Essieu avant simple (2 pneus) + essieu arrière jumelé (4 pneus).',
    positions: [
      { id: 'AV-G',       label: 'Avant Gauche',         axle: 'AV',  side: 'G', mount_type: 'simple',     is_steering: true,  is_drive: false, is_liftable: false, svg_x: 20, svg_y: 15 },
      { id: 'AV-D',       label: 'Avant Droit',          axle: 'AV',  side: 'D', mount_type: 'simple',     is_steering: true,  is_drive: false, is_liftable: false, svg_x: 80, svg_y: 15 },
      { id: 'AR1-EXT-G',  label: 'Arrière Ext. Gauche', axle: 'AR1', side: 'G', mount_type: 'jumele_ext', is_steering: false, is_drive: true,  is_liftable: false, svg_x: 15, svg_y: 85 },
      { id: 'AR1-INT-G',  label: 'Arrière Int. Gauche', axle: 'AR1', side: 'G', mount_type: 'jumele_int', is_steering: false, is_drive: true,  is_liftable: false, svg_x: 28, svg_y: 85 },
      { id: 'AR1-INT-D',  label: 'Arrière Int. Droit',  axle: 'AR1', side: 'D', mount_type: 'jumele_int', is_steering: false, is_drive: true,  is_liftable: false, svg_x: 72, svg_y: 85 },
      { id: 'AR1-EXT-D',  label: 'Arrière Ext. Droit',  axle: 'AR1', side: 'D', mount_type: 'jumele_ext', is_steering: false, is_drive: true,  is_liftable: false, svg_x: 85, svg_y: 85 },
    ],
  },

  // ---- PORTEUR 2 ESSIEUX 4x2 (ex: 7,5T - 12T) ----
  {
    formula: '4x2_porteur',
    label: 'Porteur 2 essieux — Arrière jumelé (6 pneus)',
    vehicle_types: ['Porteur', 'Camion porteur', 'Porteur frigorifique'],
    total_tire_count: 6,
    notes: 'Porteur léger 7,5T-12T. Avant simple (2 pneus de grande dimension) + arrière jumelé (4 pneus). Ex: Renault D, Mercedes Atego.',
    positions: [
      { id: 'AV-G',      label: 'Avant Gauche',     axle: 'AV',  side: 'G', mount_type: 'simple',     is_steering: true,  is_drive: false, is_liftable: false, svg_x: 20, svg_y: 15 },
      { id: 'AV-D',      label: 'Avant Droit',      axle: 'AV',  side: 'D', mount_type: 'simple',     is_steering: true,  is_drive: false, is_liftable: false, svg_x: 80, svg_y: 15 },
      { id: 'AR1-EXT-G', label: 'AR1 Ext. Gauche', axle: 'AR1', side: 'G', mount_type: 'jumele_ext', is_steering: false, is_drive: true,  is_liftable: false, svg_x: 15, svg_y: 85 },
      { id: 'AR1-INT-G', label: 'AR1 Int. Gauche', axle: 'AR1', side: 'G', mount_type: 'jumele_int', is_steering: false, is_drive: true,  is_liftable: false, svg_x: 28, svg_y: 85 },
      { id: 'AR1-INT-D', label: 'AR1 Int. Droit',  axle: 'AR1', side: 'D', mount_type: 'jumele_int', is_steering: false, is_drive: true,  is_liftable: false, svg_x: 72, svg_y: 85 },
      { id: 'AR1-EXT-D', label: 'AR1 Ext. Droit',  axle: 'AR1', side: 'D', mount_type: 'jumele_ext', is_steering: false, is_drive: true,  is_liftable: false, svg_x: 85, svg_y: 85 },
    ],
  },

  // ---- PORTEUR 3 ESSIEUX 6x2 (essieu arrière simple + essieu porteur simple) ----
  {
    formula: '6x2_simple_ar',
    label: 'Porteur 3 essieux 6x2 — Roues simples (6 pneus)',
    vehicle_types: ['Porteur', 'Camion porteur', 'Plateau', 'Porteur frigorifique'],
    total_tire_count: 6,
    notes: 'Monte simple sur TOUS les essieux arrière. Pneus larges type 385/65 R22.5 ou 455/45 R22.5. Économique en carburant, interdit pour usage lourd intense.',
    positions: [
      { id: 'AV-G',  label: 'Avant Gauche',       axle: 'AV',  side: 'G', mount_type: 'simple', is_steering: true,  is_drive: false, is_liftable: false, svg_x: 20, svg_y: 10 },
      { id: 'AV-D',  label: 'Avant Droit',        axle: 'AV',  side: 'D', mount_type: 'simple', is_steering: true,  is_drive: false, is_liftable: false, svg_x: 80, svg_y: 10 },
      { id: 'AR1-G', label: 'AR1 Moteur Gauche',  axle: 'AR1', side: 'G', mount_type: 'simple', is_steering: false, is_drive: true,  is_liftable: false, svg_x: 20, svg_y: 72 },
      { id: 'AR1-D', label: 'AR1 Moteur Droit',   axle: 'AR1', side: 'D', mount_type: 'simple', is_steering: false, is_drive: true,  is_liftable: false, svg_x: 80, svg_y: 72 },
      { id: 'AR2-G', label: 'AR2 Porteur Gauche', axle: 'AR2', side: 'G', mount_type: 'simple', is_steering: false, is_drive: false, is_liftable: true,  svg_x: 20, svg_y: 90 },
      { id: 'AR2-D', label: 'AR2 Porteur Droit',  axle: 'AR2', side: 'D', mount_type: 'simple', is_steering: false, is_drive: false, is_liftable: true,  svg_x: 80, svg_y: 90 },
    ],
  },

  // ---- PORTEUR 3 ESSIEUX 6x4 — Tandem jumelé (10 pneus) — LE PLUS COURANT ----
  {
    formula: '6x4_jumele',
    label: 'Porteur 3 essieux 6x4 — Tandem jumelé (10 pneus)',
    vehicle_types: ['Porteur', 'Camion porteur', 'Benne', 'Plateau', 'Porteur frigorifique'],
    total_tire_count: 10,
    notes: 'CONFIGURATION LA PLUS RÉPANDUE pour porteurs lourds 19-26T. Avant simple (2 pneus) + tandem arrière 2 essieux jumelés (8 pneus). Ex: Scania P 360 6x4, Volvo FM 6x4, MAN TGS 6x4.',
    positions: [
      { id: 'AV-G',      label: 'Avant Gauche',     axle: 'AV',  side: 'G', mount_type: 'simple',     is_steering: true,  is_drive: false, is_liftable: false, svg_x: 20, svg_y: 10 },
      { id: 'AV-D',      label: 'Avant Droit',      axle: 'AV',  side: 'D', mount_type: 'simple',     is_steering: true,  is_drive: false, is_liftable: false, svg_x: 80, svg_y: 10 },
      { id: 'AR1-EXT-G', label: 'AR1 Ext. Gauche', axle: 'AR1', side: 'G', mount_type: 'jumele_ext', is_steering: false, is_drive: true,  is_liftable: false, svg_x: 12, svg_y: 70 },
      { id: 'AR1-INT-G', label: 'AR1 Int. Gauche', axle: 'AR1', side: 'G', mount_type: 'jumele_int', is_steering: false, is_drive: true,  is_liftable: false, svg_x: 27, svg_y: 70 },
      { id: 'AR1-INT-D', label: 'AR1 Int. Droit',  axle: 'AR1', side: 'D', mount_type: 'jumele_int', is_steering: false, is_drive: true,  is_liftable: false, svg_x: 73, svg_y: 70 },
      { id: 'AR1-EXT-D', label: 'AR1 Ext. Droit',  axle: 'AR1', side: 'D', mount_type: 'jumele_ext', is_steering: false, is_drive: true,  is_liftable: false, svg_x: 88, svg_y: 70 },
      { id: 'AR2-EXT-G', label: 'AR2 Ext. Gauche', axle: 'AR2', side: 'G', mount_type: 'jumele_ext', is_steering: false, is_drive: true,  is_liftable: false, svg_x: 12, svg_y: 90 },
      { id: 'AR2-INT-G', label: 'AR2 Int. Gauche', axle: 'AR2', side: 'G', mount_type: 'jumele_int', is_steering: false, is_drive: true,  is_liftable: false, svg_x: 27, svg_y: 90 },
      { id: 'AR2-INT-D', label: 'AR2 Int. Droit',  axle: 'AR2', side: 'D', mount_type: 'jumele_int', is_steering: false, is_drive: true,  is_liftable: false, svg_x: 73, svg_y: 90 },
      { id: 'AR2-EXT-D', label: 'AR2 Ext. Droit',  axle: 'AR2', side: 'D', mount_type: 'jumele_ext', is_steering: false, is_drive: true,  is_liftable: false, svg_x: 88, svg_y: 90 },
    ],
  },

  // ---- PORTEUR 4 ESSIEUX 8x4 — Benne / toupie / grue (14 pneus) ----
  {
    formula: '8x4_jumele',
    label: 'Porteur 4 essieux 8x4 — Double avant + tandem jumelé (14 pneus)',
    vehicle_types: ['Porteur', 'Benne', 'Toupie', 'Grue auxiliaire', 'Porteur spécial'],
    total_tire_count: 14,
    notes: 'Porteur très lourd (32T PTAC). 2 essieux avant directeurs simples + tandem arrière 2 essieux jumelés. Ex: Scania 8x4 benne, Renault C 430 8x4.',
    positions: [
      { id: 'AV1-G',     label: 'AV1 Gauche',       axle: 'AV1', side: 'G', mount_type: 'simple',     is_steering: true,  is_drive: false, is_liftable: false, svg_x: 20, svg_y: 8  },
      { id: 'AV1-D',     label: 'AV1 Droit',        axle: 'AV1', side: 'D', mount_type: 'simple',     is_steering: true,  is_drive: false, is_liftable: false, svg_x: 80, svg_y: 8  },
      { id: 'AV2-G',     label: 'AV2 Gauche',       axle: 'AV2', side: 'G', mount_type: 'simple',     is_steering: true,  is_drive: false, is_liftable: false, svg_x: 20, svg_y: 25 },
      { id: 'AV2-D',     label: 'AV2 Droit',        axle: 'AV2', side: 'D', mount_type: 'simple',     is_steering: true,  is_drive: false, is_liftable: false, svg_x: 80, svg_y: 25 },
      { id: 'AR1-EXT-G', label: 'AR1 Ext. Gauche', axle: 'AR1', side: 'G', mount_type: 'jumele_ext', is_steering: false, is_drive: true,  is_liftable: false, svg_x: 12, svg_y: 68 },
      { id: 'AR1-INT-G', label: 'AR1 Int. Gauche', axle: 'AR1', side: 'G', mount_type: 'jumele_int', is_steering: false, is_drive: true,  is_liftable: false, svg_x: 27, svg_y: 68 },
      { id: 'AR1-INT-D', label: 'AR1 Int. Droit',  axle: 'AR1', side: 'D', mount_type: 'jumele_int', is_steering: false, is_drive: true,  is_liftable: false, svg_x: 73, svg_y: 68 },
      { id: 'AR1-EXT-D', label: 'AR1 Ext. Droit',  axle: 'AR1', side: 'D', mount_type: 'jumele_ext', is_steering: false, is_drive: true,  is_liftable: false, svg_x: 88, svg_y: 68 },
      { id: 'AR2-EXT-G', label: 'AR2 Ext. Gauche', axle: 'AR2', side: 'G', mount_type: 'jumele_ext', is_steering: false, is_drive: true,  is_liftable: false, svg_x: 12, svg_y: 88 },
      { id: 'AR2-INT-G', label: 'AR2 Int. Gauche', axle: 'AR2', side: 'G', mount_type: 'jumele_int', is_steering: false, is_drive: true,  is_liftable: false, svg_x: 27, svg_y: 88 },
      { id: 'AR2-INT-D', label: 'AR2 Int. Droit',  axle: 'AR2', side: 'D', mount_type: 'jumele_int', is_steering: false, is_drive: true,  is_liftable: false, svg_x: 73, svg_y: 88 },
      { id: 'AR2-EXT-D', label: 'AR2 Ext. Droit',  axle: 'AR2', side: 'D', mount_type: 'jumele_ext', is_steering: false, is_drive: true,  is_liftable: false, svg_x: 88, svg_y: 88 },
      { id: 'SECOURS-1', label: 'Roue de secours AV', axle: 'SEC', side: 'G', mount_type: 'simple',   is_steering: false, is_drive: false, is_liftable: false, svg_x: 5,  svg_y: 50 },
      { id: 'SECOURS-2', label: 'Roue de secours AR', axle: 'SEC', side: 'D', mount_type: 'simple',   is_steering: false, is_drive: false, is_liftable: false, svg_x: 95, svg_y: 50 },
    ],
  },

  // ---- TRACTEUR ROUTIER 4x2 (essieu arrière jumelé simple) — 6 pneus ----
  {
    formula: 'tracteur_4x2',
    label: 'Tracteur routier 4x2 — Arrière jumelé (6 pneus)',
    vehicle_types: ['Tracteur routier'],
    total_tire_count: 6,
    notes: 'Tracteur léger ou mono-essieu. Avant simple + arrière jumelé. Ex: Renault T 4x2, Volvo FH 4x2. Moins courant que 6x4.',
    positions: [
      { id: 'AV-G',      label: 'Avant Gauche',    axle: 'AV',  side: 'G', mount_type: 'simple',     is_steering: true,  is_drive: false, is_liftable: false, svg_x: 20, svg_y: 15 },
      { id: 'AV-D',      label: 'Avant Droit',     axle: 'AV',  side: 'D', mount_type: 'simple',     is_steering: true,  is_drive: false, is_liftable: false, svg_x: 80, svg_y: 15 },
      { id: 'AR1-EXT-G', label: 'AR Ext. Gauche', axle: 'AR1', side: 'G', mount_type: 'jumele_ext', is_steering: false, is_drive: true,  is_liftable: false, svg_x: 12, svg_y: 85 },
      { id: 'AR1-INT-G', label: 'AR Int. Gauche', axle: 'AR1', side: 'G', mount_type: 'jumele_int', is_steering: false, is_drive: true,  is_liftable: false, svg_x: 27, svg_y: 85 },
      { id: 'AR1-INT-D', label: 'AR Int. Droit',  axle: 'AR1', side: 'D', mount_type: 'jumele_int', is_steering: false, is_drive: true,  is_liftable: false, svg_x: 73, svg_y: 85 },
      { id: 'AR1-EXT-D', label: 'AR Ext. Droit',  axle: 'AR1', side: 'D', mount_type: 'jumele_ext', is_steering: false, is_drive: true,  is_liftable: false, svg_x: 88, svg_y: 85 },
    ],
  },

  // ---- TRACTEUR ROUTIER 6x4 — Tandem jumelé (10 pneus) — LE PLUS RÉPANDU ----
  {
    formula: 'tracteur_6x4',
    label: 'Tracteur routier 6x4 — Tandem jumelé (10 pneus)',
    vehicle_types: ['Tracteur routier'],
    total_tire_count: 10,
    notes: 'CONFIGURATION STANDARD tracteur SPL. Avant simple + tandem jumelé. Ex: Scania R 500 6x4, Volvo FH 500 6x4, Mercedes Actros 6x4. Pneus avant : 315/70 R22.5. Pneus tandem : 315/70 R22.5.',
    positions: [
      { id: 'AV-G',      label: 'Avant Gauche',     axle: 'AV',  side: 'G', mount_type: 'simple',     is_steering: true,  is_drive: false, is_liftable: false, svg_x: 20, svg_y: 10 },
      { id: 'AV-D',      label: 'Avant Droit',      axle: 'AV',  side: 'D', mount_type: 'simple',     is_steering: true,  is_drive: false, is_liftable: false, svg_x: 80, svg_y: 10 },
      { id: 'AR1-EXT-G', label: 'AR1 Ext. Gauche', axle: 'AR1', side: 'G', mount_type: 'jumele_ext', is_steering: false, is_drive: true,  is_liftable: false, svg_x: 12, svg_y: 70 },
      { id: 'AR1-INT-G', label: 'AR1 Int. Gauche', axle: 'AR1', side: 'G', mount_type: 'jumele_int', is_steering: false, is_drive: true,  is_liftable: false, svg_x: 27, svg_y: 70 },
      { id: 'AR1-INT-D', label: 'AR1 Int. Droit',  axle: 'AR1', side: 'D', mount_type: 'jumele_int', is_steering: false, is_drive: true,  is_liftable: false, svg_x: 73, svg_y: 70 },
      { id: 'AR1-EXT-D', label: 'AR1 Ext. Droit',  axle: 'AR1', side: 'D', mount_type: 'jumele_ext', is_steering: false, is_drive: true,  is_liftable: false, svg_x: 88, svg_y: 70 },
      { id: 'AR2-EXT-G', label: 'AR2 Ext. Gauche', axle: 'AR2', side: 'G', mount_type: 'jumele_ext', is_steering: false, is_drive: true,  is_liftable: false, svg_x: 12, svg_y: 90 },
      { id: 'AR2-INT-G', label: 'AR2 Int. Gauche', axle: 'AR2', side: 'G', mount_type: 'jumele_int', is_steering: false, is_drive: true,  is_liftable: false, svg_x: 27, svg_y: 90 },
      { id: 'AR2-INT-D', label: 'AR2 Int. Droit',  axle: 'AR2', side: 'D', mount_type: 'jumele_int', is_steering: false, is_drive: true,  is_liftable: false, svg_x: 73, svg_y: 90 },
      { id: 'AR2-EXT-D', label: 'AR2 Ext. Droit',  axle: 'AR2', side: 'D', mount_type: 'jumele_ext', is_steering: false, is_drive: true,  is_liftable: false, svg_x: 88, svg_y: 90 },
    ],
  },

  // ---- TRACTEUR ROUTIER 6x2 — Tandem mixte (8 pneus) ----
  {
    formula: 'tracteur_6x2',
    label: 'Tracteur routier 6x2 — Arrière jumelé + porteur simple (8 pneus)',
    vehicle_types: ['Tracteur routier'],
    total_tire_count: 8,
    notes: 'Tracteur économique longue distance. 1 essieu moteur jumelé + 1 essieu porteur à roue simple (souvent relevable). Ex: Scania R 500 6x2, DAF XG 6x2, Volvo FH 6x2.',
    positions: [
      { id: 'AV-G',      label: 'Avant Gauche',            axle: 'AV',  side: 'G', mount_type: 'simple',     is_steering: true,  is_drive: false, is_liftable: false, svg_x: 20, svg_y: 10 },
      { id: 'AV-D',      label: 'Avant Droit',             axle: 'AV',  side: 'D', mount_type: 'simple',     is_steering: true,  is_drive: false, is_liftable: false, svg_x: 80, svg_y: 10 },
      { id: 'AR1-EXT-G', label: 'AR1 Moteur Ext. G',      axle: 'AR1', side: 'G', mount_type: 'jumele_ext', is_steering: false, is_drive: true,  is_liftable: false, svg_x: 12, svg_y: 70 },
      { id: 'AR1-INT-G', label: 'AR1 Moteur Int. G',      axle: 'AR1', side: 'G', mount_type: 'jumele_int', is_steering: false, is_drive: true,  is_liftable: false, svg_x: 27, svg_y: 70 },
      { id: 'AR1-INT-D', label: 'AR1 Moteur Int. D',      axle: 'AR1', side: 'D', mount_type: 'jumele_int', is_steering: false, is_drive: true,  is_liftable: false, svg_x: 73, svg_y: 70 },
      { id: 'AR1-EXT-D', label: 'AR1 Moteur Ext. D',      axle: 'AR1', side: 'D', mount_type: 'jumele_ext', is_steering: false, is_drive: true,  is_liftable: false, svg_x: 88, svg_y: 70 },
      { id: 'AR2-G',     label: 'AR2 Porteur G (simple)',  axle: 'AR2', side: 'G', mount_type: 'simple',     is_steering: false, is_drive: false, is_liftable: true,  svg_x: 20, svg_y: 90 },
      { id: 'AR2-D',     label: 'AR2 Porteur D (simple)',  axle: 'AR2', side: 'D', mount_type: 'simple',     is_steering: false, is_drive: false, is_liftable: true,  svg_x: 80, svg_y: 90 },
    ],
  },

  // ================================================================
  // CONFIGURATIONS REMORQUES ET SEMI-REMORQUES
  // ================================================================

  // ---- SEMI-REMORQUE 2 ESSIEUX (tandem) — 8 pneus ----
  {
    formula: 'semi-2_jumele',
    label: 'Semi-remorque 2 essieux — Tandem jumelé (8 pneus)',
    vehicle_types: ['Semi-remorque', 'Semi-remorque frigorifique'],
    total_tire_count: 8,
    notes: 'Configuration classique semi-remorque légère ou tautliner standard. 2 essieux tandem, tous jumelés. Pneus courants : 385/65 R22.5 ou 315/80 R22.5.',
    positions: [
      { id: 'R1-EXT-G', label: 'R1 Ext. Gauche', axle: 'R1', side: 'G', mount_type: 'jumele_ext', is_steering: false, is_drive: false, is_liftable: false, svg_x: 12, svg_y: 55 },
      { id: 'R1-INT-G', label: 'R1 Int. Gauche', axle: 'R1', side: 'G', mount_type: 'jumele_int', is_steering: false, is_drive: false, is_liftable: false, svg_x: 27, svg_y: 55 },
      { id: 'R1-INT-D', label: 'R1 Int. Droit',  axle: 'R1', side: 'D', mount_type: 'jumele_int', is_steering: false, is_drive: false, is_liftable: false, svg_x: 73, svg_y: 55 },
      { id: 'R1-EXT-D', label: 'R1 Ext. Droit',  axle: 'R1', side: 'D', mount_type: 'jumele_ext', is_steering: false, is_drive: false, is_liftable: false, svg_x: 88, svg_y: 55 },
      { id: 'R2-EXT-G', label: 'R2 Ext. Gauche', axle: 'R2', side: 'G', mount_type: 'jumele_ext', is_steering: false, is_drive: false, is_liftable: false, svg_x: 12, svg_y: 80 },
      { id: 'R2-INT-G', label: 'R2 Int. Gauche', axle: 'R2', side: 'G', mount_type: 'jumele_int', is_steering: false, is_drive: false, is_liftable: false, svg_x: 27, svg_y: 80 },
      { id: 'R2-INT-D', label: 'R2 Int. Droit',  axle: 'R2', side: 'D', mount_type: 'jumele_int', is_steering: false, is_drive: false, is_liftable: false, svg_x: 73, svg_y: 80 },
      { id: 'R2-EXT-D', label: 'R2 Ext. Droit',  axle: 'R2', side: 'D', mount_type: 'jumele_ext', is_steering: false, is_drive: false, is_liftable: false, svg_x: 88, svg_y: 80 },
    ],
  },

  // ---- SEMI-REMORQUE 3 ESSIEUX (tridem) — 12 pneus — LE PLUS COURANT ----
  {
    formula: 'semi-3_jumele',
    label: 'Semi-remorque 3 essieux — Tridem jumelé (12 pneus)',
    vehicle_types: ['Semi-remorque', 'Semi-remorque frigorifique', 'Remorque'],
    total_tire_count: 12,
    notes: 'CONFIGURATION STANDARD SPL 44T. 3 essieux tridem, tous jumelés. Pneus : 385/65 R22.5 ou 315/80 R22.5. 1 essieu parfois relevable (R3). Tautliner, frigo, plateau, conteneur.',
    positions: [
      { id: 'R1-EXT-G', label: 'R1 Ext. Gauche', axle: 'R1', side: 'G', mount_type: 'jumele_ext', is_steering: false, is_drive: false, is_liftable: false, svg_x: 12, svg_y: 40 },
      { id: 'R1-INT-G', label: 'R1 Int. Gauche', axle: 'R1', side: 'G', mount_type: 'jumele_int', is_steering: false, is_drive: false, is_liftable: false, svg_x: 27, svg_y: 40 },
      { id: 'R1-INT-D', label: 'R1 Int. Droit',  axle: 'R1', side: 'D', mount_type: 'jumele_int', is_steering: false, is_drive: false, is_liftable: false, svg_x: 73, svg_y: 40 },
      { id: 'R1-EXT-D', label: 'R1 Ext. Droit',  axle: 'R1', side: 'D', mount_type: 'jumele_ext', is_steering: false, is_drive: false, is_liftable: false, svg_x: 88, svg_y: 40 },
      { id: 'R2-EXT-G', label: 'R2 Ext. Gauche', axle: 'R2', side: 'G', mount_type: 'jumele_ext', is_steering: false, is_drive: false, is_liftable: false, svg_x: 12, svg_y: 63 },
      { id: 'R2-INT-G', label: 'R2 Int. Gauche', axle: 'R2', side: 'G', mount_type: 'jumele_int', is_steering: false, is_drive: false, is_liftable: false, svg_x: 27, svg_y: 63 },
      { id: 'R2-INT-D', label: 'R2 Int. Droit',  axle: 'R2', side: 'D', mount_type: 'jumele_int', is_steering: false, is_drive: false, is_liftable: false, svg_x: 73, svg_y: 63 },
      { id: 'R2-EXT-D', label: 'R2 Ext. Droit',  axle: 'R2', side: 'D', mount_type: 'jumele_ext', is_steering: false, is_drive: false, is_liftable: false, svg_x: 88, svg_y: 63 },
      { id: 'R3-EXT-G', label: 'R3 Ext. Gauche', axle: 'R3', side: 'G', mount_type: 'jumele_ext', is_steering: false, is_drive: false, is_liftable: true,  svg_x: 12, svg_y: 86 },
      { id: 'R3-INT-G', label: 'R3 Int. Gauche', axle: 'R3', side: 'G', mount_type: 'jumele_int', is_steering: false, is_drive: false, is_liftable: true,  svg_x: 27, svg_y: 86 },
      { id: 'R3-INT-D', label: 'R3 Int. Droit',  axle: 'R3', side: 'D', mount_type: 'jumele_int', is_steering: false, is_drive: false, is_liftable: true,  svg_x: 73, svg_y: 86 },
      { id: 'R3-EXT-D', label: 'R3 Ext. Droit',  axle: 'R3', side: 'D', mount_type: 'jumele_ext', is_steering: false, is_drive: false, is_liftable: true,  svg_x: 88, svg_y: 86 },
    ],
  },

  // ---- SEMI-REMORQUE 3 ESSIEUX EN MONTE SIMPLE (tridem simple) — 6 pneus ----
  {
    formula: 'semi-3_simple',
    label: 'Semi-remorque 3 essieux — Tridem roues simples (6 pneus)',
    vehicle_types: ['Semi-remorque', 'Semi-remorque frigorifique'],
    total_tire_count: 6,
    notes: 'Tridem en monte simple (pneus larges). Pneus : 445/45 R22.5 ou 435/50 R19.5. Plus économique en carburant. Utilisé sur tautliners modernes.',
    positions: [
      { id: 'R1-G', label: 'R1 Gauche', axle: 'R1', side: 'G', mount_type: 'simple', is_steering: false, is_drive: false, is_liftable: false, svg_x: 20, svg_y: 40 },
      { id: 'R1-D', label: 'R1 Droit',  axle: 'R1', side: 'D', mount_type: 'simple', is_steering: false, is_drive: false, is_liftable: false, svg_x: 80, svg_y: 40 },
      { id: 'R2-G', label: 'R2 Gauche', axle: 'R2', side: 'G', mount_type: 'simple', is_steering: false, is_drive: false, is_liftable: false, svg_x: 20, svg_y: 63 },
      { id: 'R2-D', label: 'R2 Droit',  axle: 'R2', side: 'D', mount_type: 'simple', is_steering: false, is_drive: false, is_liftable: false, svg_x: 80, svg_y: 63 },
      { id: 'R3-G', label: 'R3 Gauche', axle: 'R3', side: 'G', mount_type: 'simple', is_steering: false, is_drive: false, is_liftable: true,  svg_x: 20, svg_y: 86 },
      { id: 'R3-D', label: 'R3 Droit',  axle: 'R3', side: 'D', mount_type: 'simple', is_steering: false, is_drive: false, is_liftable: true,  svg_x: 80, svg_y: 86 },
    ],
  },
];

// ================================================================
// HELPERS
// ================================================================

/** Retourne les configurations filtrées par type de véhicule */
export function getConfigurationsForVehicleType(vehicleType: string): AxleConfiguration[] {
  return AXLE_CONFIGURATIONS.filter(c => c.vehicle_types.includes(vehicleType));
}

/** Retourne une configuration par sa formule */
export function getConfigurationByFormula(formula: string): AxleConfiguration | undefined {
  return AXLE_CONFIGURATIONS.find(c => c.formula === formula);
}

// ================================================================
// DIMENSIONS STANDARDS PAR TYPE DE POSITION
// ================================================================
export const STANDARD_DIMENSIONS: Record<string, string[]> = {
  // Véhicule moteur — essieu avant directeur
  essieu_av_pl:       ['315/70 R22.5', '315/80 R22.5', '295/80 R22.5'],
  // Véhicule moteur — essieu arrière jumelé (moteur)
  essieu_ar_jumele:   ['315/70 R22.5', '315/80 R22.5', '295/80 R22.5'],
  // Véhicule moteur — essieu arrière simple large
  essieu_ar_simple:   ['385/65 R22.5', '455/45 R22.5', '445/65 R22.5'],
  // Remorque — essieu porteur jumelé
  remorque_jumele:    ['385/65 R22.5', '315/80 R22.5', '315/70 R22.5'],
  // Remorque — essieu porteur simple
  remorque_simple:    ['445/45 R22.5', '435/50 R19.5', '385/55 R22.5'],
  // Fourgon / VUL
  ful_avant:          ['215/75 R17.5', '205/75 R17.5'],
  ful_arriere_jumele: ['215/75 R17.5', '225/75 R16'],
};

// ================================================================
// SEUILS D'ALERTE PROFONDEUR DE GOMME (en mm)
// ================================================================
export const TREAD_DEPTH_THRESHOLDS = {
  legal_minimum: 1.6, // limite légale France/UE
  critical:      2.0, // alerte CRITIQUE — remplacement immédiat
  warning:       3.0, // alerte WARNING — planifier remplacement
  new_pl:       16.0, // profondeur moyenne pneu PL neuf
  new_vul:       8.0, // profondeur moyenne pneu VUL neuf
} as const;

/** Calcule le statut d'un pneu selon sa profondeur actuelle */
export function getTireStatus(treadDepth: number | null | undefined): 'ok' | 'warning' | 'critical' | 'unknown' {
  if (treadDepth == null) return 'unknown';
  if (treadDepth <= TREAD_DEPTH_THRESHOLDS.critical) return 'critical';
  if (treadDepth <= TREAD_DEPTH_THRESHOLDS.warning)  return 'warning';
  return 'ok';
}
