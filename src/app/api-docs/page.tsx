'use client';

import dynamic from 'next/dynamic';
import 'swagger-ui-react/swagger-ui.css';

// swagger-ui-react uses browser-only APIs — load without SSR
const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="border-b bg-white px-6 py-4 shadow-sm">
        <div className="mx-auto max-w-6xl flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Fleet-Master — API Documentation</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Gérez votre flotte programmatiquement via l&apos;API publique v1
            </p>
          </div>
          <a
            href="/settings/webhooks"
            className="text-sm text-blue-600 hover:underline"
          >
            Gérer mes clés API →
          </a>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-6">
        <div className="mb-6 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
          <strong>Authentification :</strong> Incluez votre clé API dans le header{' '}
          <code className="rounded bg-blue-100 px-1 py-0.5 font-mono text-xs">x-api-key: sk_live_…</code>{' '}
          de chaque requête.{' '}
          <a href="/settings/webhooks" className="font-medium underline">
            Obtenir une clé API →
          </a>
        </div>
      </div>

      <SwaggerUI
        url="/api/docs"
        docExpansion="list"
        defaultModelsExpandDepth={1}
        displayRequestDuration
        tryItOutEnabled
      />
    </div>
  );
}
