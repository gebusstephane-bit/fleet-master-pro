/**
 * Composant RecentActivity
 * Activité récente sur le dashboard
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Truck, 
  Users, 
  Route, 
  Wrench,
  FileText
} from 'lucide-react';

const activities = [
  {
    id: '1',
    type: 'vehicle',
    action: 'Véhicule créé',
    description: 'Renault Master AA-123-AA ajouté',
    time: 'Il y a 10 min',
    icon: Truck,
    color: 'text-blue-600 bg-blue-100',
  },
  {
    id: '2',
    type: 'driver',
    action: 'Chauffeur assigné',
    description: 'Pierre Martin assigné au véhicule AA-456-BB',
    time: 'Il y a 25 min',
    icon: Users,
    color: 'text-green-600 bg-green-100',
  },
  {
    id: '3',
    type: 'route',
    action: 'Tournée terminée',
    description: 'Tournée #1234 complétée - 145 km',
    time: 'Il y a 1h',
    icon: Route,
    color: 'text-purple-600 bg-purple-100',
  },
  {
    id: '4',
    type: 'maintenance',
    action: 'Maintenance programmée',
    description: 'Révision des 30 000 km pour CC-789-DD',
    time: 'Il y a 2h',
    icon: Wrench,
    color: 'text-amber-600 bg-amber-100',
  },
  {
    id: '5',
    type: 'document',
    action: 'Document ajouté',
    description: 'Nouvelle assurance uploadée pour EE-012-EE',
    time: 'Il y a 3h',
    icon: FileText,
    color: 'text-gray-600 bg-gray-100',
  },
];

export function RecentActivity() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Activité récente</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div key={activity.id} className="flex gap-3">
              <div className={`p-2 rounded-full h-fit shrink-0 ${activity.color}`}>
                <activity.icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{activity.action}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {activity.description}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {activity.time}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
