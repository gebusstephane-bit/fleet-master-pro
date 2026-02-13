/**
 * Paramètres SuperAdmin
 * Configuration de la plateforme
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Shield, Mail, Database } from 'lucide-react';

export const metadata = {
  title: 'Paramètres | SuperAdmin',
};

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Paramètres</h1>
        <p className="text-white/50 mt-1">Configuration de la plateforme Fleet Master Pro</p>
      </div>

      <div className="grid gap-6">
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Shield className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <CardTitle className="text-white">Compte SuperAdmin</CardTitle>
                <CardDescription className="text-white/50">
                  Informations de connexion administrateur
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label className="text-white/70">Email</Label>
              <Input
                value="contact@fleet-master.fr"
                disabled
                className="bg-white/5 border-white/10 text-white"
              />
              <p className="text-xs text-white/40">Email hardcoded - Ne peut pas être modifié</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-white">Notifications Email</CardTitle>
                <CardDescription className="text-white/50">
                  Configuration des alertes email
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">Nouveaux inscrits</p>
                <p className="text-xs text-white/40">Recevoir un email à chaque inscription</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">Nouveaux tickets support</p>
                <p className="text-xs text-white/40">Alerte lors d&apos;un nouveau ticket</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">Paiements échoués</p>
                <p className="text-xs text-white/40">Notification en cas d&apos;échec de paiement</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <Database className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <CardTitle className="text-white">Maintenance</CardTitle>
                <CardDescription className="text-white/50">
                  Mode maintenance et outils système
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white">Mode maintenance</p>
                <p className="text-xs text-white/40">Rendre le site inaccessible aux utilisateurs</p>
              </div>
              <Switch />
            </div>
            <div className="pt-4 border-t border-white/10 flex gap-4">
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                Vider le cache
              </Button>
              <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                Synchroniser Stripe
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
