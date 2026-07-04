/**
 * Chiffrement réversible de secrets courts stockés en base (AES-256-GCM).
 *
 * Cas d'usage : le mot de passe d'inscription est stocké temporairement dans
 * `pending_registrations` puis relu pour créer le compte Supabase Auth
 * (createUser attend le mot de passe EN CLAIR). On ne peut donc pas le hasher
 * (irréversible) — on le CHIFFRE au repos et on le déchiffre au moment de créer
 * le compte. Corrige le stockage en clair (RGPD Art. 32).
 *
 * Runtime : Node.js uniquement (utilise le module `crypto`).
 *
 * Rétrocompatibilité : les valeurs existantes en clair (sans préfixe) sont
 * renvoyées telles quelles par decryptSecret → aucune inscription en cours ne
 * casse au déploiement.
 *
 * Clé : dérivée d'un secret serveur déjà présent (SUPABASE_SERVICE_ROLE_KEY) si
 * REGISTRATION_ENCRYPTION_KEY n'est pas défini → pas de nouvelle variable d'env
 * obligatoire. Définir REGISTRATION_ENCRYPTION_KEY permet la rotation.
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGO = 'aes-256-gcm';
const PREFIX = 'enc:v1:'; // marqueur de format chiffré (distingue le legacy plaintext)

let cachedKey: Buffer | null = null;

function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const secret =
    process.env.REGISTRATION_ENCRYPTION_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    '';
  // Clé 32 octets stable dérivée du secret serveur
  cachedKey = scryptSync(secret, 'fmp-reg-secret-box', 32);
  return cachedKey;
}

/**
 * Chiffre un secret. Retourne `enc:v1:<iv>:<tag>:<ciphertext>` (base64).
 * Une chaîne vide est renvoyée telle quelle.
 */
export function encryptSecret(plain: string): string {
  if (!plain) return plain;
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${ct.toString('base64')}`;
}

/**
 * Déchiffre une valeur produite par encryptSecret.
 * Rétrocompatible : une valeur sans le préfixe `enc:v1:` (legacy en clair) est
 * renvoyée telle quelle. En cas d'échec de déchiffrement, renvoie la valeur
 * brute (ne bloque jamais la création de compte).
 */
export function decryptSecret(stored: string): string {
  if (!stored || !stored.startsWith(PREFIX)) return stored; // legacy plaintext
  try {
    const [ivB64, tagB64, ctB64] = stored.slice(PREFIX.length).split(':');
    const key = getKey();
    const decipher = createDecipheriv(ALGO, key, Buffer.from(ivB64, 'base64'));
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    const pt = Buffer.concat([
      decipher.update(Buffer.from(ctB64, 'base64')),
      decipher.final(),
    ]);
    return pt.toString('utf8');
  } catch {
    return stored;
  }
}
