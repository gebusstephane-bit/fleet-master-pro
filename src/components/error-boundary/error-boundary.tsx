'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logger } from '@/lib/logger';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnPropsChange?: boolean;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary - Gestion des erreurs React
 * Capture les erreurs dans les composants enfants et affiche une UI de fallback
 * 
 * @example
 * ```tsx
 * <ErrorBoundary>
 *   <MonComposant />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Met à jour l'état pour afficher le fallback
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log l'erreur
    logger.error('ErrorBoundary caught an error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });

    this.setState({ errorInfo });

    // Appeler le callback onError si fourni
    this.props.onError?.(error, errorInfo);

    // Envoyer à Sentry si configuré
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      import('@sentry/nextjs').then((Sentry) => {
        Sentry.captureException(error, {
          extra: {
            componentStack: errorInfo.componentStack,
          },
        });
      });
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    // Reset l'erreur si les props changent (optionnel)
    if (
      this.props.resetOnPropsChange &&
      prevProps.children !== this.props.children &&
      this.state.hasError
    ) {
      this.resetError();
    }
  }

  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = (): void => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  handleGoHome = (): void => {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  };

  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback } = this.props;

    if (!hasError) {
      return children;
    }

    // Fallback personnalisé
    if (fallback) {
      return fallback;
    }

    // Fallback par défaut
    return (
      <div className="min-h-[400px] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg border border-red-100 p-8">
          <div className="flex flex-col items-center text-center">
            {/* Icône d'erreur */}
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
              <AlertCircle className="w-8 h-8 text-red-600" aria-hidden="true" />
            </div>

            {/* Titre */}
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Une erreur est survenue
            </h2>

            {/* Description */}
            <p className="text-gray-600 mb-6">
              Nous sommes désolés, mais quelque chose s&apos;est mal passé. 
              Vous pouvez essayer de recharger la page ou revenir à l&apos;accueil.
            </p>

            {/* Message d'erreur (en dev uniquement) */}
            {process.env.NODE_ENV === 'development' && error && (
              <div className="w-full bg-red-50 rounded-md p-4 mb-6 text-left">
                <p className="text-sm font-medium text-red-800 mb-1">
                  {error.message}
                </p>
                {errorInfo?.componentStack && (
                  <pre className="text-xs text-red-600 overflow-auto max-h-32 mt-2">
                    {errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <Button
                onClick={this.resetError}
                variant="default"
                className="flex-1"
              >
                <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
                Réessayer
              </Button>
              <Button
                onClick={this.handleGoHome}
                variant="outline"
                className="flex-1"
              >
                <Home className="w-4 h-4 mr-2" aria-hidden="true" />
                Accueil
              </Button>
            </div>

            {/* Lien support en production */}
            {process.env.NODE_ENV === 'production' && (
              <p className="mt-6 text-sm text-gray-500">
                Si le problème persiste, contactez notre{' '}
                <a
                  href="mailto:support@fleetmaster.com"
                  className="text-blue-600 hover:underline"
                >
                  support
                </a>
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }
}

/**
 * Hook pour créer un error boundary avec reset
 */
export function useErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const throwError = React.useCallback((err: Error) => {
    setError(err);
  }, []);

  if (error) {
    throw error;
  }

  return { resetError, throwError };
}

/**
 * HOC pour wrapper un composant avec ErrorBoundary
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
): React.ComponentType<P> {
  const WrappedComponent = (props: P): JSX.Element => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  const displayName = Component.displayName || Component.name || 'Component';
  WrappedComponent.displayName = `withErrorBoundary(${displayName})`;

  return WrappedComponent;
}
