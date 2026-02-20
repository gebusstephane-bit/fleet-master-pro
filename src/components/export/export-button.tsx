"use client";

import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useExport, ExportType } from '@/hooks/use-export';
import { cn } from '@/lib/utils';

interface ExportButtonProps {
  type: ExportType;
  /** Optional: disable the button (e.g. while data is loading) */
  disabled?: boolean;
  /** Optional: hint at the total rows count for the tooltip */
  count?: number;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function ExportButton({
  type,
  disabled = false,
  count,
  className,
  variant = 'outline',
  size = 'sm',
}: ExportButtonProps) {
  const { isExporting, exportFormat, exportCSV, exportPDF } = useExport({ type });

  const label = isExporting
    ? exportFormat === 'csv'
      ? 'Export CSV…'
      : 'Export PDF…'
    : 'Exporter';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={disabled || isExporting}
          className={cn(
            'gap-2 border-white/[0.08] text-[#a1a1aa] hover:bg-[#27272a] hover:text-white',
            isExporting && 'opacity-70',
            className
          )}
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {label}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="bg-[#18181b] border-white/[0.08] min-w-[200px]"
      >
        <DropdownMenuLabel className="text-[#71717a] text-xs">
          {count !== undefined ? `${count} enregistrement(s)` : 'Exporter les données'}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/[0.08]" />

        {/* CSV */}
        <DropdownMenuItem
          onClick={exportCSV}
          disabled={isExporting}
          className="text-[#a1a1aa] focus:text-white focus:bg-[#27272a] gap-2 cursor-pointer"
        >
          <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
          <div>
            <p className="font-medium">Format CSV</p>
            <p className="text-xs text-[#71717a]">Compatible Excel — séparateur ;</p>
          </div>
        </DropdownMenuItem>

        {/* PDF */}
        <DropdownMenuItem
          onClick={exportPDF}
          disabled={isExporting}
          className="text-[#a1a1aa] focus:text-white focus:bg-[#27272a] gap-2 cursor-pointer"
        >
          <FileText className="h-4 w-4 text-blue-400" />
          <div>
            <p className="font-medium">Format PDF</p>
            <p className="text-xs text-[#71717a]">Rapport mis en page</p>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
