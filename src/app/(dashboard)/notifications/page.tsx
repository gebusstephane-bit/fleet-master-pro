/**
 * Page des notifications
 * Liste complète avec filtrage et préférences
 */

import { Metadata } from 'next';
import { NotificationList } from '@/components/notifications/notification-list';
import { NotificationPreferences } from '@/components/notifications/notification-preferences';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Bell, Settings } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Notifications | FleetMaster',
  description: 'Gérez vos notifications et préférences',
};

export default function NotificationsPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
        <p className="text-slate-500">
          Consultez vos notifications et configurez vos préférences
        </p>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Toutes
          </TabsTrigger>
          <TabsTrigger value="preferences" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Préférences
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <NotificationList />
        </TabsContent>

        <TabsContent value="preferences" className="space-y-4">
          <NotificationPreferences />
        </TabsContent>
      </Tabs>
    </div>
  );
}
