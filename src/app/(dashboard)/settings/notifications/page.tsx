'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useUserContext } from '@/components/providers/user-provider';
import { ArrowLeft, Bell, Mail, MessageSquare, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function NotificationsPage() {
  const { user } = useUserContext();

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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Notifications push
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium">Activer les notifications push</p>
              <p className="text-sm text-muted-foreground">Dans le navigateur</p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>

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
              <p className="font-medium">Problèmes critiques uniquement</p>
              <p className="text-sm text-muted-foreground">Limiter aux alertes importantes</p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
