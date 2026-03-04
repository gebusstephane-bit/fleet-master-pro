'use client';

import { Button } from '@/components/ui/button';
import { Download, FileText, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { FuelRecord, FuelFilters } from '@/types/fuel';
import { generateFuelCSV, downloadCSV, generateFuelPDF } from '@/lib/export-utils';
import { getReadableError } from '@/lib/error-messages';

interface FuelExportButtonsProps {
  records: FuelRecord[];
  selectedIds?: string[];
  filters?: FuelFilters;
}

export function FuelExportButtons({ records, selectedIds, filters }: FuelExportButtonsProps) {
  const [isExportingCSV, setIsExportingCSV] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  const handleExportCSV = async () => {
    setIsExportingCSV(true);
    try {
      const dataToExport = selectedIds?.length
        ? records.filter((r) => selectedIds.includes(r.id))
        : records;

      if (dataToExport.length === 0) {
        toast.error('Aucune donnée à exporter');
        return;
      }

      const csv = generateFuelCSV(dataToExport, filters);
      const filename = `fuel_export_${new Date().toISOString().split('T')[0]}_${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).replace(':', '')}`;
      downloadCSV(csv, filename);
      toast.success(`${dataToExport.length} enregistrement(s) exporté(s) en CSV`);
    } catch (error: any) {
      console.error('[Export CSV] Erreur:', error);
      toast.error(getReadableError(error));
    } finally {
      setIsExportingCSV(false);
    }
  };

  const handleExportPDF = async () => {
    setIsExportingPDF(true);
    try {
      const dataToExport = selectedIds?.length
        ? records.filter((r) => selectedIds.includes(r.id))
        : records;

      if (dataToExport.length === 0) {
        toast.error('Aucune donnée à exporter');
        return;
      }

      generateFuelPDF(dataToExport, {
        title: 'Rapport de Consommation',
        subtitle: `${dataToExport.length} plein(s) enregistré(s)`,
        filters,
      });
      toast.success('Rapport PDF généré');
    } catch (error: any) {
      console.error('[Export PDF] Erreur:', error);
      toast.error(getReadableError(error));
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleExportCSV}
        disabled={isExportingCSV || records.length === 0}
      >
        {isExportingCSV ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Download className="mr-2 h-4 w-4" />
        )}
        CSV
      </Button>
      <Button
        variant="default"
        size="sm"
        onClick={handleExportPDF}
        disabled={isExportingPDF || records.length === 0}
      >
        {isExportingPDF ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <FileText className="mr-2 h-4 w-4" />
        )}
        PDF
      </Button>
    </div>
  );
}
