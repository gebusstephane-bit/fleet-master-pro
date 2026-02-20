'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Bell, Mail, AlertTriangle, Loader2, CheckCircle2, XCircle, BellOff } from 'lucide-react';
import { usePushNotifications } from '@/hooks/use-push-notifications';

export default function NotificationsPage() {
  const {
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    isSupported,
  } = usePushNotifications();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">Choisissez ce que vous voulez recevoir</p>
        </div>
      </div>

      {/* Notifications email */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Notifications email
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">Maintenances</p>
              <p className="text-sm text-muted-foreground">Nouvelles demandes et validations</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">Inspections</p>
              <p className="text-sm text-muted-foreground">Contrôles terminés avec anomalies</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">Tournées</p>
              <p className="text-sm text-muted-foreground">Assignations et modifications</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">Documents expirants</p>
              <p className="text-sm text-muted-foreground">Alertes avant expiration</p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      {/* Notifications push */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications push
          </CardTitle>
          <CardDescription>
            Recevez des alertes en temps réel sur ce navigateur, même quand FleetMaster est en arrière-plan.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isSupported ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
              <BellOff className="h-5 w-5 text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Votre navigateur ne supporte pas les notifications push. Essayez Chrome, Firefox ou Edge.
              </p>
            </div>
          ) : (
            <>
              {/* Activation principale */}
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium">Activer sur ce navigateur</p>
                  <p className="text-sm text-muted-foreground">
                    {isSubscribed
                      ? 'Notifications push activées sur cet appareil'
                      : permission === 'denied'
                      ? 'Permission refusée — modifiez-la dans les paramètres du navigateur'
                      : 'Cliquez pour activer les notifications push'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {isSubscribed ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : permission === 'denied' ? (
                    <XCircle className="h-5 w-5 text-red-500" />
                  ) : null}

                  {isSubscribed ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={unsubscribe}
                      disabled={isLoading}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                    >
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Désactiver'}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={subscribe}
                      disabled={isLoading || permission === 'denied'}
                      className="bg-blue-600 hover:bg-blue-500"
                    >
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Activer'}
                    </Button>
                  )}
                </div>
              </div>

              {/* Erreur */}
              {error && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                  <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              )}

              {/* Aide si permission refusée */}
              {permission === 'denied' && (
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border text-sm text-muted-foreground">
                  Pour réactiver : cliquez sur l&apos;icône 🔒 dans la barre d&apos;adresse →{' '}
                  <strong>Notifications</strong> → <strong>Autoriser</strong>, puis rechargez la page.
                </div>
              )}

              <Separator />

              <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide pt-1">
                Événements notifiés
              </p>

              {[
                { label: 'Panne ou incident véhicule', desc: 'Statut "En panne" détecté' },
                { label: 'Demande de maintenance urgente', desc: 'Priorité haute ou critique' },
                { label: 'Document expiré', desc: 'CT, assurance, tachygraphe' },
                { label: 'Tournée non assignée', desc: 'Départ dans moins de 2h' },
              ].map(({ label, desc }, i, arr) => (
                <div key={label}>
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <p className="font-medium">{label}</p>
                      <p className="text-sm text-muted-foreground">{desc}</p>
                    </div>
                    <Switch defaultChecked disabled={!isSubscribed} />
                  </div>
                  {i < arr.length - 1 && <Separator />}
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card>

      {/* Alertes critiques */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Alertes critiques
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">Priorité critique uniquement</p>
              <p className="text-sm text-muted-foreground">Limiter aux alertes importantes</p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
