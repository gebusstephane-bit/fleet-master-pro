/**
 * Quick Actions - Dashboard Production
 * Boutons d'accès rapide aux actions principales
 */

'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Plus, 
  Route, 
  ClipboardCheck, 
  Wrench,
  Car,
  Users
} from 'lucide-react';
import Link from 'next/link';

const actions = [
  {
    label: 'Nouveau véhicule',
    href: '/vehicles/new',
    icon: Car,
    variant: 'default' as const,
    color: 'bg-blue-600 hover:bg-blue-700',
  },
  {
    label: 'Nouvelle tournée',
    href: '/routes/new',
    icon: Route,
    variant: 'outline' as const,
    color: '',
  },
  {
    label: 'Nouvelle inspection',
    href: '/inspections/new',
    icon: ClipboardCheck,
    variant: 'outline' as const,
    color: '',
  },
  {
    label: 'Planifier maintenance',
    href: '/maintenance/new',
    icon: Wrench,
    variant: 'outline' as const,
    color: '',
  },
  {
    label: 'Ajouter chauffeur',
    href: '/drivers/new',
    icon: Users,
    variant: 'outline' as const,
    color: '',
  },
];

export function QuickActions() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">
          Actions rapides
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <Link key={action.href} href={action.href}>
              <Button 
                variant={action.variant}
                size="sm"
                className={action.color}
              >
                <action.icon className="h-4 w-4 mr-2" />
                {action.label}
              </Button>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
