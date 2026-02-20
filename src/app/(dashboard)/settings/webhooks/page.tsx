'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus,
  Trash2,
  Copy,
  Check,
  Webhook,
  Key,
  Eye,
  EyeOff,
  RefreshCw,
  ArrowLeft,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useUserContext } from '@/components/providers/user-provider';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const ALL_EVENTS = [
  { value: 'vehicle.created', label: 'Véhicule créé' },
  { value: 'vehicle.updated', label: 'Véhicule modifié' },
  { value: 'vehicle.deleted', label: 'Véhicule supprimé' },
  { value: 'maintenance.created', label: 'Maintenance créée' },
  { value: 'maintenance.completed', label: 'Maintenance terminée' },
  { value: 'maintenance.due', label: 'Maintenance échue' },
  { value: 'inspection.completed', label: 'Inspection terminée' },
  { value: 'driver.created', label: 'Conducteur créé' },
  { value: 'driver.updated', label: 'Conducteur modifié' },
];

interface ApiKey {
  id: string;
  name: string;
  key: string;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
}

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret: string;
  is_active: boolean;
  last_triggered_at: string | null;
  created_at: string;
}

export default function WebhooksPage() {
  const { user } = useUserContext();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);

  // New API key form
  const [newKeyName, setNewKeyName] = useState('');
  const [creatingKey, setCreatingKey] = useState(false);

  // New webhook form
  const [newWebhook, setNewWebhook] = useState({ name: '', url: '', events: [] as string[] });
  const [creatingWebhook, setCreatingWebhook] = useState(false);
  const [showWebhookForm, setShowWebhookForm] = useState(false);

  // UI state
  const [revealedSecrets, setRevealedSecrets] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);

  const supabase = getSupabaseClient();

  const load = useCallback(async () => {
    if (!user?.company_id) return;
    setLoading(true);
    try {
      const [keysRes, hooksRes] = await Promise.all([
        supabase.from('api_keys' as any).select('*').order('created_at', { ascending: false }),
        supabase.from('webhooks' as any).select('*').order('created_at', { ascending: false }),
      ]);
      setApiKeys((keysRes.data as ApiKey[]) ?? []);
      setWebhooks((hooksRes.data as Webhook[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, [user?.company_id, supabase]);

  useEffect(() => { load(); }, [load]);

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
    toast.success('Copié dans le presse-papier');
  };

  // ── API Keys ──────────────────────────────
  const createApiKey = async () => {
    if (!newKeyName.trim() || !user?.company_id) return;
    setCreatingKey(true);
    try {
      const { error } = await supabase.from('api_keys' as any).insert({
        company_id: user.company_id,
        name: newKeyName.trim(),
      });
      if (error) throw error;
      toast.success('Clé API créée');
      setNewKeyName('');
      load();
    } catch {
      toast.error('Erreur lors de la création');
    } finally {
      setCreatingKey(false);
    }
  };

  const deleteApiKey = async (id: string) => {
    try {
      await supabase.from('api_keys' as any).delete().eq('id', id);
      setApiKeys((prev) => prev.filter((k) => k.id !== id));
      toast.success('Clé supprimée');
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  // ── Webhooks ──────────────────────────────
  const createWebhook = async () => {
    if (!newWebhook.name.trim() || !newWebhook.url.trim() || newWebhook.events.length === 0 || !user?.company_id) return;
    setCreatingWebhook(true);
    try {
      const { error } = await supabase.from('webhooks' as any).insert({
        company_id: user.company_id,
        name: newWebhook.name.trim(),
        url: newWebhook.url.trim(),
        events: newWebhook.events,
      });
      if (error) throw error;
      toast.success('Webhook créé');
      setNewWebhook({ name: '', url: '', events: [] });
      setShowWebhookForm(false);
      load();
    } catch {
      toast.error('Erreur lors de la création');
    } finally {
      setCreatingWebhook(false);
    }
  };

  const deleteWebhook = async (id: string) => {
    try {
      await supabase.from('webhooks' as any).delete().eq('id', id);
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
      toast.success('Webhook supprimé');
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  const toggleWebhookEvent = (event: string) => {
    setNewWebhook((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <Link href="/settings">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">API & Webhooks</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Intégrez FleetMaster Pro avec vos systèmes externes
          </p>
        </div>
        <Link
          href="/api/docs"
          target="_blank"
          className="ml-auto flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Documentation API
        </Link>
      </motion.div>

      {/* ─── API Keys ─── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <Key className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Clés API</h2>
              <p className="text-sm text-slate-500">Authentifiez vos requêtes via le header <code className="text-cyan-400">x-api-key</code></p>
            </div>
          </div>

          {/* Create key */}
          <div className="flex gap-2 mb-6">
            <Input
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              placeholder="Nom de la clé (ex: Production ERP)"
              className="glass-input flex-1"
              onKeyDown={(e) => e.key === 'Enter' && createApiKey()}
            />
            <Button
              onClick={createApiKey}
              disabled={creatingKey || !newKeyName.trim()}
              className="btn-primary gap-2 shrink-0"
            >
              <Plus className="h-4 w-4" />
              Créer
            </Button>
          </div>

          {/* Keys list */}
          {loading ? (
            <div className="space-y-2">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-14 rounded-lg bg-slate-800/30 animate-pulse" />
              ))}
            </div>
          ) : apiKeys.length === 0 ? (
            <p className="text-center text-slate-500 py-6 text-sm">Aucune clé API — créez-en une ci-dessus</p>
          ) : (
            <div className="space-y-2">
              {apiKeys.map((k) => (
                <div
                  key={k.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/40 border border-slate-700/40 group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{k.name}</p>
                    <p className="text-xs text-slate-500 font-mono mt-0.5 truncate">{k.key}</p>
                  </div>
                  {k.last_used_at && (
                    <span className="text-xs text-slate-500 shrink-0 hidden sm:block">
                      Utilisé {new Date(k.last_used_at).toLocaleDateString('fr-FR')}
                    </span>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(k.key, k.id)}
                    className="h-7 w-7 p-0 text-slate-400 hover:text-white"
                  >
                    {copied === k.id ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteApiKey(k.id)}
                    className="h-7 w-7 p-0 text-slate-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </motion.div>

      {/* ─── Webhooks ─── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                <Webhook className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Webhooks sortants</h2>
                <p className="text-sm text-slate-500">Recevez les événements de votre flotte en temps réel</p>
              </div>
            </div>
            <Button
              onClick={() => setShowWebhookForm((v) => !v)}
              className="btn-primary gap-2"
            >
              <Plus className="h-4 w-4" />
              Nouveau
            </Button>
          </div>

          {/* Create webhook form */}
          {showWebhookForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 p-4 rounded-xl border border-cyan-500/20 bg-cyan-500/5 space-y-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400">Nom</label>
                  <Input
                    value={newWebhook.name}
                    onChange={(e) => setNewWebhook((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Mon intégration ERP"
                    className="glass-input"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400">URL de destination</label>
                  <Input
                    value={newWebhook.url}
                    onChange={(e) => setNewWebhook((p) => ({ ...p, url: e.target.value }))}
                    placeholder="https://mon-erp.com/webhook"
                    className="glass-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400">Événements à écouter</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_EVENTS.map((ev) => (
                    <button
                      key={ev.value}
                      type="button"
                      onClick={() => toggleWebhookEvent(ev.value)}
                      className={cn(
                        'px-3 py-1 rounded-full text-xs font-medium border transition-all',
                        newWebhook.events.includes(ev.value)
                          ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                          : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-slate-500'
                      )}
                    >
                      {ev.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setShowWebhookForm(false)} className="text-slate-400">
                  Annuler
                </Button>
                <Button
                  onClick={createWebhook}
                  disabled={creatingWebhook || !newWebhook.name || !newWebhook.url || newWebhook.events.length === 0}
                  className="btn-primary"
                >
                  {creatingWebhook ? 'Création…' : 'Créer le webhook'}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Webhooks list */}
          {loading ? (
            <div className="space-y-2">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-20 rounded-lg bg-slate-800/30 animate-pulse" />
              ))}
            </div>
          ) : webhooks.length === 0 ? (
            <p className="text-center text-slate-500 py-6 text-sm">Aucun webhook configuré</p>
          ) : (
            <div className="space-y-3">
              {webhooks.map((wh) => (
                <div
                  key={wh.id}
                  className="p-4 rounded-xl bg-slate-900/40 border border-slate-700/40 group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-white">{wh.name}</p>
                        <span className={cn(
                          'px-2 py-0.5 rounded-full text-xs',
                          wh.is_active
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-slate-500/15 text-slate-400'
                        )}>
                          {wh.is_active ? 'Actif' : 'Inactif'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono truncate">{wh.url}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {wh.events.map((ev) => (
                          <span key={ev} className="px-2 py-0.5 rounded text-xs bg-slate-800/60 text-slate-400 border border-slate-700/50">
                            {ev}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Secret reveal */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setRevealedSecrets((prev) => {
                          const next = new Set(prev);
                          if (next.has(wh.id)) next.delete(wh.id);
                          else next.add(wh.id);
                          return next;
                        })}
                        className="h-7 px-2 text-slate-400 hover:text-white text-xs gap-1"
                      >
                        {revealedSecrets.has(wh.id) ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        Secret
                      </Button>
                      {revealedSecrets.has(wh.id) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(wh.secret, `secret-${wh.id}`)}
                          className="h-7 w-7 p-0 text-slate-400 hover:text-white"
                        >
                          {copied === `secret-${wh.id}` ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteWebhook(wh.id)}
                        className="h-7 w-7 p-0 text-slate-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {revealedSecrets.has(wh.id) && (
                    <div className="mt-2 p-2 rounded bg-slate-950/50 border border-slate-800">
                      <code className="text-xs text-amber-400 font-mono break-all">{wh.secret}</code>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </motion.div>

      {/* Integration guide */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <GlassCard className="p-6">
          <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
            <RefreshCw className="h-4 w-4 text-cyan-400" />
            Vérification de signature
          </h3>
          <p className="text-sm text-slate-400 mb-3">
            Chaque requête webhook inclut le header <code className="text-cyan-400">X-FleetMaster-Signature: sha256=&lt;hmac&gt;</code>.
            Vérifiez-le avec votre secret pour authentifier les appels.
          </p>
          <pre className="text-xs bg-slate-950/60 rounded-lg p-4 border border-slate-800 text-slate-300 overflow-x-auto">{`// Node.js
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}`}</pre>
        </GlassCard>
      </motion.div>
    </div>
  );
}
