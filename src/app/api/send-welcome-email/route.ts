/**
 * API Route : Envoi de l'email de bienvenue avec magic link
 * Appelée par le webhook Stripe après création du compte
 */

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { logger } from '@/lib/logger';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { email, companyName, magicLink } = await request.json();

    if (!email || !magicLink) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',
      to: email,
      subject: 'Bienvenue sur FleetMaster Pro — Accédez à votre compte',
      html: `
        <!DOCTYPE html>
        <html>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #1a1a1a;">Bienvenue sur FleetMaster Pro !</h1>
            <p>Bonjour,</p>
            <p>Votre compte pour <strong>${companyName || 'votre entreprise'}</strong> a été créé avec succès.</p>
            <p>Cliquez sur le bouton ci-dessous pour accéder à votre dashboard :</p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${magicLink}"
                 style="background-color: #0f172a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-size: 16px; display: inline-block;">
                Accéder à mon compte
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">
              Ce lien expire dans 24 heures. Si vous n'avez pas créé ce compte, ignorez cet email.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
            <p style="color: #999; font-size: 12px;">FleetMaster Pro — Gestion de flotte intelligente</p>
          </body>
        </html>
      `,
    });

    if (error) {
      logger.error('Resend error', { error: error instanceof Error ? error.message : String(error) });
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error: any) {
    logger.error('Send welcome email error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
