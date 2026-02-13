'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Users, 
  Building2, 
  Bell, 
  Shield, 
  ChevronRight,
  UserCog,
  Mail,
  Key,
  Paintbrush
} from 'lucide-react';
import { useUserContext } from '@/components/providers/user-provider';
import { useUserPermissions, type User } from '@/hooks/use-users';

interface SettingsCard {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  roles: string[];
  badge?: string;
}

export default function SettingsPage() {
  const { user: currentUser } = useUserContext();
  const permissions = useUserPermissions(currentUser as User);
  
  const settingsCards: SettingsCard[] = [
    {
      title: 'Gestion des utilisateurs',
      description: 'Ajouter, modifier et gérer les collaborateurs de votre entreprise',
      icon: <Users className="h-6 w-6 text-purple-600" />,
      href: '/settings/users',
      roles: ['ADMIN', 'DIRECTEUR'],
      badge: permissions.canManageUsers ? 'Accès' : undefined,
    },
    {
      title: 'Entreprise',
      description: 'Informations de votre entreprise, logo, adresse',
      icon: <Building2 className="h-6 w-6 text-blue-600" />,
      href: '/settings/company',
      roles: ['ADMIN', 'DIRECTEUR'],
    },
    {
      title: 'Notifications',
      description: 'Configurer vos alertes email et SMS',
      icon: <Bell className="h-6 w-6 text-green-600" />,
      href: '/settings/notifications',
      roles: ['ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC', 'EXPLOITANT'],
    },
    {
      title: 'Sécurité',
      description: 'Changer votre mot de passe, double authentification',
      icon: <Shield className="h-6 w-6 text-red-600" />,
      href: '/settings/security',
      roles: ['ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC', 'EXPLOITANT'],
    },
    {
      title: 'Mon profil',
      description: 'Modifier vos informations personnelles',
      icon: <UserCog className="h-6 w-6 text-slate-600" />,
      href: currentUser?.id ? `/settings/users/${currentUser.id}/edit` : '/settings/profile',
      roles: ['ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC', 'EXPLOITANT'],
    },
    {
      title: 'Intégrations',
      description: 'Connecter des services externes (API, webhooks)',
      icon: <Key className="h-6 w-6 text-amber-600" />,
      href: '/settings/integrations',
      roles: ['ADMIN'],
    },
    {
      title: 'Personnalisation',
      description: 'Thème, langue, format des dates',
      icon: <Paintbrush className="h-6 w-6 text-pink-600" />,
      href: '/settings/appearance',
      roles: ['ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC', 'EXPLOITANT'],
    },
    {
      title: 'Emails',
      description: 'Templates et configuration des emails',
      icon: <Mail className="h-6 w-6 text-indigo-600" />,
      href: '/settings/emails',
      roles: ['ADMIN'],
    },
  ];
  
  // Filtrer les cartes selon le rôle
  const accessibleCards = settingsCards.filter(card => 
    card.roles.includes(currentUser?.role || 'EXPLOITANT')
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Paramètres</h1>
        <p className="text-muted-foreground">Configuration de votre compte et entreprise</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {accessibleCards.map((card) => (
          <Link key={card.href} href={card.href}>
            <Card className="h-full hover:shadow-md transition-shadow cursor-pointer group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="p-2 bg-slate-100 rounded-lg">
                    {card.icon}
                  </div>
                  {card.badge && (
                    <span className="text-xs font-medium px-2 py-1 bg-green-100 text-green-700 rounded-full">
                      {card.badge}
                    </span>
                  )}
                </div>
                <CardTitle className="text-lg mt-3">{card.title}</CardTitle>
                <CardDescription>{card.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center text-sm text-muted-foreground group-hover:text-primary transition-colors">
                  <span>Configurer</span>
                  <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Info rôle */}
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="p-4">
          <p className="text-sm text-slate-600">
            <strong>Votre rôle :</strong>{' '}
            {currentUser?.role === 'ADMIN' && 'Administrateur - Accès complet'}
            {currentUser?.role === 'DIRECTEUR' && 'Directeur - Gestion opérationnelle'}
            {currentUser?.role === 'AGENT_DE_PARC' && 'Agent de parc - Opérations terrain'}
            {currentUser?.role === 'EXPLOITANT' && 'Exploitant - Chauffeur / Opérateur'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
