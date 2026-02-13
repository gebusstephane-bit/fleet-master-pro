#!/bin/bash
# ============================================
# Script pour créer l'utilisateur via l'API Supabase
# ============================================

# REMPLACE CES VALEURS :
SUPABASE_URL="https://xncpyxvklsfjrcxvdhtx.supabase.co"
SUPABASE_SERVICE_KEY="votre_service_role_key_ici"

# 1. Créer l'entreprise
echo "Création de l'entreprise..."
curl -X POST "${SUPABASE_URL}/rest/v1/companies" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "22222222-2222-2222-2222-222222222222",
    "name": "Transport Gebus",
    "siret": "12345678900012",
    "address": "123 Rue de la Logistics",
    "postal_code": "75001",
    "city": "Paris",
    "country": "France",
    "phone": "0123456789",
    "email": "contact@gebus-transport.fr",
    "subscription_plan": "pro",
    "subscription_status": "active",
    "max_vehicles": 20,
    "max_drivers": 30
  }'

# 2. Créer l'utilisateur dans auth
echo -e "\n\nCréation de l'utilisateur..."
USER_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/admin/users" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "gebus.stephane@gmail.com",
    "password": "Emilie57",
    "email_confirm": true,
    "user_metadata": {
      "first_name": "Stephane",
      "last_name": "Gebus"
    }
  }')

echo "Réponse: $USER_RESPONSE"

# Extraire l'ID de l'utilisateur créé
USER_ID=$(echo $USER_RESPONSE | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
echo -e "\nUUID utilisateur créé: $USER_ID"

# 3. Créer l'utilisateur dans la table users
echo -e "\nCréation du profil utilisateur..."
curl -X POST "${SUPABASE_URL}/rest/v1/users" \
  -H "apikey: ${SUPABASE_SERVICE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"id\": \"${USER_ID}\",
    \"email\": \"gebus.stephane@gmail.com\",
    \"first_name\": \"Stephane\",
    \"last_name\": \"Gebus\",
    \"role\": \"admin\",
    \"company_id\": \"22222222-2222-2222-2222-222222222222\"
  }"

echo -e "\n\n✅ Terminé !"
echo "Email: gebus.stephane@gmail.com"
echo "Mot de passe: Emilie57"
