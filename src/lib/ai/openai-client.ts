/**
 * Client OpenAI singleton pour Fleet-Master
 * Modèle imposé : gpt-4o-mini (coût optimisé)
 * Tous les appels passent par callAI() — jamais d'appel direct
 */

import OpenAI from 'openai';
import * as Sentry from '@sentry/nextjs';
import { logger } from '@/lib/logger';
import { canCallAI, trackAICall } from '@/lib/ai/budget-guard';

const MODEL = 'gpt-4o-mini' as const;
const DEFAULT_TIMEOUT_MS = 8_000;

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set');
    }
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}

export type AIMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

/**
 * Wrapper sécurisé pour appeler OpenAI.
 * - try/catch complet → retourne null en cas d'erreur (ne throw jamais)
 * - Log Sentry en cas d'erreur
 * - Timeout 8s via AbortController
 * - Modèle hardcodé : gpt-4o-mini
 * - Budget guard : si companyId fourni, vérifie canCallAI + trackAICall
 *
 * Signature rétro-compatible : companyId, callType et timeoutMs sont optionnels.
 */
export async function callAI(
  messages: AIMessage[],
  maxTokens: number,
  companyId?: string,
  callType?: string,
  timeoutMs?: number
): Promise<string | null> {
  try {
    // Budget guard (si companyId fourni)
    if (companyId) {
      const allowed = await canCallAI(companyId, callType);
      if (!allowed) {
        logger.info('[AI] Budget guard blocked call', {
          companyId: companyId.substring(0, 8),
          callType,
        });
        return null;
      }
    }

    const client = getClient();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs || DEFAULT_TIMEOUT_MS);

    const response = await client.chat.completions.create(
      {
        model: MODEL,
        messages,
        max_tokens: maxTokens,
        temperature: 0.3,
      },
      { signal: controller.signal }
    );

    clearTimeout(timeout);

    const content = response.choices?.[0]?.message?.content ?? null;

    // Track usage (si companyId fourni et appel réussi)
    if (companyId && content && response.usage) {
      trackAICall(
        companyId,
        response.usage.prompt_tokens || 0,
        response.usage.completion_tokens || 0
      ).catch(() => {}); // fire-and-forget
    }

    return content;
  } catch (error) {
    // Log Sentry sans throw
    Sentry.captureException(error, {
      tags: { module: 'ai', model: MODEL },
      extra: {
        messageCount: messages.length,
        maxTokens,
        companyId: companyId?.substring(0, 8),
      },
    });
    logger.error('[AI] callAI failed', {
      error: error instanceof Error ? error.message : String(error),
      model: MODEL,
    });
    return null;
  }
}
