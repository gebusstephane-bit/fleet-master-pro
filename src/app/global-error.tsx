"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * Fallback global pour les erreurs React non catchées dans le root layout.
 * Doit exposer <html> + <body> car il remplace le root layout entier.
 * Sentry capture automatiquement l'exception.
 */
export default function GlobalError({
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
    <html lang="fr">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0a0f1a",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div
          style={{
            textAlign: "center",
            padding: "2rem",
            maxWidth: "480px",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #ef4444, #dc2626)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.5rem",
              fontSize: "28px",
            }}
          >
            ⚠
          </div>

          <h1
            style={{
              color: "#fafafa",
              fontSize: "1.5rem",
              fontWeight: 600,
              marginBottom: "0.75rem",
            }}
          >
            Une erreur inattendue est survenue
          </h1>

          <p
            style={{
              color: "#94a3b8",
              fontSize: "0.95rem",
              marginBottom: "2rem",
              lineHeight: 1.6,
            }}
          >
            Notre équipe a été notifiée automatiquement. Vous pouvez essayer de
            recharger la page.
          </p>

          {error.digest && (
            <p
              style={{
                color: "#475569",
                fontSize: "0.75rem",
                marginBottom: "1.5rem",
                fontFamily: "monospace",
              }}
            >
              Code erreur : {error.digest}
            </p>
          )}

          <button
            onClick={reset}
            style={{
              background: "linear-gradient(135deg, #06b6d4, #3b82f6)",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              padding: "0.75rem 1.5rem",
              fontSize: "0.95rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
