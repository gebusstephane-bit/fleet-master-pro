/**
 * Tests for AI Briefing — openai-client.ts
 * Mocks the OpenAI SDK to validate callAI behavior
 */

const mockCreate = jest.fn();

jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: (...args: unknown[]) => mockCreate(...args),
        },
      },
    })),
  };
});

jest.mock('@sentry/nextjs', () => ({
  __esModule: true,
  captureException: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    errorWithError: jest.fn(),
  },
}));

process.env.OPENAI_API_KEY = 'test-key-123';

import { callAI, type AIMessage } from '@/lib/ai/openai-client';
import * as Sentry from '@sentry/nextjs';

describe('callAI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const sampleMessages: AIMessage[] = [
    { role: 'system', content: 'Tu es un assistant.' },
    { role: 'user', content: 'Bonjour' },
  ];

  it('returns content on successful call', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: 'Bonjour ! Voici le briefing.' } }],
    });

    const result = await callAI(sampleMessages, 500);

    expect(result).toBe('Bonjour ! Voici le briefing.');
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4o-mini',
        max_tokens: 500,
        messages: sampleMessages,
      }),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('returns null when OpenAI throws an error', async () => {
    mockCreate.mockRejectedValueOnce(new Error('API rate limit'));

    const result = await callAI(sampleMessages, 500);

    expect(result).toBeNull();
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        tags: { module: 'ai', model: 'gpt-4o-mini' },
      }),
    );
  });

  it('returns null when response has no choices', async () => {
    mockCreate.mockResolvedValueOnce({ choices: [] });

    const result = await callAI(sampleMessages, 300);

    expect(result).toBeNull();
  });

  it('returns null when choice content is null', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: null } }],
    });

    const result = await callAI(sampleMessages, 300);

    expect(result).toBeNull();
  });

  it('uses gpt-4o-mini model (hardcoded)', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: 'ok' } }],
    });

    await callAI(sampleMessages, 100);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gpt-4o-mini' }),
      expect.anything(),
    );
  });

  it('passes max_tokens correctly', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: 'ok' } }],
    });

    await callAI(sampleMessages, 250);

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ max_tokens: 250 }),
      expect.anything(),
    );
  });

  it('handles abort signal timeout gracefully', async () => {
    const abortError = new DOMException('The operation was aborted', 'AbortError');
    mockCreate.mockRejectedValueOnce(abortError);

    const result = await callAI(sampleMessages, 500);

    expect(result).toBeNull();
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
  });
});
