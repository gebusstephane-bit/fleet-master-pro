/**
 * Server Actions pour les notifications
 * - getNotifications : Liste avec cursor pagination
 * - markAsRead : Marquer une notification comme lue
 * - markAllAsRead : Marquer toutes comme lues
 * - getUnreadCount : Nombre de notifications non lues
 * - getPreferences / updatePreferences : Gérer les préférences
 */

'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { rateLimitMiddleware } from '@/lib/security/rate-limiter';
import { authActionClient } from '@/lib/safe-action';
import { z } from 'zod';

// Schémas de validation
const paginationSchema = z.object({
  cursor: z.string().optional(),
  pageSize: z.number().min(1).max(100).default(30),
});

const markAsReadSchema = z.object({
  notificationId: z.string().uuid(),
});

const updatePreferencesSchema = z.record(z.boolean());

// Types
interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  data: Record<string, unknown>;
  channels: string[];
  read_at: string | null;
  created_at: string;
}

/**
 * Récupérer les notifications avec cursor pagination
 */
export const getNotifications = authActionClient
  .schema(paginationSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { cursor, pageSize } = parsedInput;
    
    // Rate limiting
    const rateLimit = await rateLimitMiddleware({ userId: ctx.user.id });
    if (!rateLimit.allowed) {
      throw new Error(rateLimit.error);
    }

    const supabase = await createClient();

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', ctx.user.id)
      .order('created_at', { ascending: false })
      .limit(pageSize + 1);

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Erreur lors de la récupération: ${error.message}`);
    }

    const notifications = data as NotificationRow[];
    const hasMore = notifications.length > pageSize;
    const items = hasMore ? notifications.slice(0, pageSize) : notifications;
    
    const nextCursor = hasMore && items.length > 0 
      ? items[items.length - 1].created_at 
      : null;

    return {
      data: items,
      nextCursor,
      hasMore,
    };
  });

/**
 * Marquer une notification comme lue
 */
export const markAsRead = authActionClient
  .schema(markAsReadSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { notificationId } = parsedInput;

    const rateLimit = await rateLimitMiddleware({ userId: ctx.user.id });
    if (!rateLimit.allowed) {
      throw new Error(rateLimit.error);
    }

    const supabase = await createClient();

    // Vérifier que la notification appartient à l'utilisateur
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('id', notificationId)
      .eq('user_id', ctx.user.id)
      .single();

    if (!existing) {
      throw new Error('Notification non trouvée');
    }

    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId);

    if (error) {
      throw new Error(`Erreur: ${error.message}`);
    }

    revalidatePath('/notifications');
    return { success: true };
  });

/**
 * Marquer toutes les notifications comme lues
 */
export const markAllAsRead = authActionClient
  .action(async ({ ctx }) => {
    const rateLimit = await rateLimitMiddleware({ userId: ctx.user.id });
    if (!rateLimit.allowed) {
      throw new Error(rateLimit.error);
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', ctx.user.id)
      .is('read_at', null);

    if (error) {
      throw new Error(`Erreur: ${error.message}`);
    }

    revalidatePath('/notifications');
    return { success: true };
  });

/**
 * Récupérer le nombre de notifications non lues
 */
export const getUnreadCount = authActionClient
  .action(async ({ ctx }) => {
    // Pas de rate limiting strict pour cette opération légère
    const supabase = await createClient();

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', ctx.user.id)
      .is('read_at', null);

    if (error) {
      throw new Error(`Erreur: ${error.message}`);
    }

    return { count: count ?? 0 };
  });

/**
 * Récupérer les préférences de notification
 */
export const getPreferences = authActionClient
  .action(async ({ ctx }) => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', ctx.user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Erreur: ${error.message}`);
    }

    if (!data) {
      // Créer des préférences par défaut
      const defaults = {
        user_id: ctx.user.id,
        email_enabled: true,
        push_enabled: false,
        in_app_enabled: true,
        maintenance_due_email: true,
        maintenance_due_push: true,
        maintenance_due_in_app: true,
        document_expiring_email: true,
        document_expiring_push: false,
        document_expiring_in_app: true,
        fuel_anomaly_email: true,
        fuel_anomaly_push: true,
        fuel_anomaly_in_app: true,
        geofencing_email: false,
        geofencing_push: true,
        geofencing_in_app: true,
        alert_critical_email: true,
        alert_critical_push: true,
        alert_critical_in_app: true,
        alert_warning_email: false,
        alert_warning_push: false,
        alert_warning_in_app: true,
      };

      const { data: created, error: createError } = await supabase
        .from('notification_preferences')
        .insert(defaults)
        .select()
        .single();

      if (createError) {
        throw new Error(`Erreur création: ${createError.message}`);
      }

      return created;
    }

    return data;
  });

/**
 * Mettre à jour les préférences
 */
export const updatePreferences = authActionClient
  .schema(updatePreferencesSchema)
  .action(async ({ parsedInput, ctx }) => {
    const rateLimit = await rateLimitMiddleware({ userId: ctx.user.id });
    if (!rateLimit.allowed) {
      throw new Error(rateLimit.error);
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from('notification_preferences')
      .update(parsedInput)
      .eq('user_id', ctx.user.id);

    if (error) {
      throw new Error(`Erreur: ${error.message}`);
    }

    revalidatePath('/settings/notifications');
    return { success: true };
  });
