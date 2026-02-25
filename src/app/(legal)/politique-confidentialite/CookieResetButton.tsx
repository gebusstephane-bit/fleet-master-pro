'use client';

import { FileText } from 'lucide-react';

export function CookieResetButton() {
  return (
    <button
      onClick={() => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('cookie-consent');
          window.location.reload();
        }
      }}
      className="flex items-center gap-3 p-4 bg-[#0f172a]/50 rounded-lg border border-slate-700/50 hover:border-cyan-500/30 transition-all group text-left w-full"
    >
      <div className="p-2 bg-yellow-500/10 rounded-lg group-hover:bg-yellow-500/20 transition-colors">
        <FileText className="w-5 h-5 text-yellow-400" />
      </div>
      <div>
        <h3 className="font-medium text-white">Réinitialiser les cookies</h3>
        <p className="text-sm text-slate-400">Modifier mon consentement traceurs</p>
      </div>
    </button>
  );
}
