'use client';

/**
 * Wizard d'import CSV/Excel — 4 étapes
 * Compatible véhicules et chauffeurs
 */

import { useState, useRef, useCallback } from 'react';
import Papa from 'papaparse';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  Upload,
  FileText,
  ArrowRight,
  ArrowLeft,
  Loader2,
} from 'lucide-react';

import {
  downloadCSVTemplate,
  getVehiclesCSVTemplate,
  getDriversCSVTemplate,
} from '@/lib/import-templates';
import {
  validateImportRows,
  type ImportValidationResult,
} from '@/lib/import-validators';
import {
  importVehiclesBatch,
  type VehicleImportRow,
  type ImportRowError as VehicleImportError,
} from '@/actions/import-vehicles';
import {
  importDriversBatch,
  type DriverImportRow,
  type ImportRowError as DriverImportError,
} from '@/actions/import-drivers';

// ─── Types ────────────────────────────────────────────────────────────────────

type ImportType = 'vehicles' | 'drivers';

interface ImportWizardProps {
  type: ImportType;
  open: boolean;
  onClose: () => void;
}

type ParsedRow = Record<string, string>;

// ─── Config par type ──────────────────────────────────────────────────────────

const CONFIG = {
  vehicles: {
    label: 'véhicules',
    templateFn: getVehiclesCSVTemplate,
    templateFilename: 'template-vehicules.csv',
    requiredFields: ['immatriculation', 'marque', 'modele', 'kilometrage'],
    fieldLabels: {
      immatriculation: 'Immatriculation',
      marque: 'Marque',
      modele: 'Modèle',
      annee: 'Année',
      type_vehicule: 'Type',
      carburant: 'Carburant',
      kilometrage: 'Kilométrage',
      vin: 'VIN',
      date_mise_en_service: 'Mise en service',
      date_controle_technique: 'Date CT',
      date_atp: 'Date ATP',
      date_tachygraphe: 'Date tachygraphe',
      numero_serie: 'N° série',
    } as Record<string, string>,
    validTypes: ['VOITURE', 'FOURGON', 'POIDS_LOURD', 'POIDS_LOURD_FRIGO'],
    validFuels: ['diesel', 'gasoline', 'electric', 'hybrid', 'lpg'],
    linkAfter: '/vehicles',
    linkLabel: 'Voir les véhicules importés',
  },
  drivers: {
    label: 'chauffeurs',
    templateFn: getDriversCSVTemplate,
    templateFilename: 'template-chauffeurs.csv',
    requiredFields: ['nom', 'prenom', 'email', 'telephone', 'numero_permis'],
    fieldLabels: {
      nom: 'Nom',
      prenom: 'Prénom',
      email: 'Email',
      telephone: 'Téléphone',
      numero_permis: 'N° permis',
      categorie_permis: 'Catégorie permis',
      date_expiration_permis: 'Expiration permis',
      date_naissance: 'Date de naissance',
      date_embauche: 'Date d\'embauche',
      type_contrat: 'Type contrat',
    } as Record<string, string>,
    linkAfter: '/drivers',
    linkLabel: 'Voir les chauffeurs importés',
  },
} as const;

// ─── Composant principal ──────────────────────────────────────────────────────

export function ImportWizard({ type, open, onClose }: ImportWizardProps) {
  const cfg = CONFIG[type];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Wizard state
  const [step, setStep] = useState(1);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [previewRows, setPreviewRows] = useState<ParsedRow[]>([]);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [validation, setValidation] = useState<ImportValidationResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [importResult, setImportResult] = useState<{
    success: number;
    errors: (VehicleImportError | DriverImportError)[];
    limitReached?: boolean;
    limitMessage?: string;
  } | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // ─── Reset ─────────────────────────────────────────────────────────────────

  const handleClose = () => {
    setStep(1);
    setParsedRows([]);
    setPreviewRows([]);
    setPreviewHeaders([]);
    setValidation(null);
    setImporting(false);
    setProgress(0);
    setImportResult(null);
    setFileError(null);
    onClose();
  };

  // ─── Template download ──────────────────────────────────────────────────────

  const handleDownloadTemplate = () => {
    downloadCSVTemplate(cfg.templateFn(), cfg.templateFilename);
  };

  // ─── File parsing ───────────────────────────────────────────────────────────

  const parseFile = useCallback(
    async (file: File) => {
      setFileError(null);
      const ext = file.name.split('.').pop()?.toLowerCase();

      if (ext === 'csv') {
        Papa.parse<ParsedRow>(file, {
          header: true,
          delimiter: ';',
          skipEmptyLines: true,
          transformHeader: (h) => h.trim().replace(/^#\s*/, ''),
          transform: (v) => v.trim(),
          complete: (results) => {
            // Filtrer les lignes commentées (commençant par #)
            const rows = (results.data as ParsedRow[]).filter(
              (row) => !Object.values(row).some((v) => String(v).startsWith('#'))
            );
            if (rows.length === 0) {
              setFileError('Le fichier CSV est vide ou ne contient que des commentaires.');
              return;
            }
            const headers = Object.keys(rows[0]);
            setParsedRows(rows);
            setPreviewRows(rows.slice(0, 5));
            setPreviewHeaders(headers);
            setStep(3);
            setValidation(validateImportRows(rows, type));
          },
          error: (err) => {
            setFileError(`Erreur de lecture CSV : ${err.message}`);
          },
        });
      } else if (ext === 'xlsx' || ext === 'xls') {
        try {
          const buffer = await file.arrayBuffer();
          // Import dynamique pour ne pas alourdir le bundle
          const XLSX = await import('xlsx');
          const wb = XLSX.read(buffer, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rawRows = XLSX.utils.sheet_to_json<ParsedRow>(ws, {
            raw: false,
            defval: '',
          });
          // Filtrer les lignes de commentaires (#)
          const rows = rawRows.filter(
            (row) => !Object.values(row).some((v) => String(v).startsWith('#'))
          );
          if (rows.length === 0) {
            setFileError('Le fichier Excel est vide ou ne contient pas de données.');
            return;
          }
          // Normaliser les clés (trim)
          const normalizedRows = rows.map((row) =>
            Object.fromEntries(
              Object.entries(row).map(([k, v]) => [k.trim(), String(v).trim()])
            )
          );
          const headers = Object.keys(normalizedRows[0]);
          setParsedRows(normalizedRows);
          setPreviewRows(normalizedRows.slice(0, 5));
          setPreviewHeaders(headers);
          setStep(3);
          setValidation(validateRows(normalizedRows, type));
        } catch (e) {
          setFileError(
            `Erreur de lecture Excel : ${e instanceof Error ? e.message : String(e)}`
          );
        }
      } else {
        setFileError('Format non supporté. Utilisez un fichier .csv, .xlsx ou .xls');
      }
    },
    [type]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) parseFile(file);
    // Reset input pour permettre re-sélection du même fichier
    e.target.value = '';
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) parseFile(file);
    },
    [parseFile]
  );

  // ─── Import ─────────────────────────────────────────────────────────────────

  const handleImport = async (validOnly: boolean) => {
    if (!validation) return;
    const toImport = validOnly ? validation.validRows : parsedRows;
    if (toImport.length === 0) return;

    setImporting(true);
    setProgress(10);

    // Simuler un peu de progression pendant l'appel serveur
    const progressInterval = setInterval(() => {
      setProgress((p) => Math.min(p + 15, 85));
    }, 400);

    try {
      let result;
      if (type === 'vehicles') {
        result = await importVehiclesBatch(toImport as unknown as VehicleImportRow[]);
      } else {
        result = await importDriversBatch(toImport as unknown as DriverImportRow[]);
      }
      clearInterval(progressInterval);
      setProgress(100);
      setImportResult(result);
      setStep(4);
    } catch (e) {
      clearInterval(progressInterval);
      setImportResult({
        success: 0,
        errors: [
          {
            row: 0,
            field: 'général',
            message: e instanceof Error ? e.message : 'Erreur inconnue',
          },
        ],
      });
      setStep(4);
    } finally {
      setImporting(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-[#0f1117] border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Upload className="h-5 w-5 text-cyan-400" />
            Importer des {cfg.label}
          </DialogTitle>
        </DialogHeader>

        {/* Indicateur d'étapes */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                  step === s
                    ? 'bg-cyan-500 text-white'
                    : step > s
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-slate-800 text-slate-500'
                }`}
              >
                {step > s ? <CheckCircle2 className="h-4 w-4" /> : s}
              </div>
              {s < 4 && <div className={`h-px flex-1 ${step > s ? 'bg-cyan-500/40' : 'bg-slate-700'}`} />}
            </div>
          ))}
        </div>

        {/* ─── Étape 1 : Template ─────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
              <h3 className="font-semibold text-white mb-2">
                1 — Téléchargez le template CSV
              </h3>
              <p className="text-slate-400 text-sm mb-4">
                Remplissez le fichier template avec vos données, puis importez-le à l'étape suivante.
              </p>
              <Button onClick={handleDownloadTemplate} variant="outline" className="gap-2 border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10">
                <Download className="h-4 w-4" />
                Télécharger le template ({cfg.label})
              </Button>
            </div>

            <div className="bg-slate-800/30 rounded-xl p-5 border border-slate-700/50 space-y-3">
              <h4 className="font-medium text-slate-300 flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-400" />
                Instructions
              </h4>
              <ul className="text-sm text-slate-400 space-y-1.5 list-disc list-inside">
                <li>Le séparateur est le <strong className="text-white">point-virgule (;)</strong></li>
                <li>Les lignes commençant par <strong className="text-white">#</strong> sont ignorées (commentaires)</li>
                <li>Les dates doivent être au format <strong className="text-white">AAAA-MM-JJ</strong> (ex: 2025-06-30)</li>
                {type === 'vehicles' && (
                  <>
                    <li>Types acceptés : <strong className="text-white">VOITURE, FOURGON, POIDS_LOURD, POIDS_LOURD_FRIGO</strong></li>
                    <li>Carburants acceptés : <strong className="text-white">diesel, gasoline, electric, hybrid, lpg</strong></li>
                  </>
                )}
                {type === 'drivers' && (
                  <>
                    <li>Types contrat : <strong className="text-white">CDI, CDD, Intérim, Gérant, Autre</strong></li>
                    <li>L'email doit être unique pour chaque chauffeur</li>
                  </>
                )}
                <li>Vous pouvez aussi importer un fichier <strong className="text-white">.xlsx</strong> Excel</li>
              </ul>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} className="gap-2 bg-cyan-600 hover:bg-cyan-500">
                Suivant : Importer le fichier
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ─── Étape 2 : Upload ────────────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-6">
            <div
              className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
                isDragging
                  ? 'border-cyan-400 bg-cyan-500/10'
                  : 'border-slate-600 hover:border-slate-500 hover:bg-slate-800/30'
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-10 w-10 mx-auto mb-4 text-slate-400" />
              <p className="text-white font-medium mb-1">Glissez un fichier ici</p>
              <p className="text-slate-400 text-sm">ou cliquez pour parcourir</p>
              <p className="text-slate-500 text-xs mt-3">Formats acceptés : .csv, .xlsx, .xls</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>

            {fileError && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                {fileError}
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)} className="gap-2 text-slate-400">
                <ArrowLeft className="h-4 w-4" />
                Retour
              </Button>
            </div>
          </div>
        )}

        {/* ─── Étape 3 : Validation ────────────────────────────────────────── */}
        {step === 3 && validation && (
          <div className="space-y-5">
            {/* Résumé */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700 text-center">
                <p className="text-2xl font-bold text-white">{parsedRows.length}</p>
                <p className="text-xs text-slate-400 mt-1">Lignes lues</p>
              </div>
              <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/20 text-center">
                <p className="text-2xl font-bold text-emerald-400">{validation.validRows.length}</p>
                <p className="text-xs text-slate-400 mt-1">Valides</p>
              </div>
              <div className="bg-red-500/10 rounded-xl p-4 border border-red-500/20 text-center">
                <p className="text-2xl font-bold text-red-400">{validation.errorRowCount}</p>
                <p className="text-xs text-slate-400 mt-1">Erreurs</p>
              </div>
            </div>

            {/* Aperçu des 5 premières lignes */}
            {previewRows.length > 0 && (
              <div>
                <p className="text-sm font-medium text-slate-300 mb-2">Aperçu (5 premières lignes)</p>
                <div className="overflow-x-auto rounded-lg border border-slate-700">
                  <table className="text-xs w-full">
                    <thead className="bg-slate-800/80">
                      <tr>
                        {previewHeaders.slice(0, 6).map((h) => (
                          <th key={h} className="px-3 py-2 text-left text-slate-400 font-medium">
                            {cfg.fieldLabels[h] ?? h}
                          </th>
                        ))}
                        {previewHeaders.length > 6 && (
                          <th className="px-3 py-2 text-slate-500">+{previewHeaders.length - 6}</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.map((row, i) => (
                        <tr key={i} className="border-t border-slate-800 hover:bg-slate-800/30">
                          {previewHeaders.slice(0, 6).map((h) => (
                            <td key={h} className="px-3 py-2 text-slate-300 max-w-[120px] truncate">
                              {row[h] || <span className="text-slate-600">—</span>}
                            </td>
                          ))}
                          {previewHeaders.length > 6 && <td />}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Erreurs — tableau ligne / champ / message */}
            {validation.errors.length > 0 && (
              <div>
                <p className="text-sm font-medium text-red-400 mb-2 flex items-center gap-1">
                  <XCircle className="h-4 w-4" />
                  Lignes avec erreurs ({validation.errorRowCount})
                </p>
                <div className="max-h-52 overflow-y-auto rounded-lg border border-red-500/20">
                  <table className="text-xs w-full">
                    <thead className="bg-red-500/10 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left text-red-400 font-medium w-14">Ligne</th>
                        <th className="px-3 py-2 text-left text-red-400 font-medium w-36">Champ</th>
                        <th className="px-3 py-2 text-left text-red-400 font-medium">Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validation.errors.map((err, i) => (
                        <tr key={i} className="border-t border-red-500/10 hover:bg-red-500/5">
                          <td className="px-3 py-2 text-red-400 font-medium">{err.row}</td>
                          <td className="px-3 py-2 text-slate-400 font-mono text-[11px]">
                            {cfg.fieldLabels[err.field] ?? err.field}
                          </td>
                          <td className="px-3 py-2 text-slate-300">{err.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2 justify-between pt-2">
              <Button
                variant="ghost"
                onClick={() => setStep(2)}
                className="gap-2 text-slate-400"
              >
                <ArrowLeft className="h-4 w-4" />
                Changer de fichier
              </Button>

              <div className="flex gap-2">
                {validation.errorRowCount > 0 && validation.validRows.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => handleImport(true)}
                    className="gap-1 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Importer {validation.validRows.length} lignes valides
                  </Button>
                )}

                {validation.validRows.length === parsedRows.length && (
                  <Button
                    onClick={() => handleImport(false)}
                    className="gap-1 bg-cyan-600 hover:bg-cyan-500"
                  >
                    <Upload className="h-4 w-4" />
                    Importer {parsedRows.length} {cfg.label}
                  </Button>
                )}

                {validation.errorRowCount > 0 && validation.validRows.length === 0 && (
                  <Button disabled className="gap-1 opacity-50">
                    Aucune ligne valide à importer
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── Étape 4 : Résultats ─────────────────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-6">
            {importing ? (
              <div className="text-center py-8 space-y-4">
                <Loader2 className="h-10 w-10 animate-spin mx-auto text-cyan-400" />
                <p className="text-slate-300">Import en cours...</p>
                <Progress value={progress} className="max-w-xs mx-auto" />
              </div>
            ) : importResult ? (
              <div className="space-y-4">
                {/* Rapport */}
                <div
                  className={`rounded-xl p-5 border text-center ${
                    importResult.success > 0
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-red-500/10 border-red-500/30'
                  }`}
                >
                  {importResult.success > 0 ? (
                    <CheckCircle2 className="h-10 w-10 mx-auto mb-2 text-emerald-400" />
                  ) : (
                    <XCircle className="h-10 w-10 mx-auto mb-2 text-red-400" />
                  )}
                  <p className="text-xl font-bold text-white">
                    {importResult.success} {cfg.label} importé(s) avec succès
                  </p>
                  {importResult.errors.length > 0 && (
                    <p className="text-slate-400 text-sm mt-1">
                      {importResult.errors.length} erreur(s) lors de l'import
                    </p>
                  )}
                </div>

                {/* Alerte limite de plan */}
                {importResult.limitReached && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{importResult.limitMessage}</span>
                  </div>
                )}

                {/* Erreurs détaillées */}
                {importResult.errors.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-red-400 mb-2">Détail des erreurs :</p>
                    <div className="max-h-48 overflow-y-auto space-y-1.5">
                      {importResult.errors
                        .filter((e) => e.row > 0)
                        .map((err, i) => (
                          <div
                            key={i}
                            className="text-xs p-2.5 rounded-lg bg-red-500/10 border border-red-500/20"
                          >
                            <span className="text-red-400 font-medium">
                              Ligne {err.row} ({err.field}) :
                            </span>{' '}
                            <span className="text-slate-300">{err.message}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Actions finales */}
                <div className="flex justify-between pt-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setStep(1);
                      setParsedRows([]);
                      setPreviewRows([]);
                      setPreviewHeaders([]);
                      setValidation(null);
                      setImportResult(null);
                      setProgress(0);
                    }}
                    className="text-slate-400"
                  >
                    Nouvel import
                  </Button>

                  <div className="flex gap-2">
                    <Button variant="outline" onClick={handleClose} className="border-slate-600">
                      Fermer
                    </Button>
                    {importResult.success > 0 && (
                      <Button
                        asChild
                        className="gap-2 bg-cyan-600 hover:bg-cyan-500"
                        onClick={handleClose}
                      >
                        <a href={cfg.linkAfter}>{cfg.linkLabel}</a>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Progression d'import superposée (step 3 → 4 transition) */}
        {importing && step === 3 && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-4 rounded-lg">
            <Loader2 className="h-10 w-10 animate-spin text-cyan-400" />
            <p className="text-white">Import en cours...</p>
            <Progress value={progress} className="w-48" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
