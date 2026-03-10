'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  Loader2,
  ClipboardCheck,
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getSupabaseClient } from '@/lib/supabase/client';
import {
  createChecklist,
  updateChecklistItem,
  completeChecklist,
  type ChecklistItem,
} from '@/actions/driver-checklist';

// ============================================================================
// PAGE CHECKLIST DÉPART — MOBILE-FIRST
// ============================================================================

interface ChecklistData {
  id: string;
  vehicle_id: string;
  status: string;
  items: ChecklistItem[];
  notes: string | null;
}

export default function ChecklistPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checklist, setChecklist] = useState<ChecklistData | null>(null);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [finalNotes, setFinalNotes] = useState('');
  const [vehicleId, setVehicleId] = useState<string | null>(null);

  // Récupérer le véhicule du chauffeur et la checklist en cours
  useEffect(() => {
    async function init() {
      try {
        const supabase = getSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { router.push('/login'); return; }

        // Récupérer le véhicule assigné
        const { data: driver } = await supabase
          .from('drivers')
          .select('id, current_vehicle_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!driver?.current_vehicle_id) {
          toast.error('Aucun véhicule assigné');
          router.push('/driver-app');
          return;
        }

        setVehicleId(driver.current_vehicle_id);

        // Chercher une checklist EN_COURS pour ce véhicule
        // @ts-ignore - Table driver_checklists non typée dans Database
        const { data: existing } = await supabase
          .from('driver_checklists' as never)
          .select('*')
          .eq('driver_id', user.id)
          .eq('vehicle_id', driver.current_vehicle_id)
          .eq('status', 'EN_COURS')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existing) {
          const checklistData = existing as unknown as ChecklistData;
          setChecklist(checklistData);
          setItems(checklistData.items as ChecklistItem[]);
        } else {
          // Créer une nouvelle checklist
          const result = await createChecklist(driver.current_vehicle_id, 'DEPART');
          if (!result.success || !result.data) {
            toast.error(result.error || 'Impossible de créer la checklist');
            router.push('/driver-app');
            return;
          }
          const newChecklist = result.data as ChecklistData;
          setChecklist(newChecklist);
          setItems(newChecklist.items as ChecklistItem[]);
        }
      } catch (err) {
        toast.error('Erreur lors du chargement');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [router]);

  const handleToggleItem = useCallback(async (itemId: string) => {
    if (!checklist) return;

    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    const newChecked = !item.checked;

    // Optimistic update
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, checked: newChecked } : i))
    );

    const result = await updateChecklistItem(checklist.id, itemId, newChecked, item.comment);
    if (!result.success) {
      // Rollback
      setItems((prev) =>
        prev.map((i) => (i.id === itemId ? { ...i, checked: item.checked } : i))
      );
      toast.error(result.error || 'Erreur de mise à jour');
    }
  }, [checklist, items]);

  const handleCommentChange = useCallback(async (itemId: string, comment: string) => {
    if (!checklist) return;

    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, comment } : i))
    );

    await updateChecklistItem(checklist.id, itemId, item.checked, comment);
  }, [checklist, items]);

  const toggleComment = (itemId: string) => {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) { next.delete(itemId); } else { next.add(itemId); }
      return next;
    });
  };

  const allChecked = items.length > 0 && items.every((i) => i.checked);

  const handleComplete = async () => {
    if (!checklist || !allChecked) return;
    setSubmitting(true);
    try {
      const result = await completeChecklist(checklist.id, finalNotes);
      if (!result.success) {
        toast.error(result.error || 'Erreur lors de la validation');
        return;
      }
      toast.success('Checklist validée ! Bonne route.');
      router.push('/driver-app');
    } catch {
      toast.error('Erreur lors de la validation');
    } finally {
      setSubmitting(false);
    }
  };

  // Grouper les items par catégorie
  const categories = Array.from(new Set(items.map((i) => i.category)));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  const checkedCount = items.filter((i) => i.checked).length;
  const progress = items.length > 0 ? Math.round((checkedCount / items.length) * 100) : 0;

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" asChild>
          <Link href="/driver-app">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-white">Checklist départ</h1>
          <p className="text-xs text-slate-400">{checkedCount}/{items.length} items vérifiés</p>
        </div>
      </div>

      {/* Barre de progression */}
      <div className="w-full bg-slate-700 rounded-full h-2">
        <div
          className={cn(
            'h-2 rounded-full transition-all duration-300',
            progress === 100 ? 'bg-green-500' : 'bg-blue-500'
          )}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Items groupés par catégorie */}
      {categories.map((category) => {
        const categoryItems = items.filter((i) => i.category === category);
        const allCategoryChecked = categoryItems.every((i) => i.checked);

        return (
          <Card key={category} className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm flex items-center gap-2">
                {allCategoryChecked ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-slate-500 shrink-0" />
                )}
                {category}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {categoryItems.map((item) => {
                const hasComment = expandedComments.has(item.id);

                return (
                  <div key={item.id} className="space-y-2">
                    {/* Item row */}
                    <div
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-xl border transition-all',
                        item.checked
                          ? 'bg-green-500/10 border-green-500/30'
                          : 'bg-slate-900/50 border-slate-700'
                      )}
                    >
                      {/* Toggle checkbox — grand pour mobile */}
                      <button
                        type="button"
                        onClick={() => handleToggleItem(item.id)}
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0"
                        aria-label={item.checked ? 'Décocher' : 'Cocher'}
                      >
                        {item.checked ? (
                          <CheckCircle2 className="h-7 w-7 text-green-500" />
                        ) : (
                          <Circle className="h-7 w-7 text-slate-500" />
                        )}
                      </button>

                      {/* Label */}
                      <span className={cn(
                        'flex-1 text-sm font-medium leading-snug',
                        item.checked ? 'text-green-300' : 'text-white'
                      )}>
                        {item.label}
                      </span>

                      {/* Bouton commentaire si anomalie */}
                      <button
                        type="button"
                        onClick={() => toggleComment(item.id)}
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0 text-slate-400 hover:text-amber-400 transition-colors"
                        aria-label="Ajouter un commentaire"
                      >
                        {item.comment ? (
                          <AlertTriangle className="h-4 w-4 text-amber-400" />
                        ) : hasComment ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    {/* Zone commentaire si anomalie */}
                    {hasComment && (
                      <Textarea
                        placeholder="Décrire l'anomalie constatée..."
                        value={item.comment}
                        onChange={(e) => handleCommentChange(item.id, e.target.value)}
                        className="bg-slate-900/50 border-amber-500/30 text-sm resize-none min-h-[80px] focus:border-amber-500"
                        rows={3}
                      />
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

      {/* Notes finales (affichées quand tout est coché) */}
      {allChecked && (
        <Card className="bg-green-500/10 border-green-500/30">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <p className="font-medium text-green-300">Tous les items sont vérifiés !</p>
            </div>
            <Textarea
              placeholder="Observations générales (optionnel)..."
              value={finalNotes}
              onChange={(e) => setFinalNotes(e.target.value)}
              className="bg-slate-900/50 border-slate-700 resize-none"
              rows={3}
            />
          </CardContent>
        </Card>
      )}

      {/* Bouton Valider — fixé en bas */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/95 border-t border-slate-800">
        <Button
          onClick={handleComplete}
          disabled={!allChecked || submitting}
          className={cn(
            'w-full h-14 text-base font-semibold transition-all',
            allChecked
              ? 'bg-green-600 hover:bg-green-500 text-white'
              : 'bg-slate-700 text-slate-500 cursor-not-allowed'
          )}
        >
          {submitting ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Validation en cours...
            </>
          ) : (
            <>
              <ClipboardCheck className="h-5 w-5 mr-2" />
              {allChecked ? 'Valider la checklist' : `${items.length - checkedCount} item(s) restant(s)`}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
