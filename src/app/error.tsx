"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * Error boundary pour les routes du dashboard.
 * Capture l'exception dans Sentry et affiche un fallback utilisateur.
 * Contrairement à global-error.tsx, ne remplace pas le layout — pas de <html>/<body>.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
          <svg
            className="h-8 w-8 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>

        <h2 className="mb-2 text-xl font-semibold text-foreground">
          Une erreur est survenue
        </h2>

        <p className="mb-6 text-sm text-muted-foreground">
          Notre équipe a été notifiée automatiquement.
          {error.digest && (
            <span className="mt-1 block font-mono text-xs text-muted-foreground/60">
              Réf : {error.digest}
            </span>
          )}
        </p>

        <button
          onClick={reset}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Réessayer
        </button>
      </div>
    </div>
  );
}
