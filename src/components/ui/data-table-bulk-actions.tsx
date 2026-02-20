'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Download, Trash2, X, UserCheck } from 'lucide-react';

interface DataTableBulkActionsProps {
  selectedCount: number;
  onExport?: () => void;
  onDelete?: () => void;
  onAssign?: () => void;
  onClear?: () => void;
  isDeleting?: boolean;
}

export function DataTableBulkActions({
  selectedCount,
  onExport,
  onDelete,
  onAssign,
  onClear,
  isDeleting = false,
}: DataTableBulkActionsProps) {
  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.97 }}
          transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/25 backdrop-blur-sm"
        >
          {/* Count */}
          <span className="text-sm font-medium text-cyan-400 min-w-max">
            {selectedCount} sélectionné{selectedCount > 1 ? 's' : ''}
          </span>

          <div className="h-4 w-px bg-cyan-500/25" />

          {/* Actions */}
          <div className="flex items-center gap-1">
            {onExport && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onExport}
                className="h-7 px-3 text-xs text-slate-300 hover:text-white hover:bg-white/10 gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Exporter
              </Button>
            )}
            {onAssign && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onAssign}
                className="h-7 px-3 text-xs text-slate-300 hover:text-white hover:bg-white/10 gap-1.5"
              >
                <UserCheck className="w-3.5 h-3.5" />
                Assigner
              </Button>
            )}
            {onDelete && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onDelete}
                disabled={isDeleting}
                className="h-7 px-3 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isDeleting ? 'Suppression…' : 'Supprimer'}
              </Button>
            )}
          </div>

          {/* Clear */}
          {onClear && (
            <>
              <div className="h-4 w-px bg-cyan-500/25 ml-auto" />
              <Button
                size="sm"
                variant="ghost"
                onClick={onClear}
                className="h-7 w-7 p-0 text-slate-400 hover:text-white hover:bg-white/10"
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
