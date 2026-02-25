/**
 * Script pour appliquer la migration d'ajout de purchase_date
 * Exécuter : node scripts/apply-migration-purchase-date.js
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Erreur : Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    // Vérifier si la colonne existe déjà
    const { data: columnExists, error: checkError } = await supabase.rpc(
      'execute_sql',
      {
        sql_query: `
          SELECT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'vehicles' 
            AND column_name = 'purchase_date'
          ) as exists
        `
      }
    );

    if (checkError) {
      // Si la fonction RPC n'existe pas, utiliser une requête directe
      const { data, error } = await supabase.from('vehicles').select('purchase_date').limit(1);
      
      if (error && error.message.includes('purchase_date')) {
        console.log('Colonne purchase_date non trouvée, ajout en cours...');
        
        // Exécuter l'ALTER TABLE via une requête SQL brute
        const { error: alterError } = await supabase.rpc('exec_sql', {
          sql: `ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS purchase_date DATE NULL;`
        });
        
        if (alterError) {
          console.error('Erreur lors de l\'ajout de la colonne:', alterError);
          
          // Essayer une autre approche via REST API
          const response = await fetch(`${supabaseUrl}/rest/v1/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
              'apikey': supabaseServiceKey,
              'Prefer': 'tx=commit'
            },
            body: JSON.stringify({
              query: 'ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS purchase_date DATE NULL;'
            })
          });
          
          if (!response.ok) {
            console.error('Échec de l\'exécution SQL:', await response.text());
            process.exit(1);
          }
        } else {
          console.log('✅ Colonne purchase_date ajoutée avec succès!');
        }
      } else {
        console.log('✅ Colonne purchase_date existe déjà');
      }
    } else {
      console.log('✅ Vérification terminée');
    }
  } catch (error) {
    console.error('Erreur:', error);
    process.exit(1);
  }
}

applyMigration();
