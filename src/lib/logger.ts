/**
 * Logger structuré pour Fleet-Master
 * Conforme ISO 27001 - pas de données sensibles en clair
 */

import { sanitizeString, sanitizeObject, sanitizeError, createSecureLogContext } from './security/sanitize-logs';

const isDev = process.env.NODE_ENV === 'development';

// Type pour les logs structurés
interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error';
  timestamp: string;
  msg: string;
  [key: string]: unknown;
}

/**
 * Formatte une entrée de log en JSON structuré
 */
function formatLogEntry(level: LogEntry['level'], msg: string, meta?: Record<string, unknown>): string {
  const entry: LogEntry = {
    level,
    timestamp: new Date().toISOString(),
    msg,
    ...meta,
  };
  
  return JSON.stringify(entry);
}

/**
 * Logger structuré ISO 27001 compliant
 * 
 * Usage:
 * ```typescript
 * // Log simple
 * logger.info('User logged in', { userId: 'uuid', email: 'user@example.com' });
 * 
 * // Log d'erreur
 * logger.error('Database error', { error: err, code: 'DB_001' });
 * 
 * // Log sécurisé avec contexte
 * logger.secure.info(ctx, 'Action performed');
 * 
 * // Log compatible ancien format (string interpolation)
 * logger.info(`Message: ${value}`);
 * logger.warn('Message', error); // error sera sanitizé
 * logger.debug('File:', name, type, size); // multiple args supporté
 * ```
 */
export const logger = {
  /**
   * Debug - uniquement en développement
   */
  debug: (msg: string, ...args: unknown[]) => { 
    if (isDev) {
      // Construire un objet meta à partir des arguments multiples
      const meta: Record<string, unknown> = {};
      args.forEach((arg, index) => {
        if (typeof arg === 'object' && arg !== null) {
          Object.assign(meta, sanitizeObject(arg as Record<string, unknown>));
        } else {
          meta[`arg${index}`] = sanitizeString(String(arg));
        }
      });
      const safeMeta = Object.keys(meta).length > 0 ? meta : undefined;
      console.debug('[DEBUG]', formatLogEntry('debug', msg, safeMeta));
    }
  },
  
  /**
   * Info - logs informatifs
   */
  info: (msg: string, ...args: unknown[]) => { 
    const meta: Record<string, unknown> = {};
    args.forEach((arg, index) => {
      if (typeof arg === 'object' && arg !== null) {
        Object.assign(meta, sanitizeObject(arg as Record<string, unknown>));
      } else {
        meta[`arg${index}`] = sanitizeString(String(arg));
      }
    });
    const safeMeta = Object.keys(meta).length > 0 ? meta : undefined;
    console.info('[INFO]', formatLogEntry('info', msg, safeMeta));
  },
  
  /**
   * Warn - avertissements
   */
  warn: (msg: string, ...args: unknown[]) => { 
    const meta: Record<string, unknown> = {};
    args.forEach((arg, index) => {
      if (typeof arg === 'object' && arg !== null) {
        Object.assign(meta, sanitizeObject(arg as Record<string, unknown>));
      } else {
        meta[`arg${index}`] = sanitizeString(String(arg));
      }
    });
    const safeMeta = Object.keys(meta).length > 0 ? meta : undefined;
    console.warn('[WARN]', formatLogEntry('warn', msg, safeMeta));
  },
  
  /**
   * Error - erreurs (toujours loggées)
   */
  error: (msg: string, ...args: unknown[]) => { 
    const meta: Record<string, unknown> = {};
    args.forEach((arg, index) => {
      if (typeof arg === 'object' && arg !== null) {
        Object.assign(meta, sanitizeObject(arg as Record<string, unknown>));
      } else {
        meta[`arg${index}`] = sanitizeString(String(arg));
      }
    });
    const safeMeta = Object.keys(meta).length > 0 ? meta : undefined;
    console.error('[ERROR]', formatLogEntry('error', msg, safeMeta));
  },
  
  /**
   * Log d'erreur avec objet Error
   * Sanitize automatiquement le message et la stack
   */
  errorWithError: (msg: string, error: Error | unknown, meta?: Record<string, unknown>) => {
    const safeError = sanitizeError(error);
    const safeMeta = meta ? sanitizeObject(meta) : undefined;
    
    console.error('[ERROR]', formatLogEntry('error', msg, {
      error: safeError,
      ...safeMeta,
    }));
  },
  
  /**
   * Logger sécurisé avec contexte utilisateur
   * Masque automatiquement les données sensibles
   */
  secure: {
    /**
     * Crée un logger avec contexte utilisateur
     */
    withContext: (context: {
      userId?: string;
      email?: string;
      companyId?: string;
      ip?: string;
      requestId?: string;
      [key: string]: unknown;
    }) => {
      const secureContext = createSecureLogContext(context);
      
      const sanitizeArgs = (args: unknown[]): Record<string, unknown> => {
        const meta: Record<string, unknown> = {};
        args.forEach((arg, index) => {
          if (typeof arg === 'object' && arg !== null) {
            Object.assign(meta, sanitizeObject(arg as Record<string, unknown>));
          } else {
            meta[`arg${index}`] = sanitizeString(String(arg));
          }
        });
        return meta;
      };
      
      return {
        debug: (msg: string, ...args: unknown[]) => {
          if (isDev) {
            const safeMeta = sanitizeArgs(args);
            console.debug('[DEBUG]', formatLogEntry('debug', msg, { ...secureContext, ...safeMeta }));
          }
        },
        info: (msg: string, ...args: unknown[]) => {
          const safeMeta = sanitizeArgs(args);
          console.info('[INFO]', formatLogEntry('info', msg, { ...secureContext, ...safeMeta }));
        },
        warn: (msg: string, ...args: unknown[]) => {
          const safeMeta = sanitizeArgs(args);
          console.warn('[WARN]', formatLogEntry('warn', msg, { ...secureContext, ...safeMeta }));
        },
        error: (msg: string, ...args: unknown[]) => {
          const safeMeta = sanitizeArgs(args);
          console.error('[ERROR]', formatLogEntry('error', msg, { ...secureContext, ...safeMeta }));
        },
        errorWithError: (msg: string, error: Error | unknown, meta?: Record<string, unknown>) => {
          const safeError = sanitizeError(error);
          const safeMeta = meta ? sanitizeObject(meta) : undefined;
          console.error('[ERROR]', formatLogEntry('error', msg, {
            error: safeError,
            ...secureContext,
            ...safeMeta,
          }));
        },
      };
    },
  },
};

// Export des utilitaires de sanitization pour usage direct
export { sanitizeString, sanitizeObject, sanitizeError, createSecureLogContext };
