/**
 * Script pour créer un compte de test
 * Bypass les rate limits Supabase Auth
 * 
 * Usage: node scripts/create-test-user.js
 */

const TEST_USER = {
  email: 'demo@fleetmaster.pro',
  password: 'Demo123456!',
  firstName: 'Demo',
  lastName: 'User',
  companyName: 'FleetMaster Demo'
};

async function createTestUser() {
  try {
    const response = await fetch('http://localhost:3000/api/admin/create-test-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(TEST_USER),
    });

    const data = await response.json();

    if (data.success) {
      console.log('✅ Compte créé avec succès !');
      console.log('');
      console.log('📧 Email:', data.credentials.email);
      console.log('🔑 Mot de passe:', data.credentials.password);
      console.log('');
      console.log('🔗 Connectez-vous sur: http://localhost:3000/login');
    } else {
      console.error('❌ Erreur:', data.error);
    }
  } catch (error) {
    console.error('❌ Erreur:', error.message);
    console.log('');
    console.log('💡 Assurez-vous que le serveur est démarré (npm run dev)');
  }
}

console.log('🚀 Création d\'un compte de test...');
console.log('');
createTestUser();
