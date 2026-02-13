'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ShieldAlert, 
  ArrowLeft, 
  Home, 
  Lock,
  Users,
  Building2,
  HelpCircle,
  Mail,
  AlertTriangle,
  Shield,
  UserCog
} from 'lucide-react';
import { useUserContext } from '@/components/providers/user-provider';

const roleConfig = {
  ADMIN: { 
    label: 'Administrateur', 
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    icon: Shield,
    description: 'Vous avez accès à toutes les fonctionnalités.'
  },
  DIRECTEUR: { 
    label: 'Directeur', 
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: UserCog,
    description: 'Vous pouvez gérer votre équipe et valider les opérations.'
  },
  AGENT_DE_PARC: { 
    label: 'Agent de parc', 
    color: 'bg-green-100 text-green-700 border-green-200',
    icon: Building2,
    description: 'Vous pouvez effectuer des inspections et gérer les maintenances.'
  },
  EXPLOITANT: { 
    label: 'Exploitant', 
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    icon: Users,
    description: 'Vous pouvez consulter vos tournées et signer les inspections.'
  },
};

export default function UnauthorizedPage() {
  const router = useRouter();
  const { user } = useUserContext();
  
  const userRole = (user?.role || 'EXPLOITANT') as keyof typeof roleConfig;
  const roleInfo = roleConfig[userRole] || roleConfig.EXPLOITANT;
  const RoleIcon = roleInfo.icon;

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <ShieldAlert className="h-10 w-10 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-900">
            Accès non autorisé
          </CardTitle>
          <CardDescription className="text-base mt-2">
            Vous n&apos;avez pas les permissions nécessaires pour accéder à cette page.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Info utilisateur */}
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center border">
                <RoleIcon className="h-6 w-6 text-slate-600" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {user?.first_name} {user?.last_name}
                  </span>
                  <Badge className={roleInfo.color}>
                    {roleInfo.label}
                  </Badge>
                </div>
                <p className="text-sm text-slate-500 mt-1">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* Explication */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Lock className="h-5 w-5 text-slate-400 mt-0.5" />
              <div>
                <h3 className="font-medium text-slate-900">Pourquoi cette restriction ?</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Cette page est réservée aux utilisateurs avec des permissions supérieures. 
                  {roleInfo.description}
                </p>
              </div>
            </div>

            <Separator />

            {/* Accès selon rôle */}
            <div className="space-y-3">
              <h3 className="font-medium text-slate-900 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Vos accès actuels
              </h3>
              
              <div className="grid gap-2 text-sm">
                {userRole === 'ADMIN' && (
                  <>
                    <AccessItem granted>Tableau de bord complet</AccessItem>
                    <AccessItem granted>Gestion des utilisateurs</AccessItem>
                    <AccessItem granted>Configuration entreprise</AccessItem>
                    <AccessItem granted>Toutes les opérations</AccessItem>
                  </>
                )}
                {userRole === 'DIRECTEUR' && (
                  <>
                    <AccessItem granted>Tableau de bord</AccessItem>
                    <AccessItem granted>Gestion de son équipe</AccessItem>
                    <AccessItem granted>Validation maintenances</AccessItem>
                    <AccessItem denied>Configuration système</AccessItem>
                  </>
                )}
                {userRole === 'AGENT_DE_PARC' && (
                  <>
                    <AccessItem granted>Inspections véhicules</AccessItem>
                    <AccessItem granted>Demandes de maintenance</AccessItem>
                    <AccessItem granted>Gestion carburants</AccessItem>
                    <AccessItem denied>Gestion utilisateurs</AccessItem>
                  </>
                )}
                {userRole === 'EXPLOITANT' && (
                  <>
                    <AccessItem granted>Ses tournées</AccessItem>
                    <AccessItem granted>Ses inspections</AccessItem>
                    <AccessItem denied>Gestion flotte</AccessItem>
                    <AccessItem denied>Administration</AccessItem>
                  </>
                )}
              </div>
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>
            <Button asChild className="flex-1">
              <Link href="/dashboard">
                <Home className="h-4 w-4 mr-2" />
                Tableau de bord
              </Link>
            </Button>
          </div>

          {/* Contact admin */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <HelpCircle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-amber-900">Besoin d&apos;accès ?</h4>
                <p className="text-sm text-amber-700 mt-1">
                  Si vous pensez que c&apos;est une erreur ou si vous avez besoin d&apos;accès supplémentaires, 
                  contactez un administrateur.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3 bg-white"
                  asChild
                >
                  <Link href="mailto:admin@fleetmaster.pro">
                    <Mail className="h-4 w-4 mr-2" />
                    Contacter l&apos;administrateur
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AccessItem({ 
  granted, 
  children 
}: { 
  granted: boolean; 
  children: React.ReactNode;
}) {
  return (
    <div className={`flex items-center gap-2 ${granted ? 'text-green-700' : 'text-slate-400'}`}>
      {granted ? (
        <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      ) : (
        <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      )}
      <span>{children}</span>
    </div>
  );
}
