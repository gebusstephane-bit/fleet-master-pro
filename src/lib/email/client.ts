/**
 * Client email - Resend
 * Configuration et envoi d'emails
 */

import { Resend } from 'resend';
import { logger } from '@/lib/logger';

const resendApiKey = process.env.RESEND_API_KEY;
// RESEND_FROM_EMAIL est la variable canonique — FROM_EMAIL conservé pour rétrocompatibilité
const fromEmail = process.env.RESEND_FROM_EMAIL || process.env.FROM_EMAIL || 'onboarding@resend.dev';
const testEmail = process.env.RESEND_TEST_EMAIL; // Email vérifié pour les tests

let resend: Resend | null = null;

if (resendApiKey) {
  resend = new Resend(resendApiKey);
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

/**
 * Vérifie si l'email est autorisé en mode test
 * En développement, redirige vers l'email de test configuré
 */
function sanitizeRecipients(to: string | string[]): string | string[] {
  // En production, pas de restriction
  if (process.env.NODE_ENV === 'production') {
    return to;
  }

  // Si pas d'email de test configuré, retourner tel quel (Resend gérera)
  if (!testEmail) {
    return to;
  }

  // Toujours rediriger vers l'email de test en développement
  // car Resend ne permet d'envoyer qu'à des emails vérifiés
  const recipients = Array.isArray(to) ? to : [to];
  
  // Vérifier si tous les destinataires sont autorisés
  const allowedDomains = ['resend.dev'];
  const isAllAllowed = recipients.every(email => {
    const lower = email.toLowerCase();
    const domain = lower.split('@')[1];
    return lower === testEmail.toLowerCase() || allowedDomains.includes(domain);
  });

  if (!isAllAllowed) {
    logger.info(`Mode test: emails redirigés vers ${testEmail}`);
    logger.debug(`Destinataires originaux: ${recipients.join(', ')}`);
    return testEmail;
  }

  return to;
}

export async function sendEmail(options: EmailOptions, forceSimulate: boolean = false) {
  // Guard : destinataire vide ou invalide → log et abandon silencieux
  const toList = Array.isArray(options.to) ? options.to : [options.to];
  const validTo = toList.filter(e => e && e.includes('@'));
  if (validTo.length === 0) {
    logger.error('[EMAIL] Destinataire vide ou invalide — email non envoyé', {
      to: options.to,
      subject: options.subject,
    });
    return { success: false, error: 'Destinataire email invalide' };
  }

  // Mode simulation complet (pour tester sans Resend)
  if (!resend || forceSimulate) {
    logger.info('[SIMULATION] Email');
    logger.debug('De:', options.from || fromEmail);
    logger.debug('À:', options.to);
    logger.debug('Sujet:', options.subject);
    logger.info('Pour envoyer de vrais emails, vérifiez votre domaine sur https://resend.com/domains');
    return { success: true, simulated: true, id: 'simulated-' + Date.now() };
  }

  // Filtrer les destinataires en mode test
  const sanitizedTo = sanitizeRecipients(options.to);

  try {
    const { data, error } = await resend.emails.send({
      from: options.from || fromEmail,
      to: sanitizedTo,
      subject: options.subject,
      html: options.html,
      text: options.text,
      // @ts-ignore
      replyTo: options.replyTo,
    });

    if (error) {
      console.error('❌ Erreur envoi email:', error);
      
      // Si erreur de domaine non vérifié, passer en mode simulation
      if (error.message?.includes('not verified')) {
        console.warn('⚠️ Domaine non vérifié - Passage en mode simulation');
        return sendEmail(options, true); // Retry en simulation
      }
      
      throw new Error(error.message);
    }

    logger.info('Email envoyé:', data?.id);
    return { success: true, id: data?.id };
  } catch (error: any) {
    console.error('❌ Erreur envoi email:', error);
    
    // En développement, ne pas bloquer - passer en simulation
    if (process.env.NODE_ENV !== 'production') {
      console.warn('⚠️ Passage en mode simulation (erreur):', error.message);
      return { success: true, simulated: true, id: 'simulated-error' };
    }
    
    throw error;
  }
}

export function isEmailConfigured(): boolean {
  return !!resend;
}

export function getEmailConfig() {
  return {
    isConfigured: !!resend,
    testEmail: testEmail,
    fromEmail: fromEmail,
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'test',
  };
}
