'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FileText, ImageIcon, Eye, Trash2,
  AlertTriangle, Clock, CheckCircle2, Loader2, FolderOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getSupabaseClient } from '@/lib/supabase/client';
import { getDriverDocuments, deleteDriverDocument } from '@/actions/driver-documents';
import {
  DOCUMENT_TYPE_LABELS,
  SIDE_LABELS,
  type DocumentType,
  type DocumentSide,
} from '@/lib/driver-documents-config';
import { differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DriverDocument {
  id: string;
  driver_id: string;
  document_type: DocumentType;
  side: DocumentSide | null;
  document_name: string;
  storage_path: string;
  file_size: number | null;
  mime_type: string | null;
  expiry_date: string | null;
  notes: string | null;
  created_at: string;
}

interface Props {
  driverId: string;
  refreshKey?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function ExpiryBadge({ expiryDate }: { expiryDate: string | null }) {
  if (!expiryDate) return null;
  const days = differenceInDays(new Date(expiryDate), new Date());
  const expired = days < 0;
  const warning = days <= 30;
  const soon    = days <= 60;

  return (
    <span className={cn(
      'inline-flex items-center gap-1 text-xs font-medium',
      expired ? 'text-red-400' : warning ? 'text-red-400' : soon ? 'text-amber-400' : 'text-emerald-400',
    )}>
      {expired
        ? <><AlertTriangle className="h-3 w-3" /> Expiré</>
        : warning
        ? <><Clock className="h-3 w-3" /> {days}j</>
        : soon
        ? <><Clock className="h-3 w-3" /> {days}j</>
        : <><CheckCircle2 className="h-3 w-3" /> Valide</>
      }
    </span>
  );
}

function DocIcon({ mimeType }: { mimeType: string | null }) {
  if (mimeType?.startsWith('image/')) {
    return (
      <div className="h-9 w-9 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0">
        <ImageIcon className="h-5 w-5 text-purple-400" />
      </div>
    );
  }
  return (
    <div className="h-9 w-9 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0">
      <FileText className="h-5 w-5 text-cyan-400" />
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function DocumentList({ driverId, refreshKey = 0 }: Props) {
  const [documents, setDocuments] = useState<DriverDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getDriverDocuments({ driver_id: driverId });
      if (result?.data?.data) {
        setDocuments(result.data.data as DriverDocument[]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [driverId]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments, refreshKey]);

  const handleView = async (doc: DriverDocument) => {
    setOpeningId(doc.id);
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.storage
        .from('driver-documents')
        .createSignedUrl(doc.storage_path, 3600); // URL valide 1 heure

      if (error || !data?.signedUrl) {
        console.error('[VIEW_DOC]', error?.message);
        return;
      }
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } finally {
      setOpeningId(null);
    }
  };

  const handleDelete = async (doc: DriverDocument) => {
    setDeletingId(doc.id);
    try {
      await deleteDriverDocument({
        document_id:  doc.id,
        storage_path: doc.storage_path,
      });
      setDocuments(prev => prev.filter(d => d.id !== doc.id));
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Chargement des documents…
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-slate-500 gap-2">
        <FolderOpen className="h-10 w-10 text-slate-600" />
        <p className="text-sm">Aucun document enregistré pour ce conducteur.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="flex items-center gap-3 rounded-xl p-3 bg-slate-800/60 border border-slate-700 hover:border-slate-600 transition-colors"
        >
          <DocIcon mimeType={doc.mime_type} />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-slate-200 text-sm truncate max-w-[200px]">
                {doc.document_name}
              </p>
              <Badge variant="outline" className="text-xs border-slate-600 text-slate-400 font-normal shrink-0">
                {DOCUMENT_TYPE_LABELS[doc.document_type] ?? doc.document_type}
              </Badge>
              {doc.side && (
                <Badge
                  variant="outline"
                  className={cn(
                    'text-xs font-normal shrink-0',
                    doc.side === 'recto'
                      ? 'border-blue-600/50 text-blue-400'
                      : doc.side === 'verso'
                      ? 'border-indigo-600/50 text-indigo-400'
                      : 'border-slate-600 text-slate-400',
                  )}
                >
                  {SIDE_LABELS[doc.side]}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              {doc.file_size && (
                <span className="text-xs text-slate-500">
                  {(doc.file_size / 1024).toFixed(0)} Ko
                </span>
              )}
              {doc.expiry_date && <ExpiryBadge expiryDate={doc.expiry_date} />}
              {doc.notes && (
                <span className="text-xs text-slate-500 truncate max-w-[160px]">{doc.notes}</span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10"
              onClick={() => handleView(doc)}
              disabled={openingId === doc.id}
              title="Voir le document"
            >
              {openingId === doc.id
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Eye className="h-4 w-4" />
              }
            </Button>

            {confirmDeleteId === doc.id ? (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  onClick={() => handleDelete(doc)}
                  disabled={deletingId === doc.id}
                >
                  {deletingId === doc.id ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Confirmer'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-slate-400"
                  onClick={() => setConfirmDeleteId(null)}
                >
                  Annuler
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                onClick={() => setConfirmDeleteId(doc.id)}
                title="Supprimer"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
