'use client';

import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getSupabaseClient } from '@/lib/supabase/client';
import { saveDriverDocument } from '@/actions/driver-documents';
import {
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
  TYPES_WITH_EXPIRY,
  TYPES_WITH_SIDES,
  SIDES,
  SIDE_LABELS,
  type DocumentType,
  type DocumentSide,
} from '@/lib/driver-documents-config';
import { cn } from '@/lib/utils';

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];

interface Props {
  driverId: string;
  companyId: string;
  onSuccess?: () => void;
}

export function DocumentUpload({ driverId, companyId, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [docType, setDocType] = useState<DocumentType | ''>('');
  const [side, setSide] = useState<DocumentSide | ''>('');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = (f: File): string | null => {
    if (!ACCEPTED_TYPES.includes(f.type)) {
      return 'Format non supporté. Acceptés : PDF, JPEG, PNG, WebP.';
    }
    if (f.size > MAX_SIZE) {
      return `Fichier trop grand (max 10 MB). Taille : ${(f.size / 1024 / 1024).toFixed(1)} MB.`;
    }
    return null;
  };

  const handleFile = (f: File) => {
    const validationError = validateFile(f);
    if (validationError) { setError(validationError); return; }
    setError(null);
    setFile(f);
    if (f.type.startsWith('image/')) {
      setPreview(URL.createObjectURL(f));
    } else {
      setPreview(null);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }, []);

  const clearFile = () => {
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !docType) {
      setError('Sélectionnez un fichier et un type de document.');
      return;
    }
    // Recto/verso obligatoire pour les types concernés
    const needsSide = TYPES_WITH_SIDES.includes(docType as DocumentType);
    if (needsSide && !side) {
      setError('Précisez si c\'est le recto ou le verso.');
      return;
    }

    setError(null);
    setIsUploading(true);
    setProgress(10);

    try {
      const supabase = getSupabaseClient();

      // Path : {company_id}/{driver_id}/{doc_type}/{side_}_{timestamp}_{filename}
      const safeFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const sidePrefix = side ? `${side}_` : '';
      const storagePath = `${companyId}/${driverId}/${docType}/${sidePrefix}${Date.now()}_${safeFilename}`;

      setProgress(30);

      const { error: uploadError } = await supabase.storage
        .from('driver-documents')
        .upload(storagePath, file, { upsert: false });

      if (uploadError) throw new Error(`Upload échoué : ${uploadError.message}`);

      setProgress(70);

      const result = await saveDriverDocument({
        driver_id:     driverId,
        document_type: docType as DocumentType,
        side:          (side as DocumentSide) || null,
        document_name: file.name,
        storage_path:  storagePath,
        file_size:     file.size,
        mime_type:     file.type,
        expiry_date:   expiryDate || null,
        notes:         notes || null,
      });

      if (result?.serverError) throw new Error(result.serverError);

      setProgress(100);

      // Reset
      clearFile();
      setDocType('');
      setSide('');
      setExpiryDate('');
      setNotes('');
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

  const showExpiry   = docType && TYPES_WITH_EXPIRY.includes(docType as DocumentType);
  const showSide     = docType && TYPES_WITH_SIDES.includes(docType as DocumentType);
  const canSubmit    = !!file && !!docType && (!showSide || !!side) && !isUploading;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* ── Zone de drop ── */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => !file && inputRef.current?.click()}
        className={cn(
          'relative border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer',
          isDragging
            ? 'border-cyan-400 bg-cyan-500/10'
            : file
            ? 'border-emerald-500/50 bg-emerald-950/20 cursor-default'
            : 'border-slate-600 hover:border-slate-500 hover:bg-slate-800/50',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={handleInputChange}
        />

        {file ? (
          <div className="flex items-center gap-3">
            {preview ? (
              <img src={preview} alt="preview" className="h-16 w-16 object-cover rounded-lg border border-slate-700" />
            ) : (
              <div className="h-16 w-16 rounded-lg bg-slate-700 flex items-center justify-center shrink-0">
                <FileText className="h-8 w-8 text-cyan-400" />
              </div>
            )}
            <div className="flex-1 text-left min-w-0">
              <p className="font-medium text-slate-200 truncate">{file.name}</p>
              <p className="text-sm text-slate-400">{(file.size / 1024).toFixed(0)} Ko</p>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); clearFile(); }}
              className="p-1 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <Upload className="h-8 w-8" />
            <p className="text-sm">
              <span className="text-cyan-400 font-medium">Parcourir</span> ou glisser un fichier ici
            </p>
            <p className="text-xs text-slate-500">PDF, JPEG, PNG, WebP — max 10 MB</p>
          </div>
        )}
      </div>

      {/* ── Type de document ── */}
      <div className="space-y-1.5">
        <Label className="text-slate-300">
          Type de document <span className="text-red-400">*</span>
        </Label>
        <Select
          value={docType}
          onValueChange={(v) => {
            setDocType(v as DocumentType);
            setSide(''); // reset recto/verso si le type change
          }}
        >
          <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
            <SelectValue placeholder="Sélectionner un type…" />
          </SelectTrigger>
          <SelectContent>
            {DOCUMENT_TYPES.map((value) => (
              <SelectItem key={value} value={value}>
                {DOCUMENT_TYPE_LABELS[value]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Recto / Verso (conditionnel) ── */}
      {showSide && (
        <div className="space-y-1.5">
          <Label className="text-slate-300">
            Face du document <span className="text-red-400">*</span>
          </Label>
          <Select value={side} onValueChange={(v) => setSide(v as DocumentSide)}>
            <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-200">
              <SelectValue placeholder="Recto ou Verso ?" />
            </SelectTrigger>
            <SelectContent>
              {SIDES.map((s) => (
                <SelectItem key={s} value={s}>
                  {SIDE_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* ── Date d'expiration (conditionnelle) ── */}
      {showExpiry && (
        <div className="space-y-1.5">
          <Label className="text-slate-300">Date d&apos;expiration</Label>
          <Input
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            className="bg-slate-800 border-slate-700 text-slate-200"
          />
        </div>
      )}

      {/* ── Notes ── */}
      <div className="space-y-1.5">
        <Label className="text-slate-300">Notes (optionnel)</Label>
        <Input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ex : Renouvellement en cours…"
          className="bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500"
        />
      </div>

      {/* ── Barre de progression ── */}
      {isUploading && (
        <div className="space-y-1">
          <div className="h-1.5 w-full rounded-full bg-slate-700 overflow-hidden">
            <div
              className="h-full bg-cyan-400 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 text-right">{progress}%</p>
        </div>
      )}

      {/* ── Erreur ── */}
      {error && (
        <p className="text-sm text-red-400 bg-red-950/30 border border-red-800/40 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <Button type="submit" disabled={!canSubmit} className="w-full">
        {isUploading ? (
          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Upload en cours…</>
        ) : (
          <><Upload className="h-4 w-4 mr-2" /> Ajouter le document</>
        )}
      </Button>
    </form>
  );
}
