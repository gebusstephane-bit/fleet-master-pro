'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Bell, 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  Wrench,
  FileText,
  X
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// ============================================================================
// PAGE ALERTES - Interface simplifiée
// ============================================================================

interface Alert {
  id: string;
  title: string;
  message: string;
  type: 'maintenance' | 'document' | 'general';
  priority: 'low' | 'medium' | 'high';
  date: string;
  read: boolean;
}

const mockAlerts: Alert[] = [
  {
    id: '1',
    title: 'Maintenance prévue',
    message: 'Votre véhicule doit passer en maintenance dans 500km',
    type: 'maintenance',
    priority: 'medium',
    date: '2025-03-01T10:00:00Z',
    read: false,
  },
  {
    id: '2',
    title: 'Document expirant',
    message: 'Votre permis expire dans 30 jours',
    type: 'document',
    priority: 'high',
    date: '2025-02-28T14:30:00Z',
    read: false,
  },
  {
    id: '3',
    title: 'Nouvelle fonctionnalité',
    message: 'Découvrez le nouveau système de signalement d\'incidents',
    type: 'general',
    priority: 'low',
    date: '2025-02-25T09:00:00Z',
    read: true,
  },
];

export default function DriverAlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>(mockAlerts);
  
  const unreadCount = alerts.filter(a => !a.read).length;
  
  const markAsRead = (id: string) => {
    setAlerts(prev => prev.map(a => 
      a.id === id ? { ...a, read: true } : a
    ));
  };
  
  const markAllAsRead = () => {
    setAlerts(prev => prev.map(a => ({ ...a, read: true })));
  };
  
  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-10 w-10" asChild>
            <Link href="/driver-app">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-bold text-white">Alertes</h1>
            <p className="text-xs text-slate-400">
              {unreadCount > 0 
                ? `${unreadCount} non lue${unreadCount > 1 ? 's' : ''}` 
                : 'Toutes lues'}
            </p>
          </div>
        </div>
        
        {unreadCount > 0 && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={markAllAsRead}
            className="text-slate-400 hover:text-white"
          >
            Tout lire
          </Button>
        )}
      </div>
      
      {/* Liste des alertes */}
      <div className="space-y-3">
        {alerts.map((alert) => (
          <AlertCard 
            key={alert.id} 
            alert={alert} 
            onMarkAsRead={() => markAsRead(alert.id)}
          />
        ))}
      </div>
      
      {alerts.length === 0 && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="py-12 text-center">
            <Bell className="h-12 w-12 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400">Aucune alerte</p>
            <p className="text-xs text-slate-500 mt-1">
              Vous serez notifié des maintenances et documents à venir
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// SOUS-COMPOSANTS
// ============================================================================

function AlertCard({ alert, onMarkAsRead }: { alert: Alert; onMarkAsRead: () => void }) {
  const icons = {
    maintenance: Wrench,
    document: FileText,
    general: Info,
  };
  
  const colors = {
    high: 'border-red-500/30 bg-red-500/10',
    medium: 'border-amber-500/30 bg-amber-500/10',
    low: 'border-blue-500/30 bg-blue-500/10',
  };
  
  const iconColors = {
    high: 'text-red-400',
    medium: 'text-amber-400',
    low: 'text-blue-400',
  };
  
  const Icon = icons[alert.type];
  
  return (
    <Card className={cn(
      'border transition-all',
      colors[alert.priority],
      !alert.read && 'ring-1 ring-offset-0 ring-offset-[#0a0f1a]',
      alert.priority === 'high' && !alert.read && 'ring-red-500/30',
      alert.priority === 'medium' && !alert.read && 'ring-amber-500/30',
      alert.priority === 'low' && !alert.read && 'ring-blue-500/30',
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn('p-2 rounded-lg bg-slate-900/50 shrink-0', iconColors[alert.priority])}>
            <Icon className="h-5 w-5" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className={cn(
                  'font-medium text-sm',
                  !alert.read ? 'text-white' : 'text-slate-300'
                )}>
                  {alert.title}
                </p>
                <p className="text-xs text-slate-400 mt-1">{alert.message}</p>
              </div>
              
              {!alert.read && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 text-slate-500 hover:text-white"
                  onClick={onMarkAsRead}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-slate-500">
                {format(new Date(alert.date), 'dd MMM, HH:mm', { locale: fr })}
              </span>
              
              {alert.priority === 'high' && (
                <Badge variant="outline" className="text-xs border-red-500/50 text-red-400">
                  Urgent
                </Badge>
              )}
              
              {!alert.read && (
                <span className="h-2 w-2 rounded-full bg-blue-500" />
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
