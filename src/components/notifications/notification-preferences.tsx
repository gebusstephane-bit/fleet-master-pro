/**
 * Préférences de notification utilisateur
 * Quels types de notifications, quels canaux
 */

'use client';

import { useState } from 'react';
import { Bell, Mail, Smartphone, Monitor } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useNotificationPreferences, useUpdateNotificationPreferences } from '@/hooks/use-notifications';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const notificationTypes = [
  {
    key: 'maintenance_due',
    label: 'Maintenance prévue',
    description: 'Rappels avant les maintenances (7j, 3j, 1j)',
  },
  {
    key: 'document_expiring',
    label: 'Documents expirants',
    description: 'Permis, assurances, contrôles techniques',
  },
  {
    key: 'fuel_anomaly',
    label: 'Anomalies carburant',
    description: 'Consommation anormale détectée',
  },
  {
    key: 'geofencing',
    label: 'Géolocalisation',
    description: 'Entrée/sortie de zones définies',
  },
  {
    key: 'alert_critical',
    label: 'Alertes critiques',
    description: 'Problèmes nécessitant attention immédiate',
  },
  {
    key: 'alert_warning',
    label: 'Alertes avertissement',
    description: 'Problèmes mineurs et rappels',
  },
];

export function NotificationPreferences() {
  const { data: preferences, isLoading } = useNotificationPreferences();
  const updatePreferences = useUpdateNotificationPreferences();
  const [localChanges, setLocalChanges] = useState<Record<string, boolean>>({});

  const handleToggle = (key: string, value: boolean) => {
    setLocalChanges((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    updatePreferences.mutate(localChanges, {
      onSuccess: () => {
        toast.success('Préférences enregistrées');
        setLocalChanges({});
      },
      onError: () => {
        toast.error('Erreur lors de l\'enregistrement');
      },
    });
  };

  const getValue = (key: string): boolean => {
    if (key in localChanges) return localChanges[key];
    return (preferences as Record<string, boolean> | undefined)?.[key] ?? true;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Canaux globaux */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Canaux de notification
          </CardTitle>
          <CardDescription>
            Activez ou désactivez les canaux de communication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-slate-500" />
              <div>
                <Label htmlFor="email_enabled" className="font-medium">Email</Label>
                <p className="text-sm text-slate-500">Maximum 10 emails par 24h</p>
              </div>
            </div>
            <Switch
              id="email_enabled"
              checked={getValue('email_enabled')}
              onCheckedChange={(v) => handleToggle('email_enabled', v)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-slate-500" />
              <div>
                <Label htmlFor="push_enabled" className="font-medium">Push mobile</Label>
                <p className="text-sm text-slate-500">Notifications sur téléphone</p>
              </div>
            </div>
            <Switch
              id="push_enabled"
              checked={getValue('push_enabled')}
              onCheckedChange={(v) => handleToggle('push_enabled', v)}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Monitor className="h-5 w-5 text-slate-500" />
              <div>
                <Label htmlFor="in_app_enabled" className="font-medium">In-app</Label>
                <p className="text-sm text-slate-500">Notifications dans l&apos;application</p>
              </div>
            </div>
            <Switch
              id="in_app_enabled"
              checked={getValue('in_app_enabled')}
              onCheckedChange={(v) => handleToggle('in_app_enabled', v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Préférences par type */}
      <Card>
        <CardHeader>
          <CardTitle>Types de notifications</CardTitle>
          <CardDescription>
            Choisissez quels types d&apos;événements vous souhaitent être notifiés
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {notificationTypes.map((type) => (
            <div key={type.key} className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">{type.label}</h4>
                  <p className="text-sm text-slate-500">{type.description}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 pl-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id={`${type.key}_email`}
                    checked={getValue(`${type.key}_email`)}
                    onCheckedChange={(v) => handleToggle(`${type.key}_email`, v)}
                    disabled={!getValue('email_enabled')}
                  />
                  <Label htmlFor={`${type.key}_email`} className="text-sm">Email</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id={`${type.key}_push`}
                    checked={getValue(`${type.key}_push`)}
                    onCheckedChange={(v) => handleToggle(`${type.key}_push`, v)}
                    disabled={!getValue('push_enabled')}
                  />
                  <Label htmlFor={`${type.key}_push`} className="text-sm">Push</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id={`${type.key}_in_app`}
                    checked={getValue(`${type.key}_in_app`)}
                    onCheckedChange={(v) => handleToggle(`${type.key}_in_app`, v)}
                    disabled={!getValue('in_app_enabled')}
                  />
                  <Label htmlFor={`${type.key}_in_app`} className="text-sm">In-app</Label>
                </div>
              </div>
              
              <Separator />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Bouton sauvegarder */}
      {Object.keys(localChanges).length > 0 && (
        <div className="flex justify-end">
          <Button 
            onClick={handleSave}
            disabled={updatePreferences.isPending}
          >
            {updatePreferences.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enregistrement...
              </>
            ) : (
              'Enregistrer les modifications'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
