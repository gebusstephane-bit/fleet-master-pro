/**
 * AgentForge Chat Widget — Adapté au design FleetMaster Pro (Cosmic 2030)
 *
 * PRÊT À COPIER dans : src/components/ai/AgentForgeWidget.tsx
 *
 * Intégration dans layout.tsx :
 *   import { AgentForgeWidget } from '@/components/ai/AgentForgeWidget';
 *   <AgentForgeWidget user={user} plan={plan} />
 *
 * Variables d'env requises :
 *   NEXT_PUBLIC_AGENTFORGE_AGENT_ID=...
 *   NEXT_PUBLIC_AGENTFORGE_API_URL=https://api.agentforge.dev (ou votre proxy /api/agentforge/chat)
 *   AGENTFORGE_API_KEY=af_... (utilisé côté serveur uniquement si proxy)
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { Bot, X, Send, Loader2, AlertCircle, ChevronRight, Sparkles, Minimize2 } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────

interface AgentForgeUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  company_id: string;
  companies?: {
    id: string;
    name: string;
    subscription_plan?: string;
  } | null;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AgentForgeWidgetProps {
  user: AgentForgeUser;
  plan?: string;
}

// ─── Config ──────────────────────────────────────

const AGENT_ID = process.env.NEXT_PUBLIC_AGENTFORGE_AGENT_ID || '';
const API_URL = process.env.NEXT_PUBLIC_AGENTFORGE_API_URL || '/api/agentforge/chat';

const SUGGESTIONS: Record<string, string[]> = {
  '/dashboard': [
    'Résume l\'état de ma flotte aujourd\'hui',
    'Quels véhicules nécessitent une attention urgente ?',
    'Analyse mes coûts de maintenance ce mois-ci',
  ],
  '/vehicles': [
    'Quel véhicule a le score IA le plus bas ?',
    'Combien de véhicules sont en maintenance ?',
    'Prévisions de maintenance pour cette semaine',
  ],
  '/drivers': [
    'Quel conducteur a le meilleur score ?',
    'Y a-t-il des documents conducteurs expirants ?',
  ],
  '/maintenance': [
    'Quelles maintenances sont en retard ?',
    'Coût moyen de maintenance par véhicule',
  ],
  default: [
    'Aide-moi avec ma flotte',
    'Quels sont les problèmes urgents ?',
    'Résume la situation réglementaire',
  ],
};

// ─── Helpers ─────────────────────────────────────

function getPageContext(pathname: string): string {
  if (pathname.includes('/vehicles/')) {
    const match = pathname.match(/\/vehicles\/([^/]+)/);
    return match ? `vehicle_detail:${match[1]}` : 'vehicles_list';
  }
  if (pathname.includes('/drivers/')) {
    const match = pathname.match(/\/drivers\/([^/]+)/);
    return match ? `driver_detail:${match[1]}` : 'drivers_list';
  }
  if (pathname.includes('/maintenance')) return 'maintenance';
  if (pathname.includes('/fuel')) return 'fuel';
  if (pathname.includes('/compliance')) return 'compliance';
  if (pathname.includes('/incidents')) return 'incidents';
  if (pathname.includes('/sos')) return 'sos';
  if (pathname.includes('/dashboard')) return 'dashboard';
  return 'general';
}

function getSuggestions(pathname: string): string[] {
  const key = Object.keys(SUGGESTIONS).find((k) => k !== 'default' && pathname.startsWith(k));
  return SUGGESTIONS[key || 'default'];
}

// ─── Component ───────────────────────────────────

export function AgentForgeWidget({ user, plan = 'ESSENTIAL' }: AgentForgeWidgetProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pathname = usePathname();

  // Scroll auto en bas des messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText, scrollToBottom]);

  // Focus input à l'ouverture
  useEffect(() => {
    if (open) {
      setUnreadCount(0);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  // ─── Send Message ────────────────────────────

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;

      setError(null);
      setInput('');
      setIsLoading(true);
      setStreamingText('');

      const userMessage: Message = { role: 'user', content: trimmed, timestamp: new Date() };
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);

      try {
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agent_id: AGENT_ID,
            message: trimmed,
            history: messages.map((m) => ({ role: m.role, content: m.content })),
            context: {
              user_id: user.id,
              company_id: user.company_id,
              company_name: user.companies?.name,
              user_role: user.role,
              user_name: `${user.first_name} ${user.last_name}`,
              plan,
              page: getPageContext(pathname),
              pathname,
            },
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          if (res.status === 429) {
            setError(data.error || 'Limite atteinte. Réessayez plus tard.');
          } else {
            setError(data.error || 'Une erreur est survenue.');
          }
          setMessages(updatedMessages.slice(0, -1));
          setIsLoading(false);
          return;
        }

        // Streaming response
        if (res.body) {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let accumulated = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            accumulated += decoder.decode(value, { stream: true });
            setStreamingText(accumulated);
          }

          const assistantMessage: Message = {
            role: 'assistant',
            content: accumulated,
            timestamp: new Date(),
          };
          setMessages([...updatedMessages, assistantMessage]);
          setStreamingText('');

          if (!open) {
            setUnreadCount((c) => c + 1);
          }
        }
      } catch {
        setError('Erreur de connexion. Vérifiez votre connexion internet.');
        setMessages(updatedMessages.slice(0, -1));
      } finally {
        setIsLoading(false);
        setStreamingText('');
        inputRef.current?.focus();
      }
    },
    [isLoading, messages, user, plan, pathname, open]
  );

  // ─── Key handler ─────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // ─── Auto-resize textarea ────────────────────

  const handleTextareaInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.currentTarget;
    target.style.height = 'auto';
    target.style.height = Math.min(target.scrollHeight, 128) + 'px';
  };

  const suggestions = getSuggestions(pathname);

  // ─── Render ──────────────────────────────────

  return (
    <>
      {/* ── Bouton Flottant ────────────────────── */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl px-4 py-3',
          'bg-gradient-to-r from-violet-600 to-cyan-600 text-white shadow-lg',
          'hover:from-violet-500 hover:to-cyan-500 hover:shadow-violet-500/30 hover:shadow-xl',
          'transition-all duration-200 active:scale-95',
          'border border-violet-400/20'
        )}
        title="Assistant IA FleetMaster"
      >
        <Sparkles className="h-5 w-5 shrink-0" strokeWidth={1.5} />
        <span className="text-sm font-medium whitespace-nowrap hidden sm:inline">
          Assistant IA
        </span>
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-[#0a0f1a]">
            {unreadCount}
          </span>
        )}
      </button>

      {/* ── Sheet Panel ────────────────────────── */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className={cn(
            'flex flex-col p-0 gap-0 w-[480px] max-w-[95vw]',
            'bg-[#0a0f1a] border-l border-violet-500/15'
          )}
        >
          {/* Header */}
          <SheetHeader className="border-b border-violet-500/10 px-5 py-4 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-600">
                  <Bot className="h-5 w-5 text-white" strokeWidth={1.5} />
                </div>
                <div>
                  <SheetTitle className="text-white text-base">Assistant IA</SheetTitle>
                  <p className="text-xs text-slate-400 mt-0.5">FleetMaster Pro</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'rounded-lg px-2.5 py-1 text-[10px] font-semibold tracking-wide uppercase',
                    plan === 'UNLIMITED'
                      ? 'bg-violet-500/15 text-violet-300 border border-violet-500/20'
                      : plan === 'PRO'
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/20'
                      : 'bg-slate-500/15 text-slate-400 border border-slate-500/20'
                  )}
                >
                  {plan}
                </span>
              </div>
            </div>
          </SheetHeader>

          {/* ── Zone Messages ──────────────────── */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-hide">
            {/* Welcome */}
            {messages.length === 0 && !streamingText && (
              <div className="space-y-4">
                <div className="rounded-2xl bg-[#0f172a]/60 border border-violet-500/10 p-4">
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Bonjour{user.first_name ? ` ${user.first_name}` : ''} ! Je suis votre
                    assistant IA. Je connais votre flotte, vos véhicules, et la réglementation
                    transport. Comment puis-je vous aider ?
                  </p>
                </div>

                {/* Suggestions contextuelles */}
                <div>
                  <p className="text-xs text-slate-500 mb-2 px-1">Suggestions :</p>
                  <div className="space-y-2">
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => sendMessage(suggestion)}
                        disabled={isLoading}
                        className={cn(
                          'w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-left',
                          'bg-[#0f172a]/40 border border-violet-500/10 text-slate-300',
                          'hover:border-violet-500/30 hover:text-violet-300 hover:bg-violet-500/5',
                          'transition-all duration-150 text-sm',
                          'disabled:opacity-50 disabled:cursor-not-allowed'
                        )}
                      >
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-violet-400" />
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-violet-600 to-cyan-600 text-white rounded-br-sm'
                      : 'bg-[#0f172a]/80 border border-violet-500/10 text-slate-200 rounded-bl-sm'
                  )}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}

            {/* Streaming */}
            {streamingText && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-[#0f172a]/80 border border-violet-500/10 px-4 py-3 text-sm text-slate-200 leading-relaxed">
                  <p className="whitespace-pre-wrap">{streamingText}</p>
                  <span className="inline-block w-1.5 h-4 bg-violet-400 ml-0.5 animate-pulse rounded-sm" />
                </div>
              </div>
            )}

            {/* Loading dots */}
            {isLoading && !streamingText && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-[#0f172a]/80 border border-violet-500/10 px-4 py-3">
                  <div className="flex gap-1.5 items-center">
                    <div className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:0ms]" />
                    <div className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:150ms]" />
                    <div className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ── Zone Saisie ────────────────────── */}
          <div className="border-t border-violet-500/10 px-4 py-4 shrink-0 bg-[#0a0f1a]">
            <div className="flex items-end gap-3">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onInput={handleTextareaInput}
                placeholder="Posez votre question..."
                disabled={isLoading}
                rows={1}
                className={cn(
                  'flex-1 resize-none rounded-xl px-4 py-3 text-sm',
                  'bg-[#0f172a]/60 border border-violet-500/20 text-white placeholder:text-slate-500',
                  'focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20',
                  'disabled:opacity-50 transition-colors',
                  'max-h-32 scrollbar-hide'
                )}
                style={{ height: 'auto', minHeight: '48px' }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={isLoading || !input.trim()}
                className={cn(
                  'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
                  'bg-gradient-to-br from-violet-600 to-cyan-600 text-white',
                  'hover:from-violet-500 hover:to-cyan-500 transition-all duration-150',
                  'disabled:opacity-40 disabled:cursor-not-allowed active:scale-95'
                )}
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
            <p className="text-xs text-slate-600 mt-2 text-center">
              Entree pour envoyer &middot; Shift+Entree pour sauter une ligne
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
