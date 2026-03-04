import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';
import { planHasFeature } from '@/lib/plans';

export const dynamic = 'force-dynamic';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `Tu es un expert en réglementation du transport routier français et européen. Tu assistes les gestionnaires de flotte de PME françaises.

Tu maîtrises parfaitement :
- Le code de la route français et ses spécificités PL/VL
- Le règlement européen 561/2006 (temps de conduite et repos)
- La réglementation sociale européenne (RSE)
- Les FCO/FIMO (formation conducteurs)
- Les contrôles techniques poids lourds
- L'ADR (transport matières dangereuses)
- Les licences de transport (LTI, cabotage)
- Les obligations DREAL et les contrôles routiers
- L'ATP pour les véhicules frigorifiques
- Les tachygraphes numériques et analogiques
- Les règles de chargement et d'arrimage

Réponds en français, de façon concise et pratique.
Cite les textes réglementaires quand c'est pertinent (ex: Art. X du règlement 561/2006).
Si tu n'es pas certain d'une information, dis-le clairement.
Ne donne pas de conseils juridiques engageants - recommande un professionnel si nécessaire.`;

// Limites mensuelles par plan (UNLIMITED uniquement a accès à l'IA)
const AI_PLAN_LIMITS: Record<string, number> = {
  essential: 0,     // Pas d'accès IA
  pro: 0,           // Pas d'accès IA  
  unlimited: Infinity,
};

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

// GET : retourne l'usage du mois en cours
export async function GET(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => request.cookies.get(name)?.value,
        set: () => {},
        remove: () => {},
      },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, companies(plan)')
    .eq('id', user.id)
    .single();

  if (!profile?.company_id) {
    return NextResponse.json({ error: 'Entreprise introuvable' }, { status: 400 });
  }

  const plan = (profile.companies as any)?.plan || 'essential';
  
  // Vérifier que le plan a accès à l'assistant IA (UNLIMITED uniquement)
  if (!planHasFeature(plan, 'ai_assistant')) {
    return NextResponse.json(
      { 
        error: 'Assistant IA non disponible sur votre plan. Passez au plan UNLIMITED pour y accéder.',
        upgradeUrl: '/settings/billing'
      },
      { status: 403 }
    );
  }
  
  const limit = AI_PLAN_LIMITS[plan] ?? 0;

  const admin = createAdminClient();
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  // @ts-ignore - Table ai_conversations non définie dans Database types
  const { count } = await admin
    .from('ai_conversations' as never)
    .select('*', { count: 'exact', head: true })
    .eq('company_id', profile.company_id)
    .gte('created_at', startOfMonth.toISOString());

  const used = count ?? 0;

  return NextResponse.json({
    used,
    limit: limit === Infinity ? null : limit,
    plan,
    remaining: limit === Infinity ? null : Math.max(0, limit - used),
  });
}

// POST : streaming de la réponse IA
export async function POST(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => request.cookies.get(name)?.value,
        set: () => {},
        remove: () => {},
      },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, companies(plan)')
    .eq('id', user.id)
    .single();

  if (!profile?.company_id) {
    return NextResponse.json({ error: 'Entreprise introuvable' }, { status: 400 });
  }

  const plan = (profile.companies as any)?.plan || 'essential';
  
  // Vérifier que le plan a accès à l'assistant IA (UNLIMITED uniquement)
  if (!planHasFeature(plan, 'ai_assistant')) {
    return NextResponse.json(
      { 
        error: 'Assistant IA non disponible sur votre plan. Passez au plan UNLIMITED pour y accéder.',
        upgradeUrl: '/settings/billing'
      },
      { status: 403 }
    );
  }
  
  const limit = AI_PLAN_LIMITS[plan] ?? 0;
  const companyId = profile.company_id;

  // Vérifier la limite mensuelle (si applicable)
  if (limit !== Infinity) {
    const admin = createAdminClient();
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // @ts-ignore - Table ai_conversations non définie dans Database types
    const { count } = await admin
      .from('ai_conversations' as never)
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .gte('created_at', startOfMonth.toISOString());

    if ((count ?? 0) >= limit) {
      return NextResponse.json(
        {
          error: `Limite mensuelle atteinte (${limit} questions/${plan === 'essential' ? 'mois pour le plan Essential' : 'mois pour le plan Pro'}). Passez au plan supérieur pour continuer.`,
          limitReached: true,
        },
        { status: 429 }
      );
    }
  }

  const body = await request.json();
  const { message, history = [] }: { message: string; history: Message[] } = body;

  if (!message?.trim()) {
    return NextResponse.json({ error: 'Message vide' }, { status: 400 });
  }

  // Construire l'historique pour Anthropic (max 20 échanges pour limiter les tokens)
  const recentHistory = history.slice(-20);
  const messages: Anthropic.MessageParam[] = [
    ...recentHistory.map((m) => ({
      role: m.role,
      content: m.content,
    })),
    { role: 'user' as const, content: message },
  ];

  const encoder = new TextEncoder();
  let fullAnswer = '';

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicStream = client.messages.stream({
          model: 'claude-haiku-4-5',
          max_tokens: 2048,
          system: SYSTEM_PROMPT,
          messages,
        });

        for await (const event of anthropicStream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            fullAnswer += event.delta.text;
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }

        // Log RGPD : company_id uniquement, pas de user_id
        const admin = createAdminClient();
        // @ts-ignore - Table ai_conversations non définie dans Database types
        await admin.from('ai_conversations' as never).insert({
          company_id: companyId,
          question: message,
          answer: fullAnswer,
        } as never);

        controller.close();
      } catch (err) {
        console.error('[AI Assistant] Erreur streaming:', err);
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-AI-Plan': plan,
      'X-AI-Limit': limit === Infinity ? 'unlimited' : String(limit),
    },
  });
}
