#!/bin/bash
#
# Générateur de secrets forts pour FleetMaster Pro
# Usage: ./scripts/generate-secrets.sh
#
# Ce script génère des secrets cryptographiquement sûrs (256 bits)
# et affiche les commandes Vercel CLI pour le déploiement.
#
# ⚠️  IMPORTANT: Exécutez ce script dans un environnement sécurisé
# et copiez les secrets dans un gestionnaire de mots de passe (1Password, Bitwarden...)
#

set -e

echo "=========================================="
echo "🔐 FleetMaster Pro - Générateur de Secrets"
echo "=========================================="
echo ""

# Vérifier que openssl est disponible
if ! command -v openssl &> /dev/null; then
    echo "❌ Erreur: openssl n'est pas installé"
    exit 1
fi

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour générer un secret
generate_secret() {
    local name=$1
    local length=${2:-32}
    local secret=$(openssl rand -hex $length)
    echo "$secret"
}

# Génération des secrets
echo -e "${BLUE}Génération des secrets cryptographiques...${NC}"
echo ""

CRON_SECRET=$(generate_secret "CRON_SECRET" 32)
SUPERADMIN_SETUP_SECRET=$(generate_secret "SUPERADMIN_SETUP_SECRET" 32)
JWT_SECRET=$(generate_secret "JWT_SECRET" 32)
ENCRYPTION_KEY=$(generate_secret "ENCRYPTION_KEY" 32)
API_KEY_SECRET=$(generate_secret "API_KEY_SECRET" 32)

# Affichage des secrets
echo -e "${GREEN}✅ Secrets générés avec succès${NC}"
echo ""
echo "=========================================="
echo "📋 SECRETS À CONFIGURER"
echo "=========================================="
echo ""
echo -e "${YELLOW}CRON_SECRET:${NC}"
echo "$CRON_SECRET"
echo ""
echo -e "${YELLOW}SUPERADMIN_SETUP_SECRET:${NC}"
echo "$SUPERADMIN_SETUP_SECRET"
echo ""
echo -e "${YELLOW}JWT_SECRET (si utilisé):${NC}"
echo "$JWT_SECRET"
echo ""
echo -e "${YELLOW}ENCRYPTION_KEY (si utilisé):${NC}"
echo "$ENCRYPTION_KEY"
echo ""
echo -e "${YELLOW}API_KEY_SECRET (si utilisé):${NC}"
echo "$API_KEY_SECRET"
echo ""

# Affichage des commandes Vercel
echo "=========================================="
echo "🚀 Commandes Vercel CLI pour déploiement"
echo "=========================================="
echo ""
echo -e "${BLUE}# Production${NC}"
echo "vercel env add CRON_SECRET production"
echo "# Collez: $CRON_SECRET"
echo ""
echo "vercel env add SUPERADMIN_SETUP_SECRET production"
echo "# Collez: $SUPERADMIN_SETUP_SECRET"
echo ""
echo -e "${BLUE}# Preview (staging)${NC}"
echo "vercel env add CRON_SECRET preview"
echo "# Collez: $CRON_SECRET"
echo ""
echo "vercel env add SUPERADMIN_SETUP_SECRET preview"
echo "# Collez: $SUPERADMIN_SETUP_SECRET"
echo ""
echo -e "${BLUE}# Development${NC}"
echo "vercel env add CRON_SECRET development"
echo "# Collez: $CRON_SECRET"
echo ""
echo "vercel env add SUPERADMIN_SETUP_SECRET development"
echo "# Collez: $SUPERADMIN_SETUP_SECRET"
echo ""

# Mise à jour du fichier .env.local
echo "=========================================="
echo "📝 Mise à jour du fichier .env.local"
echo "=========================================="
echo ""
echo "Copiez ces lignes dans votre fichier .env.local:"
echo ""
echo -e "${YELLOW}# Secrets générés le $(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo "CRON_SECRET=$CRON_SECRET"
echo "SUPERADMIN_SETUP_SECRET=$SUPERADMIN_SETUP_SECRET"
echo ""

# Vérification de la force des secrets existants
echo "=========================================="
echo "🔍 Vérification des secrets actuels"
echo "=========================================="
echo ""

if [ -f ".env.local" ]; then
    CURRENT_CRON=$(grep "^CRON_SECRET=" .env.local | cut -d'=' -f2 | tr -d '"' || echo "")
    CURRENT_SUPERADMIN=$(grep "^SUPERADMIN_SETUP_SECRET=" .env.local | cut -d'=' -f2 | tr -d '"' || echo "")
    
    if [ -n "$CURRENT_CRON" ]; then
        LEN=${#CURRENT_CRON}
        if [ $LEN -lt 20 ]; then
            echo -e "${RED}⚠️  CRON_SECRET actuel trop court ($LEN caractères)${NC}"
            echo "   Recommandé: 64 caractères (32 bytes hex)"
        else
            echo -e "${GREEN}✅ CRON_SECRET actuel semble correct ($LEN caractères)${NC}"
        fi
    fi
    
    if [ -n "$CURRENT_SUPERADMIN" ]; then
        LEN=${#CURRENT_SUPERADMIN}
        if [ $LEN -lt 20 ]; then
            echo -e "${RED}⚠️  SUPERADMIN_SETUP_SECRET actuel trop court ($LEN caractères)${NC}"
            echo "   Recommandé: 64 caractères (32 bytes hex)"
            echo ""
            echo -e "${RED}🚨 FAILLE DE SÉCURITÉ CRITIQUE${NC}"
            echo "Le secret SuperAdmin est trop faible et doit être changé IMMÉDIATEMENT."
        else
            echo -e "${GREEN}✅ SUPERADMIN_SETUP_SECRET actuel semble correct ($LEN caractères)${NC}"
        fi
    fi
else
    echo -e "${YELLOW}⚠️  Fichier .env.local non trouvé${NC}"
fi

echo ""
echo "=========================================="
echo "✅ Terminé"
echo "=========================================="
echo ""
echo -e "${RED}⚠️  IMPORTANT:${NC}"
echo "1. Copiez ces secrets dans un gestionnaire de mots de passe sécurisé"
echo "2. Ne partagez jamais ces secrets par email ou messagerie"
echo "3. Roulez les secrets immédiatement si vous suspectez une fuite"
echo "4. Stockez les secrets dans Vercel (pas dans le code source)"
echo ""
echo "Pour rouler les secrets en production:"
echo "  1. Générez de nouveaux secrets avec ce script"
echo "  2. Mettez à jour dans Vercel: vercel env add NOM_SECRET production"
echo "  3. Redéployez: vercel --prod"
echo ""
