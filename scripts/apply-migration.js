/**
 * Appliquer la migration purchase_date via l'API Supabase REST
 * Usage: node scripts/apply-migration.js
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xncpyxvklsfjrcxvdhtx.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY manquant');
  console.log('Veuillez définir la variable d\'environnement:');
  console.log('  $env:SUPABASE_SERVICE_ROLE_KEY="votre_clé" (PowerShell)');
  console.log('  export SUPABASE_SERVICE_ROLE_KEY="votre_clé" (Bash)');
  process.exit(1);
}

async function applyMigration() {
  console.log('🔄 Application de la migration purchase_date...\n');

  // Première requête : vérifier si la colonne existe
  const checkQuery = `
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'vehicles' AND column_name = 'purchase_date'
    ) as exists
  `;

  try {
    const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY
      },
      body: JSON.stringify({ sql: checkQuery })
    });

    if (!checkRes.ok) {
      console.log('⚠️  Fonction exec_sql non disponible, tentative via SQL direct...');
      
      // Essayer avec la fonction pg_execute
      const alterRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/pg_execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'apikey': SERVICE_KEY
        },
        body: JSON.stringify({ 
          command: 'ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS purchase_date DATE NULL;'
        })
      });

      if (alterRes.ok) {
        console.log('✅ Colonne purchase_date ajoutée avec succès!');
      } else {
        throw new Error(await alterRes.text());
      }
    } else {
      const checkData = await checkRes.json();
      
      if (checkData && checkData[0]?.exists) {
        console.log('✅ La colonne purchase_date existe déjà');
        return;
      }

      // Ajouter la colonne
      const alterRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'apikey': SERVICE_KEY
        },
        body: JSON.stringify({ 
          sql: 'ALTER TABLE vehicles ADD COLUMN purchase_date DATE NULL;'
        })
      });

      if (alterRes.ok) {
        console.log('✅ Colonne purchase_date ajoutée avec succès!');
      } else {
        throw new Error(await alterRes.text());
      }
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.log('\n📋 SQL à exécuter manuellement dans Supabase Dashboard:');
    console.log('─────────────────────────────────────────────────────');
    console.log('ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS purchase_date DATE NULL;');
    console.log("COMMENT ON COLUMN vehicles.purchase_date IS 'Date d\\'achat du véhicule';");
    console.log('─────────────────────────────────────────────────────');
    console.log('\n📝 Instructions:');
    console.log('1. Allez sur https://supabase.com/dashboard/project/xncpyxvklsfjrcxvdhtx');
    console.log('2. Cliquez sur "SQL Editor" dans le menu de gauche');
    console.log('3. Cliquez sur "New query"');
    console.log('4. Copiez-collez le SQL ci-dessus');
    console.log('5. Cliquez sur "Run"');
    process.exit(1);
  }
}

applyMigration();
