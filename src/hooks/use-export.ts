"use client";

import { useState, useCallback } from 'react';
import { toast } from 'sonner';

export type ExportFormat = 'csv' | 'pdf';
export type ExportType = 'vehicles' | 'drivers' | 'maintenance';

interface UseExportOptions {
  type: ExportType;
  onSuccess?: (format: ExportFormat, count: number) => void;
}

export function useExport({ type, onSuccess }: UseExportOptions) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat | null>(null);

  const triggerExport = useCallback(
    async (format: ExportFormat) => {
      setIsExporting(true);
      setExportFormat(format);

      const toastId = toast.loading(
        `Génération du ${format.toUpperCase()} en cours...`
      );

      try {
        const response = await fetch(
          `/api/export/${format}?type=${type}`,
          { credentials: 'same-origin' }
        );

        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || `Erreur HTTP ${response.status}`);
        }

        const blob = await response.blob();
        const count = Number(response.headers.get('X-Export-Count') ?? 0);

        // Derive filename from Content-Disposition or build one
        const disposition = response.headers.get('Content-Disposition') ?? '';
        const match = disposition.match(/filename="?([^";\s]+)"?/);
        const filename = match?.[1] ?? `fleetmaster-${type}-${new Date().toISOString().slice(0, 10)}.${format}`;

        // Trigger browser download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Cleanup blob URL after short delay
        setTimeout(() => URL.revokeObjectURL(url), 30_000);

        toast.success(`${format.toUpperCase()} exporté avec succès (${count > 0 ? count + ' lignes' : ''})`, {
          id: toastId,
        });

        onSuccess?.(format, count);
      } catch (err: any) {
        toast.error(`Échec de l'export : ${err.message ?? 'Erreur inconnue'}`, {
          id: toastId,
        });
      } finally {
        setIsExporting(false);
        setExportFormat(null);
      }
    },
    [type, onSuccess]
  );

  return {
    isExporting,
    exportFormat,
    exportCSV: () => triggerExport('csv'),
    exportPDF: () => triggerExport('pdf'),
  };
}
