'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Loader2, AlertCircle, ChevronRight } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface UsageInfo {
  used: number;
  limit: number | null;
  remaining: number | null;
  plan: string;
}

const SUGGESTIONS = [
  'Quelle est la durée de validité de la FCO ?',
  'Combien d\'heures peut conduire un chauffeur PL par semaine ?',
  'Quand faut-il faire le contrôle technique d\'un poids lourd ?',
  'Qu\'est-ce que l\'ATP pour les véhicules frigorifiques ?',
];

interface RegulatoryAssistantProps {
  plan?: string;
}

export function RegulatoryAssistant({ plan = 'essential' }: RegulatoryAssistantProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText]);

  // Charger l'usage au premier ouverture
  const loadUsage = useCallback(async () => {
    try {
      const res = await fetch('/api/ai/regulatory-assistant');
      if (res.ok) {
        const data = await res.json();
        setUsage(data);
      }
    } catch {
      // silencieux
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadUsage();
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open, loadUsage]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;

    setError(null);
    setInput('');
    setIsLoading(true);
    setStreamingText('');

    const userMessage: Message = { role: 'user', content: trimmed };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    try {
      const res = await fetch('/api/ai/regulatory-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: messages, // historique sans le dernier message user
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        if (res.status === 429) {
          setError(data.error || 'Limite mensuelle atteinte.');
        } else {
          setError(data.error || 'Une erreur est survenue.');
        }
        setMessages(updatedMessages.slice(0, -1)); // annuler l'ajout du message user
        setIsLoading(false);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        setStreamingText(accumulated);
      }

      const assistantMessage: Message = { role: 'assistant', content: accumulated };
      setMessages([...updatedMessages, assistantMessage]);
      setStreamingText('');

      // Mettre à jour l'usage après chaque question
      setUsage((prev) => {
        if (!prev || prev.limit === null) return prev;
        return {
          ...prev,
          used: prev.used + 1,
          remaining: Math.max(0, (prev.remaining ?? 0) - 1),
        };
      });
    } catch (err) {
      setError('Erreur de connexion. Vérifiez votre connexion internet.');
      setMessages(updatedMessages.slice(0, -1));
    } finally {
      setIsLoading(false);
      setStreamingText('');
      inputRef.current?.focus();
    }
  }, [isLoading, messages]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const showCounter = usage && usage.limit !== null;
  const isAtLimit = showCounter && (usage.remaining ?? 1) <= 0;

  return (
    <>
      {/* Bouton flottant */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl px-4 py-3',
          'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg',
          'hover:from-cyan-500 hover:to-blue-500 hover:shadow-cyan-500/30 hover:shadow-xl',
          'transition-all duration-200 active:scale-95',
          'border border-cyan-400/20'
        )}
        title="Assistant réglementaire IA"
      >
        <MessageCircle className="h-5 w-5 shrink-0" strokeWidth={1.5} />
        <span className="text-sm font-medium whitespace-nowrap hidden sm:inline">
          Assistant réglementaire
        </span>
      </button>

      {/* Sheet panneau latéral */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className={cn(
            'flex flex-col p-0 gap-0 w-[480px] max-w-[95vw]',
            'bg-[#0a0f1a] border-l border-cyan-500/15'
          )}
        >
          {/* Header */}
          <SheetHeader className="border-b border-cyan-500/10 px-5 py-4 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-600 to-blue-600">
                  <MessageCircle className="h-5 w-5 text-white" strokeWidth={1.5} />
                </div>
                <div>
                  <SheetTitle className="text-white text-base">
                    Assistant réglementaire
                  </SheetTitle>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Transport routier FR/EU
                  </p>
                </div>
              </div>
              {/* Compteur d'usage */}
              {showCounter && (
                <div className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium',
                  isAtLimit
                    ? 'bg-red-500/15 text-red-400 border border-red-500/20'
                    : (usage.remaining ?? 0) <= 5
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                    : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                )}>
                  <span>{usage.remaining} restante{(usage.remaining ?? 0) !== 1 ? 's' : ''}</span>
                  <span className="text-slate-500">/ {usage.limit}</span>
                </div>
              )}
            </div>
          </SheetHeader>

          {/* Zone messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-hide">
            {/* Message de bienvenue si pas d'historique */}
            {messages.length === 0 && !streamingText && (
              <div className="space-y-4">
                <div className="rounded-2xl bg-[#0f172a]/60 border border-cyan-500/10 p-4">
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Bonjour ! Je suis votre assistant spécialisé en réglementation du transport routier français et européen. Posez-moi vos questions sur le code de la route, les temps de conduite, les formations obligatoires, etc.
                  </p>
                </div>

                {/* Suggestions */}
                <div>
                  <p className="text-xs text-slate-500 mb-2 px-1">Questions fréquentes :</p>
                  <div className="space-y-2">
                    {SUGGESTIONS.map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => sendMessage(suggestion)}
                        disabled={isLoading || isAtLimit}
                        className={cn(
                          'w-full flex items-center gap-2 rounded-xl px-3 py-2.5 text-left',
                          'bg-[#0f172a]/40 border border-cyan-500/10 text-slate-300',
                          'hover:border-cyan-500/30 hover:text-cyan-300 hover:bg-cyan-500/5',
                          'transition-all duration-150 text-sm',
                          'disabled:opacity-50 disabled:cursor-not-allowed'
                        )}
                      >
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-cyan-500" />
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Historique des messages */}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  'flex',
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-cyan-600 to-blue-600 text-white rounded-br-sm'
                      : 'bg-[#0f172a]/80 border border-cyan-500/10 text-slate-200 rounded-bl-sm'
                  )}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}

            {/* Streaming en cours */}
            {streamingText && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-[#0f172a]/80 border border-cyan-500/10 px-4 py-3 text-sm text-slate-200 leading-relaxed">
                  <p className="whitespace-pre-wrap">{streamingText}</p>
                  <span className="inline-block w-1.5 h-4 bg-cyan-400 ml-0.5 animate-pulse rounded-sm" />
                </div>
              </div>
            )}

            {/* Indicateur de chargement */}
            {isLoading && !streamingText && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-[#0f172a]/80 border border-cyan-500/10 px-4 py-3">
                  <div className="flex gap-1.5 items-center">
                    <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:0ms]" />
                    <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:150ms]" />
                    <div className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}

            {/* Erreur */}
            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Zone saisie */}
          <div className="border-t border-cyan-500/10 px-4 py-4 shrink-0 bg-[#0a0f1a]">
            {isAtLimit ? (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-center">
                <p className="text-sm text-amber-300 font-medium">
                  Limite mensuelle atteinte
                </p>
                <p className="text-xs text-amber-400/70 mt-1">
                  Passez au plan supérieur pour continuer
                </p>
              </div>
            ) : (
              <div className="flex items-end gap-3">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Posez votre question réglementaire..."
                  disabled={isLoading}
                  rows={1}
                  className={cn(
                    'flex-1 resize-none rounded-xl px-4 py-3 text-sm',
                    'bg-[#0f172a]/60 border border-cyan-500/20 text-white placeholder:text-slate-500',
                    'focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20',
                    'disabled:opacity-50 transition-colors',
                    'max-h-32 scrollbar-hide'
                  )}
                  style={{ height: 'auto', minHeight: '48px' }}
                  onInput={(e) => {
                    const target = e.currentTarget;
                    target.style.height = 'auto';
                    target.style.height = Math.min(target.scrollHeight, 128) + 'px';
                  }}
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={isLoading || !input.trim()}
                  className={cn(
                    'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl',
                    'bg-gradient-to-br from-cyan-600 to-blue-600 text-white',
                    'hover:from-cyan-500 hover:to-blue-500 transition-all duration-150',
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
            )}
            <p className="text-xs text-slate-600 mt-2 text-center">
              Appuyez sur Entrée pour envoyer · Shift+Entrée pour sauter une ligne
            </p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
