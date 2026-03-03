'use client';

import { useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Car,
  User,
  Calendar,
  MapPin,
  Shield,
  FileText,
  Upload,
  Trash2,
  Download,
  CheckCircle,
  Clock,
  CircleDot,
  Euro,
  Edit3,
  Save,
  X,
  Image,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassCard } from '@/components/ui/glass-card';
import { cn } from '@/lib/utils';
import {
  useIncident,
  useUpdateIncident,
  useAddIncidentDocument,
  useDeleteIncidentDocument,
} from '@/hooks/use-incidents';
import {
  IncidentStatusBadge,
  IncidentSeverityBadge,
  IncidentTypeBadge,
  ClaimStatusBadge,
  INCIDENT_TYPE_LABELS,
  SEVERITY_LABELS,
  CLAIM_STATUS_LABELS,
  DOCUMENT_TYPE_LABELS,
} from '@/components/incidents/incident-status-badge';
import { getSupabaseClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useUserContext } from '@/components/providers/user-provider';

// ============================================================
// Timeline statuts
// ============================================================

const TIMELINE = [
  { status: 'ouvert', label: 'Ouverture dossier', icon: Clock },
  { status: 'en_cours', label: 'En instruction', icon: CircleDot },
  { status: 'clôturé', label: 'Clôture dossier', icon: CheckCircle },
];

const STATUS_ORDER = ['ouvert', 'en_cours', 'clôturé'];

// ============================================================
// Page
// ============================================================

export default function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useUserContext();

  const { data: incident, isLoading } = useIncident(id);
  const updateMutation = useUpdateIncident();
  const addDocumentMutation = useAddIncidentDocument();
  const deleteDocumentMutation = useDeleteIncidentDocument();

  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState('');
  const [editingStatus, setEditingStatus] = useState(false);
  const [editingInsurance, setEditingInsurance] = useState(false);
  const [insuranceForm, setInsuranceForm] = useState({
    insurance_company: '',
    insurance_policy_number: '',
    claim_number: '',
    claim_date: '',
    claim_status: 'non_declaré',
    estimated_damage: '',
    final_settlement: '',
  });
  const [docType, setDocType] = useState('photo');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Init notes & insurance form from incident data
  if (incident && !editingNotes && notesValue === '' && incident.notes) {
    setNotesValue(incident.notes);
  }

  if (incident && !editingInsurance && insuranceForm.insurance_company === '') {
    setInsuranceForm({
      insurance_company: incident.insurance_company ?? '',
      insurance_policy_number: incident.insurance_policy_number ?? '',
      claim_number: incident.claim_number ?? '',
      claim_date: incident.claim_date ?? '',
      claim_status: incident.claim_status ?? 'non_declaré',
      estimated_damage: incident.estimated_damage?.toString() ?? '',
      final_settlement: incident.final_settlement?.toString() ?? '',
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-500 text-sm">Chargement du dossier...</div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-slate-400">Sinistre introuvable.</p>
        <Button onClick={() => router.push('/incidents')} variant="ghost">
          <ArrowLeft className="mr-2 h-4 w-4" /> Retour à la liste
        </Button>
      </div>
    );
  }

  const currentStatusIndex = STATUS_ORDER.indexOf(incident.status);

  // ---- Handlers ----

  const handleSaveNotes = async () => {
    await updateMutation.mutateAsync({ id, notes: notesValue });
    setEditingNotes(false);
  };

  const handleStatusChange = async (newStatus: string) => {
    await updateMutation.mutateAsync({ id, status: newStatus as 'ouvert' | 'en_cours' | 'clôturé' });
    setEditingStatus(false);
  };

  const handleSaveInsurance = async () => {
    await updateMutation.mutateAsync({
      id,
      insurance_company: insuranceForm.insurance_company || null,
      insurance_policy_number: insuranceForm.insurance_policy_number || null,
      claim_number: insuranceForm.claim_number || null,
      claim_date: insuranceForm.claim_date || null,
      claim_status: insuranceForm.claim_status as any,
      estimated_damage: insuranceForm.estimated_damage ? parseFloat(insuranceForm.estimated_damage) : null,
      final_settlement: insuranceForm.final_settlement ? parseFloat(insuranceForm.final_settlement) : null,
    });
    setEditingInsurance(false);
  };

  const handleUpload = async (file: File) => {
    if (!user?.company_id) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const storagePath = `${user.company_id}/${id}/${Date.now()}.${ext}`;
      const supabase = getSupabaseClient();

      const { error: uploadError } = await supabase.storage
        .from('incident-documents')
        .upload(storagePath, file, { upsert: false });

      if (uploadError) {
        toast.error('Erreur upload : ' + uploadError.message);
        return;
      }

      await addDocumentMutation.mutateAsync({
        incidentId: id,
        storagePath,
        fileName: file.name,
        documentType: docType,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (documentId: string, storagePath: string) => {
    await deleteDocumentMutation.mutateAsync({ documentId, storagePath, incidentId: id });
  };

  const getDocumentUrl = (storagePath: string) => {
    const supabase = getSupabaseClient();
    const { data } = supabase.storage
      .from('incident-documents')
      .createSignedUrl(storagePath, 3600);
    return (data as any)?.signedUrl ?? '#';
  };

  const handleDownloadPdf = async () => {
    setPdfLoading(true);
    try {
      const res = await fetch(`/api/incidents/${id}/pdf`);
      if (!res.ok) throw new Error('Erreur génération PDF');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sinistre-${incident.incident_number ?? id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Erreur lors de la génération du PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const isPhoto = (fileName: string) =>
    /\.(jpg|jpeg|png|webp|gif)$/i.test(fileName ?? '');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/incidents')}
            className="text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">
                {incident.incident_number ?? 'Sinistre'}
              </h1>
              <IncidentStatusBadge status={incident.status} />
              <IncidentSeverityBadge severity={incident.severity} />
            </div>
            <p className="text-slate-400 mt-0.5">
              <IncidentTypeBadge type={incident.incident_type} />
            </p>
          </div>
        </div>
        <Button
          onClick={handleDownloadPdf}
          disabled={pdfLoading}
          variant="outline"
          size="sm"
          className="border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10 shrink-0"
        >
          <Download className="mr-2 h-4 w-4" />
          {pdfLoading ? 'Génération...' : 'Rapport PDF'}
        </Button>
      </div>

      {/* Layout 2 colonnes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Colonne gauche (2/3) */}
        <div className="lg:col-span-2 space-y-6">

          {/* Infos incident */}
          <GlassCard className="p-6">
            <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4 text-cyan-400" />
              Détails de l&apos;incident
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <div>
                <dt className="text-slate-500 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> Date
                </dt>
                <dd className="mt-0.5 text-slate-200">
                  {new Date(incident.incident_date).toLocaleString('fr-FR', {
                    day: '2-digit', month: 'long', year: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                  })}
                </dd>
              </div>
              {incident.location_description && (
                <div>
                  <dt className="text-slate-500 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> Lieu
                  </dt>
                  <dd className="mt-0.5 text-slate-200">{incident.location_description}</dd>
                </div>
              )}
              {incident.vehicles && (
                <div>
                  <dt className="text-slate-500 flex items-center gap-1.5">
                    <Car className="h-3.5 w-3.5" /> Véhicule
                  </dt>
                  <dd className="mt-0.5 text-slate-200">
                    <span className="font-medium">{incident.vehicles.registration_number}</span>
                    {' — '}
                    {incident.vehicles.brand} {incident.vehicles.model}
                  </dd>
                </div>
              )}
              {incident.drivers && (
                <div>
                  <dt className="text-slate-500 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" /> Conducteur
                  </dt>
                  <dd className="mt-0.5 text-slate-200">
                    {incident.drivers.first_name} {incident.drivers.last_name}
                  </dd>
                </div>
              )}
            </dl>

            {incident.circumstances && (
              <div className="mt-5 pt-5 border-t border-white/[0.06]">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Circonstances</p>
                <p className="text-sm text-slate-300 whitespace-pre-wrap">{incident.circumstances}</p>
              </div>
            )}

            {incident.injuries_description && (
              <div className="mt-4">
                <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Blessures</p>
                <p className="text-sm text-slate-300">{incident.injuries_description}</p>
              </div>
            )}

            {incident.third_party_involved && incident.third_party_info && (
              <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                <p className="text-xs text-amber-400 font-medium uppercase tracking-wide mb-2">Tiers impliqué</p>
                <div className="text-sm text-slate-300 space-y-1">
                  {(incident.third_party_info as any).name && <p>Nom : {(incident.third_party_info as any).name}</p>}
                  {(incident.third_party_info as any).plate && <p>Plaque : {(incident.third_party_info as any).plate}</p>}
                  {(incident.third_party_info as any).insurance && <p>Assurance : {(incident.third_party_info as any).insurance}</p>}
                </div>
              </div>
            )}
          </GlassCard>

          {/* Documents & Photos */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Image className="h-4 w-4 text-cyan-400" />
                Documents ({incident.incident_documents?.length ?? 0})
              </h2>
            </div>

            {/* Upload */}
            <div className="flex gap-3 mb-5">
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="rounded-xl border border-white/[0.08] bg-[#0f172a]/60 px-3 py-2 text-sm text-white focus:outline-none"
              >
                {Object.entries(DOCUMENT_TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                size="sm"
                className="bg-white/5 border border-white/[0.08] text-slate-300 hover:bg-white/10"
              >
                <Upload className="mr-2 h-4 w-4" />
                {uploading ? 'Upload...' : 'Ajouter un fichier'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(file);
                  e.target.value = '';
                }}
              />
            </div>

            {/* Grille documents */}
            {incident.incident_documents && incident.incident_documents.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {incident.incident_documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="relative group rounded-xl border border-white/[0.08] bg-[#0f172a]/40 p-3"
                  >
                    {isPhoto(doc.file_name ?? '') ? (
                      <div className="h-20 rounded-lg overflow-hidden bg-slate-800 mb-2">
                        <img
                          src={getDocumentUrl(doc.storage_path)}
                          alt={doc.file_name ?? ''}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    ) : (
                      <div className="h-20 rounded-lg bg-slate-800/60 flex items-center justify-center mb-2">
                        <FileText className="h-8 w-8 text-slate-500" />
                      </div>
                    )}
                    <p className="text-xs text-slate-400 truncate">{doc.file_name}</p>
                    <p className="text-xs text-slate-600">{DOCUMENT_TYPE_LABELS[doc.document_type ?? ''] ?? doc.document_type}</p>
                    <div className="absolute top-2 right-2 hidden group-hover:flex gap-1">
                      <a
                        href={getDocumentUrl(doc.storage_path)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 rounded bg-black/40 text-slate-300 hover:text-cyan-400"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>
                      <button
                        onClick={() => handleDeleteDocument(doc.id, doc.storage_path)}
                        className="p-1 rounded bg-black/40 text-slate-300 hover:text-red-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-6">
                Aucun document. Ajoutez photos, constat ou rapport de police.
              </p>
            )}
          </GlassCard>

          {/* Notes de suivi */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-white flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-cyan-400" />
                Journal de suivi
              </h2>
              {!editingNotes ? (
                <button
                  onClick={() => { setNotesValue(incident.notes ?? ''); setEditingNotes(true); }}
                  className="text-xs text-slate-500 hover:text-cyan-400 transition-colors"
                >
                  Modifier
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={handleSaveNotes} className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                    <Save className="h-3 w-3" /> Enregistrer
                  </button>
                  <button onClick={() => setEditingNotes(false)} className="text-xs text-slate-500 hover:text-slate-300">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>

            {editingNotes ? (
              <textarea
                value={notesValue}
                onChange={(e) => setNotesValue(e.target.value)}
                rows={6}
                className="w-full rounded-xl border border-white/[0.08] bg-[#0f172a]/60 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-cyan-500/40 focus:outline-none resize-none"
                placeholder="Ajoutez des notes de suivi, contacts assurance, démarches effectuées..."
              />
            ) : incident.notes ? (
              <p className="text-sm text-slate-300 whitespace-pre-wrap">{incident.notes}</p>
            ) : (
              <p className="text-sm text-slate-500 italic">Aucune note. Cliquez sur &quot;Modifier&quot; pour ajouter un suivi.</p>
            )}
          </GlassCard>
        </div>

        {/* Colonne droite (1/3) */}
        <div className="space-y-6">

          {/* Timeline statut */}
          <GlassCard className="p-6">
            <h2 className="text-sm font-semibold text-white mb-5">Avancement du dossier</h2>
            <div className="space-y-4">
              {TIMELINE.map((step, i) => {
                const isDone = i <= currentStatusIndex;
                const isCurrent = i === currentStatusIndex;
                const Icon = step.icon;
                return (
                  <div key={step.status} className="flex items-start gap-3">
                    <div className={cn(
                      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs transition-all',
                      isDone
                        ? isCurrent
                          ? 'bg-gradient-to-br from-cyan-500 to-blue-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                          : 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-white/5 text-slate-600'
                    )}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="pt-1">
                      <p className={cn('text-sm font-medium', isDone ? 'text-slate-200' : 'text-slate-600')}>
                        {step.label}
                      </p>
                      {isCurrent && (
                        <p className="text-xs text-cyan-400">Statut actuel</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {incident.status !== 'clôturé' && (
              <div className="mt-5 pt-4 border-t border-white/[0.06]">
                <p className="text-xs text-slate-500 mb-2">Changer le statut</p>
                <div className="flex flex-col gap-2">
                  {STATUS_ORDER.filter((s) => s !== incident.status).map((s) => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(s)}
                      disabled={updateMutation.isPending}
                      className="w-full rounded-xl border border-white/[0.08] bg-white/5 px-3 py-2 text-xs text-slate-400 hover:border-cyan-500/30 hover:text-cyan-400 transition-all text-left"
                    >
                      → Passer à &quot;{s === 'en_cours' ? 'En cours' : 'Clôturé'}&quot;
                    </button>
                  ))}
                </div>
              </div>
            )}
          </GlassCard>

          {/* Assurance */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <Shield className="h-4 w-4 text-cyan-400" />
                Assurance
              </h2>
              {!editingInsurance ? (
                <button
                  onClick={() => setEditingInsurance(true)}
                  className="text-xs text-slate-500 hover:text-cyan-400 transition-colors"
                >
                  Modifier
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={handleSaveInsurance} className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                    <Save className="h-3 w-3" /> OK
                  </button>
                  <button onClick={() => setEditingInsurance(false)} className="text-xs text-slate-500">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>

            {editingInsurance ? (
              <div className="space-y-3">
                {[
                  { key: 'insurance_company', label: 'Compagnie', type: 'text', placeholder: 'Axa, Allianz...' },
                  { key: 'insurance_policy_number', label: 'N° de police', type: 'text' },
                  { key: 'claim_number', label: 'N° de sinistre', type: 'text' },
                  { key: 'claim_date', label: 'Date de déclaration', type: 'date' },
                  { key: 'estimated_damage', label: 'Dommages estimés (€)', type: 'number' },
                  { key: 'final_settlement', label: 'Règlement final (€)', type: 'number' },
                ].map(({ key, label, type, placeholder }) => (
                  <div key={key}>
                    <label className="text-xs text-slate-500 mb-1 block">{label}</label>
                    <input
                      type={type}
                      value={insuranceForm[key as keyof typeof insuranceForm]}
                      onChange={(e) => setInsuranceForm(prev => ({ ...prev, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full rounded-xl border border-white/[0.08] bg-[#0f172a]/60 px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/40"
                    />
                  </div>
                ))}
                <div>
                  <label className="text-xs text-slate-500 mb-1 block">Statut assurance</label>
                  <select
                    value={insuranceForm.claim_status}
                    onChange={(e) => setInsuranceForm(prev => ({ ...prev, claim_status: e.target.value }))}
                    className="w-full rounded-xl border border-white/[0.08] bg-[#0f172a]/60 px-3 py-2 text-sm text-white focus:outline-none"
                  >
                    {Object.entries(CLAIM_STATUS_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <dl className="space-y-3 text-sm">
                <InfoRow label="Compagnie" value={incident.insurance_company} />
                <InfoRow label="N° de police" value={incident.insurance_policy_number} />
                <InfoRow label="N° sinistre" value={incident.claim_number} />
                <InfoRow
                  label="Déclaré le"
                  value={incident.claim_date ? new Date(incident.claim_date).toLocaleDateString('fr-FR') : null}
                />
                <div className="flex justify-between">
                  <dt className="text-slate-500">Statut</dt>
                  <dd><ClaimStatusBadge status={incident.claim_status} /></dd>
                </div>
                <InfoRow
                  label="Dommages estimés"
                  value={incident.estimated_damage != null
                    ? incident.estimated_damage.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
                    : null}
                />
                {incident.final_settlement != null && (
                  <InfoRow
                    label="Règlement final"
                    value={incident.final_settlement.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                  />
                )}
              </dl>
            )}
          </GlassCard>

          {/* Métadonnées */}
          <GlassCard className="p-5">
            <dl className="space-y-2 text-xs text-slate-500">
              <div className="flex justify-between">
                <dt>Déclaré le</dt>
                <dd className="text-slate-400">{new Date(incident.created_at).toLocaleDateString('fr-FR')}</dd>
              </div>
              <div className="flex justify-between">
                <dt>Mis à jour</dt>
                <dd className="text-slate-400">{new Date(incident.updated_at).toLocaleDateString('fr-FR')}</dd>
              </div>
              <div className="flex justify-between">
                <dt>N° interne</dt>
                <dd className="font-mono text-cyan-400">{incident.incident_number ?? '—'}</dd>
              </div>
            </dl>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

// Composant helper pour les lignes d'info
function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-slate-300">{value ?? <span className="text-slate-600 italic">—</span>}</dd>
    </div>
  );
}
