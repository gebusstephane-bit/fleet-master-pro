'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUserContext } from '@/components/providers/user-provider';
import { 
  ArrowLeft, 
  User, 
  Camera, 
  Mail, 
  Phone, 
  Save, 
  Building2, 
  Shield, 
  Trash2, 
  AlertTriangle,
  X,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { updateUser } from '@/actions/users';
import { deleteAccount } from '@/actions/account/delete-account';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ProfilePage() {
  const { user } = useUserContext();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [formData, setFormData] = useState({
    firstName: user?.first_name || 'Admin',
    lastName: user?.last_name || 'User',
    email: user?.email || 'gebus.stephane@gmail.com',
    phone: '07 68 48 85 02',
    jobTitle: 'Directeur',
    department: 'Management',
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const result = await updateUser(
        {
          user_id: user.id,
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone: formData.phone,
        },
        user.id
      );
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Profil mis à jour avec succès');
        
      }
    } catch (err) {
      toast.error('Erreur lors de la mise à jour du profil');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user?.id) return;
    
    if (deleteConfirmation !== 'SUPPRIMER') {
      toast.error('Vous devez saisir SUPPRIMER pour confirmer');
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deleteAccount({ 
        confirmation: 'SUPPRIMER',
        reason: 'Demande utilisateur via interface web'
      });

      if (result?.success) {
        toast.success(result.message || 'Compte supprimé avec succès');
        // Déconnexion via API puis redirection
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/login?deleted=true';
      } else {
        throw new Error(result.error || 'Erreur lors de la suppression');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la suppression du compte');
      setIsDeleting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Profil</h1>
          <p className="text-muted-foreground">Vos informations personnelles</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Photo de profil
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="h-24 w-24 rounded-full bg-slate-200 flex items-center justify-center text-2xl font-bold text-slate-600">
                {formData.firstName.charAt(0)}{formData.lastName.charAt(0)}
              </div>
              <Button
                variant="outline"
                size="icon"
                className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="h-4 w-4" />
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
              />
            </div>
            <div>
              <p className="font-medium">{formData.firstName} {formData.lastName}</p>
              <p className="text-sm text-muted-foreground">{user?.role || 'ADMIN'}</p>
              <p className="text-sm text-muted-foreground">Transport Stéphane</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informations personnelles
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prénom</Label>
                <Input
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Nom</Label>
                <Input
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Téléphone
              </Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Poste
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Fonction</Label>
              <Input
                value={formData.jobTitle}
                onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Département</Label>
              <Input
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Rôle
              </Label>
              <Input value={user?.role || 'ADMIN'} disabled className="bg-slate-50" />
            </div>
          </CardContent>
        </Card>

        {/* Section Danger - Suppression de compte */}
        <Card className="border-red-500/20 bg-red-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Zone de danger
            </CardTitle>
            <CardDescription className="text-red-300/70">
              Ces actions sont irréversibles. Procédez avec prudence.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-[#0f172a]/50 rounded-lg border border-red-500/10">
              <div className="space-y-1">
                <h4 className="font-medium text-red-200">Supprimer mon compte</h4>
                <p className="text-sm text-red-300/60">
                  Supprime définitivement votre compte et toutes vos données. 
                  Cette action est irréversible (Article 17 RGPD).
                </p>
              </div>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                className="flex-shrink-0"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" className="flex-1" disabled={isLoading}>
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
          <Button variant="outline" asChild>
            <Link href="/settings">Annuler</Link>
          </Button>
        </div>
      </form>

      {/* Dialog de confirmation de suppression */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md border-red-500/20">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-5 w-5" />
              Confirmer la suppression
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Cette action supprimera définitivement votre compte, votre entreprise, 
              tous vos véhicules, chauffeurs et données associées. Cette action est 
              <strong className="text-red-400"> irréversible</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert className="bg-red-500/10 border-red-500/20">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-200 text-sm">
                <strong>Attention :</strong> Votre abonnement Stripe sera immédiatement annulé. 
                Aucun remboursement ne sera effectué pour la période en cours.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="confirm-delete" className="text-sm font-medium text-slate-300">
                Pour confirmer, saisissez <span className="text-red-400 font-mono">SUPPRIMER</span> :
              </Label>
              <Input
                id="confirm-delete"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="SUPPRIMER"
                className="border-red-500/30 focus:border-red-500/50"
                autoComplete="off"
              />
            </div>

            <div className="text-xs text-slate-500 space-y-1">
              <p>Données qui seront supprimées :</p>
              <ul className="list-disc list-inside ml-2 space-y-0.5">
                <li>Profil utilisateur et authentification</li>
                <li>Informations de l&apos;entreprise</li>
                <li>Véhicules, chauffeurs, maintenances</li>
                <li>Documents et fichiers associés</li>
                <li>Historique et logs d&apos;activité</li>
              </ul>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setDeleteConfirmation('');
              }}
              disabled={isDeleting}
            >
              <X className="h-4 w-4 mr-2" />
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleteConfirmation !== 'SUPPRIMER' || isDeleting}
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isDeleting ? 'Suppression...' : 'Supprimer définitivement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
