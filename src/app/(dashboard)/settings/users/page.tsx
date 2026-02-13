'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  UserX,
  UserCheck,
  Trash2,
  Shield,
  CheckCircle2,
  XCircle,
  Users,
  UserCog,
  Building2,
  AlertTriangle
} from 'lucide-react';
import { useUserContext } from '@/components/providers/user-provider';
import { useUsers, useUserPermissions, useToggleUserStatus, useDeleteUser, type User } from '@/hooks/use-users';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const roleConfig = {
  ADMIN: { 
    color: 'bg-purple-100 text-purple-700 border-purple-200', 
    label: 'Administrateur',
    icon: Shield
  },
  DIRECTEUR: { 
    color: 'bg-blue-100 text-blue-700 border-blue-200', 
    label: 'Directeur',
    icon: UserCog
  },
  AGENT_DE_PARC: { 
    color: 'bg-green-100 text-green-700 border-green-200', 
    label: 'Agent de parc',
    icon: Building2
  },
  EXPLOITANT: { 
    color: 'bg-gray-100 text-gray-700 border-gray-200', 
    label: 'Exploitant',
    icon: Users
  },
};

function RoleBadge({ role }: { role: string }) {
  const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.EXPLOITANT;
  const Icon = config.icon;
  
  return (
    <Badge variant="outline" className={config.color}>
      <Icon className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  );
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return isActive ? (
    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
      <CheckCircle2 className="w-3 h-3 mr-1" />
      Actif
    </Badge>
  ) : (
    <Badge variant="secondary" className="text-gray-600 bg-gray-100 border-gray-200">
      <XCircle className="w-3 h-3 mr-1" />
      Inactif
    </Badge>
  );
}

export default function UsersManagementPage() {
  const { user: currentUser } = useUserContext();
  const { data: users, isLoading, refetch } = useUsers(currentUser?.company_id);
  const { toggle } = useToggleUserStatus();
  const { remove } = useDeleteUser();
  const permissions = useUserPermissions(currentUser as User);
  
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [deleting, setDeleting] = useState<string | null>(null);

  // Vérifier permissions
  if (!permissions.canManageUsers) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
        <h1 className="text-xl font-semibold">Accès non autorisé</h1>
        <p className="text-gray-500 mt-2">
          Seuls les administrateurs et directeurs peuvent gérer les utilisateurs.
        </p>
        <Button asChild className="mt-4">
          <Link href="/dashboard">Retour au tableau de bord</Link>
        </Button>
      </div>
    );
  }

  const filteredUsers = users?.filter((user) => {
    const matchesSearch = 
      user.first_name?.toLowerCase().includes(search.toLowerCase()) ||
      user.last_name?.toLowerCase().includes(search.toLowerCase()) ||
      user.email?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  }) || [];

  const stats = {
    total: users?.length || 0,
    admins: users?.filter(u => u.role === 'ADMIN').length || 0,
    directeurs: users?.filter(u => u.role === 'DIRECTEUR').length || 0,
    agents: users?.filter(u => u.role === 'AGENT_DE_PARC').length || 0,
    exploitants: users?.filter(u => u.role === 'EXPLOITANT').length || 0,
    active: users?.filter(u => u.is_active).length || 0,
    inactive: users?.filter(u => !u.is_active).length || 0,
  };

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    if (!currentUser?.id) return;
    
    const result = await toggle(userId, !currentStatus, currentUser.id);
    if (result.success) {
      refetch();
    }
  };

  const handleDelete = async (userId: string) => {
    if (!currentUser?.id) return;
    if (!confirm('Êtes-vous sûr de vouloir supprimer définitivement cet utilisateur ?')) return;
    
    setDeleting(userId);
    const result = await remove(userId, currentUser.id);
    if (result.success) {
      refetch();
    }
    setDeleting(null);
  };

  if (isLoading) {
    return <UsersSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestion des utilisateurs</h1>
          <p className="text-muted-foreground mt-1">
            Gérez les collaborateurs de votre entreprise
          </p>
        </div>
        {permissions.canCreateUsers && (
          <Button asChild>
            <Link href="/settings/users/new">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un utilisateur
            </Link>
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total</CardDescription>
            <CardTitle className="text-2xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Admins</CardDescription>
            <CardTitle className="text-2xl text-purple-600">{stats.admins}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Directeurs</CardDescription>
            <CardTitle className="text-2xl text-blue-600">{stats.directeurs}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Agents</CardDescription>
            <CardTitle className="text-2xl text-green-600">{stats.agents}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Actifs</CardDescription>
            <CardTitle className="text-2xl text-emerald-600">{stats.active}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Inactifs</CardDescription>
            <CardTitle className="text-2xl text-gray-500">{stats.inactive}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom ou email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button 
                variant={roleFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRoleFilter('all')}
              >
                Tous
              </Button>
              <Button 
                variant={roleFilter === 'ADMIN' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRoleFilter('ADMIN')}
                className={roleFilter === 'ADMIN' ? 'bg-purple-600' : ''}
              >
                Admins
              </Button>
              <Button 
                variant={roleFilter === 'DIRECTEUR' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRoleFilter('DIRECTEUR')}
                className={roleFilter === 'DIRECTEUR' ? 'bg-blue-600' : ''}
              >
                Directeurs
              </Button>
              <Button 
                variant={roleFilter === 'AGENT_DE_PARC' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRoleFilter('AGENT_DE_PARC')}
                className={roleFilter === 'AGENT_DE_PARC' ? 'bg-green-600' : ''}
              >
                Agents
              </Button>
              <Button 
                variant={roleFilter === 'EXPLOITANT' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setRoleFilter('EXPLOITANT')}
              >
                Exploitants
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tableau */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Utilisateur</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead>Téléphone</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Dernière connexion</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Aucun utilisateur trouvé
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-slate-100 text-slate-700">
                          {user.first_name?.[0]}{user.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {user.first_name} {user.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <RoleBadge role={user.role} />
                  </TableCell>
                  <TableCell>{user.phone || '-'}</TableCell>
                  <TableCell>
                    <StatusBadge isActive={user.is_active} />
                  </TableCell>
                  <TableCell>
                    {user.last_login 
                      ? formatDistanceToNow(new Date(user.last_login), { addSuffix: true, locale: fr })
                      : 'Jamais'
                    }
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {permissions.canEditUsers && (
                          <DropdownMenuItem asChild>
                            <Link href={`/settings/users/${user.id}/edit`}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Modifier
                            </Link>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleToggleStatus(user.id, user.is_active)}
                          className={user.is_active ? "text-amber-600" : "text-green-600"}
                          disabled={user.id === currentUser?.id}
                        >
                          {user.is_active ? (
                            <>
                              <UserX className="w-4 h-4 mr-2" />
                              Désactiver
                            </>
                          ) : (
                            <>
                              <UserCheck className="w-4 h-4 mr-2" />
                              Activer
                            </>
                          )}
                        </DropdownMenuItem>
                        {permissions.canDeleteUsers && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDelete(user.id)}
                              className="text-red-600"
                              disabled={deleting === user.id || user.id === currentUser?.id}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              {deleting === user.id ? 'Suppression...' : 'Supprimer'}
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function UsersSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="grid gap-4 md:grid-cols-6">
        {Array(6).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-16" />
      <Skeleton className="h-96" />
    </div>
  );
}
