/**
 * Logger structuré pour FleetMaster Pro
 * Remplace les console.log sporadiques
 * 
 * En développement: logs détaillés dans la console
 * En production: envoi vers Sentry
 */

import * as Sentry from '@sentry/nextjs';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  userId?: string;
  companyId?: string | null;
  path?: string;
  action?: string;
  [key: string]: unknown;
}

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
  error?: Error;
}

class Logger {
  private isProduction: boolean;
  private isClient: boolean;

  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.isClient = typeof window !== 'undefined';
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      error,
    };

    // En production, envoyer vers Sentry
    if (this.isProduction && !this.isClient) {
      this.sendToSentry(level, message, context, error);
      return;
    }

    // En développement, logger dans la console avec style
    const styles = {
      debug: 'color: #6b7280',
      info: 'color: #3b82f6',
      warn: 'color: #f59e0b',
      error: 'color: #ef4444; font-weight: bold',
    };

    const prefix = `[${entry.timestamp.split('T')[1].split('.')[0]}] ${level.toUpperCase()}:`;
    
    if (error) {
      console.groupCollapsed(`%c${prefix} ${message}`, styles[level]);
      console.error(error);
      if (context) console.log('Context:', context);
      console.groupEnd();
    } else {
      console.log(`%c${prefix} ${message}`, styles[level]);
      if (context) console.log('Context:', context);
    }
  }

  /**
   * Envoie les logs vers Sentry en production
   */
  private sendToSentry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): void {
    // Configurer le scope avec le contexte
    Sentry.withScope((scope) => {
      // Ajouter le contexte utilisateur
      if (context?.userId) {
        scope.setUser({ id: context.userId });
      }
      
      // Ajouter les tags
      if (context?.action) {
        scope.setTag('action', context.action);
      }
      if (context?.companyId) {
        scope.setTag('companyId', context.companyId as string);
      }
      if (context?.path) {
        scope.setTag('path', context.path);
      }
      
      // Ajouter le contexte additionnel (sans données sensibles)
      const safeContext = this.sanitizeContext(context);
      scope.setContext('logContext', safeContext);
      scope.setTag('logLevel', level);

      // Envoyer selon le niveau et le type
      if (error) {
        // Si c'est une Error, utiliser captureException
        Sentry.captureException(error);
      } else if (level === 'error') {
        // Erreur sans objet Error
        Sentry.captureMessage(message, {
          level: 'error',
        });
      } else if (level === 'warn') {
        Sentry.captureMessage(message, {
          level: 'warning',
        });
      }
      // Les logs 'info' et 'debug' ne sont pas envoyés à Sentry pour éviter le bruit
    });
  }

  /**
   * Sanitize le contexte pour éviter d'envoyer des données sensibles à Sentry
   */
  private sanitizeContext(context?: LogContext): Record<string, unknown> {
    if (!context) return {};
    
    const sensitiveKeys = ['password', 'token', 'secret', 'email', 'phone', 'ip', 'authorization'];
    const sanitized: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(context)) {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, errorOrContext?: Error | LogContext, context?: LogContext): void {
    if (errorOrContext instanceof Error) {
      this.log('error', message, context, errorOrContext);
    } else {
      this.log('error', message, errorOrContext, undefined);
    }
  }

  // Logger spécifique pour les actions utilisateur
  userAction(action: string, context: LogContext): void {
    this.info(`User Action: ${action}`, context);
  }

  // Logger pour les performances
  performance(operation: string, durationMs: number, context?: LogContext): void {
    if (durationMs > 1000) {
      this.warn(`Slow operation: ${operation} took ${durationMs}ms`, { ...context, durationMs });
    } else {
      this.debug(`Performance: ${operation} took ${durationMs}ms`, { ...context, durationMs });
    }
  }
}

// Singleton
export const logger = new Logger();

// Helper pour les Server Actions
export function createActionLogger(actionName: string, userId?: string) {
  return {
    start: () => logger.info(`Action started: ${actionName}`, { userId, action: actionName }),
    success: (data?: unknown) => logger.info(`Action success: ${actionName}`, { userId, action: actionName, data }),
    error: (error: Error) => logger.error(`Action error: ${actionName}`, error, { userId, action: actionName }),
  };
}
