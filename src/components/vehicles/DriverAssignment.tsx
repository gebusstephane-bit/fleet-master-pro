'use client';

/**
 * Composant DriverAssignment
 * Affiche et gère l'affectation conducteur-véhicule :
 *   - Conducteur actuel avec badge rôle
 *   - Modale d'affectation
 *   - Historique accordion
 */

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  UserCheck, UserX, ChevronDown, ChevronUp,
  UserPlus, Pencil, CalendarRange,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

import { useVehicleAssignments, useAssignDriver, useUnassignDriver } from '@/hooks/use-assignments';
import { useDrivers } from '@/hooks/use-drivers';
import { DriverAssignment as TDriverAssignment } from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRange(start: string, end: string | null) {
  const s = format(new Date(start), 'd MMM yyyy', { locale: fr });
  const e = end ? format(new Date(end), 'd MMM yyyy', { locale: fr }) : 'en cours';
  return `${s} → ${e}`;
}

function DriverAvatar({ firstName, lastName }: { firstName: string; lastName: string }) {
  return (
    <div className="h-11 w-11 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold text-sm shrink-0">
      {firstName?.[0]}{lastName?.[0]}
    </div>
  );
}

// ─── AssignModal ──────────────────────────────────────────────────────────────

interface AssignModalProps {
  vehicleId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

function AssignModal({ vehicleId, open, onOpenChange }: AssignModalProps) {
  const today = new Date().toISOString().split('T')[0];
  const [driverId, setDriverId] = useState('');
  const [isPrimary, setIsPrimary] = useState(true);
  const [startDate, setStartDate] = useState(today);
  const [notes, setNotes] = useState('');

  const { data: drivers, isLoading: driversLoading } = useDrivers();
  const { mutate: assign, isPending } = useAssignDriver(vehicleId);

  const activeDrivers = drivers?.filter(d => d.status === 'active' || d.is_active) ?? [];

  function handleConfirm() {
    if (!driverId) return;
    assign(
      { vehicle_id: vehicleId, driver_id: driverId, is_primary: isPrimary, start_date: startDate, notes: notes || null },
      {
        onSuccess: () => {
          onOpenChange(false);
          setDriverId('');
          setNotes('');
          setStartDate(today);
          setIsPrimary(true);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Affecter un conducteur</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Sélection conducteur */}
          <div className="space-y-1.5">
            <Label>Conducteur *</Label>
            {driversLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select value={driverId} onValueChange={setDriverId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un conducteur" />
                </SelectTrigger>
                <SelectContent>
                  {activeDrivers.map(d => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.first_name} {d.last_name}
                    </SelectItem>
                  ))}
                  {activeDrivers.length === 0 && (
                    <SelectItem value="__none__" disabled>
                      Aucun conducteur actif
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Rôle */}
          <div className="space-y-1.5">
            <Label>Rôle</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={isPrimary ? 'default' : 'outline'}
                size="sm"
                onClick={() => setIsPrimary(true)}
              >
                Principal
              </Button>
              <Button
                type="button"
                variant={!isPrimary ? 'default' : 'outline'}
                size="sm"
                onClick={() => setIsPrimary(false)}
              >
                Remplaçant
              </Button>
            </div>
          </div>

          {/* Date de début */}
          <div className="space-y-1.5">
            <Label>Date de début *</Label>
            <Input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes (optionnel)</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Motif, remarques..."
              rows={3}
            />
          </div>

          <Button
            className="w-full"
            onClick={handleConfirm}
            disabled={!driverId || isPending}
          >
            {isPending ? 'Affectation en cours...' : 'Confirmer l\'affectation'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── HistoryRow ───────────────────────────────────────────────────────────────

function HistoryRow({ item }: { item: TDriverAssignment }) {
  const { mutate: unassign, isPending } = useUnassignDriver(item.vehicle_id);
  const isActive = item.end_date === null;

  return (
    <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
      <div className="flex items-center gap-3">
        {item.drivers && (
          <DriverAvatar
            firstName={item.drivers.first_name}
            lastName={item.drivers.last_name}
          />
        )}
        <div>
          {item.drivers ? (
            <Link
              href={`/drivers/${item.drivers.id}`}
              className="font-medium text-sm text-white hover:text-blue-400 transition-colors"
            >
              {item.drivers.first_name} {item.drivers.last_name}
            </Link>
          ) : (
            <p className="text-sm text-gray-400">Conducteur supprimé</p>
          )}
          <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
            <CalendarRange className="h-3 w-3" />
            {formatRange(item.start_date, item.end_date)}
          </p>
          {item.notes && (
            <p className="text-xs text-gray-500 mt-0.5 italic">{item.notes}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant={isActive ? 'default' : 'secondary'} className="text-xs">
          {item.is_primary ? 'Principal' : 'Remplaçant'}
        </Badge>
        {isActive && (
          <Button
            variant="ghost"
            size="sm"
            className="text-red-400 hover:text-red-300 h-7 px-2"
            onClick={() => unassign({ assignment_id: item.id })}
            disabled={isPending}
          >
            <UserX className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── DriverAssignment (export principal) ──────────────────────────────────────

interface DriverAssignmentProps {
  vehicleId: string;
}

export function DriverAssignment({ vehicleId }: DriverAssignmentProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const { data: assignments, isLoading } = useVehicleAssignments(vehicleId);

  const current = assignments?.find(a => a.end_date === null && a.is_primary) ?? null;
  const history = assignments?.filter(a => a !== current) ?? [];

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-blue-400" />
              Conducteur attitré
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={() => setModalOpen(true)}
            >
              {current ? (
                <><Pencil className="h-3 w-3" /> Modifier</>
              ) : (
                <><UserPlus className="h-3 w-3" /> Affecter</>
              )}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center gap-3">
              <Skeleton className="h-11 w-11 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ) : current?.drivers ? (
            <Link
              href={`/drivers/${current.drivers.id}`}
              className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-gray-500/20 transition-colors"
            >
              <DriverAvatar
                firstName={current.drivers.first_name}
                lastName={current.drivers.last_name}
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-white truncate">
                  {current.drivers.first_name} {current.drivers.last_name}
                </p>
                {current.drivers.phone && (
                  <p className="text-xs text-gray-400 truncate">{current.drivers.phone}</p>
                )}
              </div>
              <Badge className="text-xs shrink-0 bg-blue-500/20 text-blue-300 border-blue-500/30">
                Principal
              </Badge>
            </Link>
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 text-gray-400">
              <UserX className="h-5 w-5" />
              <span className="text-sm">Aucun conducteur assigné</span>
            </div>
          )}

          {/* Accordion historique */}
          {assignments && assignments.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setHistoryOpen(v => !v)}
                className="flex w-full items-center justify-between text-xs text-gray-400 hover:text-gray-200 transition-colors pt-1"
              >
                <span>Historique ({assignments.length})</span>
                {historyOpen
                  ? <ChevronUp className="h-3.5 w-3.5" />
                  : <ChevronDown className="h-3.5 w-3.5" />
                }
              </button>

              {historyOpen && (
                <div className="mt-2">
                  {assignments.map(a => (
                    <HistoryRow key={a.id} item={a} />
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AssignModal
        vehicleId={vehicleId}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </>
  );
}
