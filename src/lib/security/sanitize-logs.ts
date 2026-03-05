/**
 * Utilitaire de sanitization des logs pour ISO 27001
 * Masque les données sensibles avant logging
 */

// Regex pour matcher les emails
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

// Regex pour matcher les JWT tokens (3 parties base64 séparées par des points)
const JWT_REGEX = /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g;

// Regex pour matcher les UUIDs
const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

// Regex pour matcher les clés API sensibles
const API_KEY_REGEX = /(sk-|pk-)[a-zA-Z0-9]{20,}/g;

// Regex pour matcher les mots de passe dans les objets
const PASSWORD_REGEX = /"password"\s*:\s*"[^"]*"/gi;

/**
 * Masque un email (a***@domain.com)
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email;
  
  const [localPart, domain] = email.split('@');
  if (localPart.length <= 1) return `*@${domain}`;
  
  const maskedLocal = localPart[0] + '*'.repeat(localPart.length - 1);
  return `${maskedLocal}@${domain}`;
}

/**
 * Tronque un UUID (garde les 8 premiers caractères)
 */
export function truncateUuid(uuid: string): string {
  if (!uuid || uuid.length < 8) return uuid;
  return `${uuid.substring(0, 8)}...`;
}

/**
 * Masque un JWT token
 */
export function maskJwt(token: string): string {
  if (!token || token.length < 20) return token;
  return '[JWT_TOKEN_REDACTED]';
}

/**
 * Masque une clé API
 */
export function maskApiKey(key: string): string {
  if (!key || key.length < 10) return key;
  const prefix = key.substring(0, 4);
  return `${prefix}...[API_KEY_REDACTED]`;
}

/**
 * Sanitize une chaîne de caractères
 */
export function sanitizeString(value: string): string {
  if (!value || typeof value !== 'string') return value;
  
  return value
    .replace(JWT_REGEX, '[JWT_REDACTED]')
    .replace(API_KEY_REGEX, (match) => maskApiKey(match))
    .replace(EMAIL_REGEX, (match) => maskEmail(match))
    .replace(UUID_REGEX, (match) => truncateUuid(match));
}

/**
 * Sanitize un objet récursivement
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    // Clés sensibles à ne jamais logger
    const sensitiveKeys = [
      'password', 'token', 'secret', 'api_key', 'apikey', 
      'authorization', 'auth', 'cookie', 'session',
      'private_key', 'privatekey', 'credential', 'credentials'
    ];
    
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized as T;
}

/**
 * Sanitize une erreur pour logging sécurisé
 */
export function sanitizeError(error: Error | unknown): {
  message: string;
  name?: string;
  code?: string;
  stack?: string;
} {
  if (!error) return { message: 'Unknown error' };
  
  if (error instanceof Error) {
    return {
      message: sanitizeString(error.message),
      name: error.name,
      code: (error as { code?: string }).code,
      stack: error.stack ? sanitizeString(error.stack) : undefined,
    };
  }
  
  if (typeof error === 'string') {
    return { message: sanitizeString(error) };
  }
  
  return { message: sanitizeString(String(error)) };
}

/**
 * Crée un contexte de log sécurisé
 */
export function createSecureLogContext(context: {
  userId?: string;
  email?: string;
  companyId?: string;
  ip?: string;
  requestId?: string;
  [key: string]: unknown;
}): Record<string, unknown> {
  const secure: Record<string, unknown> = {};
  
  if (context.userId) {
    secure.userId = truncateUuid(context.userId);
  }
  
  if (context.email) {
    secure.email = maskEmail(context.email);
  }
  
  if (context.companyId) {
    secure.companyId = truncateUuid(context.companyId);
  }
  
  if (context.ip) {
    // Masquer partiellement l'IP (garder les 2 premiers octets pour IPv4)
    secure.ip = context.ip.replace(/(\d+\.\d+)\.\d+\.\d+$/, '$1.***.***');
  }
  
  if (context.requestId) {
    secure.requestId = context.requestId;
  }
  
  // Ajouter les autres champs en les sanitizant
  for (const [key, value] of Object.entries(context)) {
    if (!['userId', 'email', 'companyId', 'ip', 'requestId'].includes(key)) {
      if (typeof value === 'string') {
        secure[key] = sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        secure[key] = sanitizeObject(value as Record<string, unknown>);
      } else {
        secure[key] = value;
      }
    }
  }
  
  return secure;
}
