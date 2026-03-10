/**
 * Vue détaillée d'un ticket avec conversation
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useSupportTicket, useCreateMessage } from '@/hooks/use-support';
import { toast } from 'sonner';
import {
  TICKET_STATUS_LABELS,
  TICKET_PRIORITY_LABELS,
  TICKET_CATEGORY_LABELS,
  type SupportTicket,
} from '@/types/support';
import {
  ArrowLeft,
  Send,
  Loader2,
  User,
  HeadphonesIcon,
  Bot,
  Clock,
  AlertCircle,
  CheckCircle2,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TicketConversationProps {
  ticket: SupportTicket;
  onBack?: () => void;
}

export function TicketConversation({ ticket, onBack }: TicketConversationProps) {
  const { data, isLoading, refetch } = useSupportTicket(ticket.id);
  const createMessage = useCreateMessage();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  // Scroll vers le bas quand nouveaux messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data?.messages]);
  
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    
    setIsSending(true);
    try {
      await createMessage.mutateAsync({
        ticket_id: ticket.id,
        content: newMessage.trim(),
        author_type: 'client',
      });
      setNewMessage('');
      refetch(); // Rafraîchir pour voir la réponse
    } catch (error) {
      toast.error('Impossible d\'envoyer le message.');
    } finally {
      setIsSending(false);
    }
  };
  
  const statusColors = {
    open: 'bg-red-500/20 text-red-300 border-red-500/30',
    in_progress: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    waiting_client: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    resolved: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    closed: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  };
  
  const messages = data?.messages || [];
  
  return (
    <Card className="bg-slate-900 border-slate-700 h-full flex flex-col">
      {/* Header */}
      <CardHeader className="pb-4 border-b border-slate-700">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {onBack && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onBack}
                className="h-8 w-8 text-slate-400 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-semibold text-white">
                  #{ticket.id.slice(0, 8)}
                </h2>
                <Badge variant="outline" className={statusColors[ticket.status]}>
                  {TICKET_STATUS_LABELS[ticket.status]}
                </Badge>
                <Badge variant="outline" className="bg-slate-800 text-slate-300 border-slate-600">
                  {TICKET_PRIORITY_LABELS[ticket.priority]}
                </Badge>
              </div>
              <h3 className="text-white font-medium">{ticket.subject}</h3>
              <p className="text-sm text-slate-400">
                {TICKET_CATEGORY_LABELS[ticket.category]}
              </p>
            </div>
          </div>
          
          <div className="text-right text-xs text-slate-500">
            <p>Créé {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true, locale: fr })}</p>
            {ticket.assigned_to_user && (
              <p className="mt-1">
                Assigné à : {ticket.assigned_to_user.first_name} {ticket.assigned_to_user.last_name}
              </p>
            )}
          </div>
        </div>
      </CardHeader>
      
      {/* Messages */}
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Message initial (description du ticket) */}
            <div className="flex gap-3">
              <Avatar className="h-8 w-8 bg-blue-500">
                <AvatarFallback className="text-xs text-white">
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="max-w-[70%] space-y-1 items-start">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-medium">Vous</span>
                  <span>·</span>
                  <span>{formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true, locale: fr })}</span>
                </div>
                <div className="p-3 rounded-2xl text-sm bg-blue-500/20 text-blue-100 border border-blue-500/30 rounded-tr-sm">
                  {ticket.description}
                </div>
              </div>
            </div>
            
            {/* Messages de la conversation */}
            {messages.map((message, index) => (
              <MessageBubble 
                key={message.id} 
                message={message}
                isFirst={index === 0}
              />
            ))}
            
            {messages.length === 0 && (
              <div className="text-center py-4 text-slate-500">
                <p className="text-sm">En attente d'une réponse du support...</p>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </CardContent>
      
      {/* Input */}
      {ticket.status !== 'closed' && ticket.status !== 'resolved' && (
        <div className="p-4 border-t border-slate-700 bg-slate-800/30">
          <div className="flex gap-3">
            <Textarea
              placeholder="Écrivez votre message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="flex-1 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 resize-none min-h-[80px]"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || isSending}
              className="self-end bg-cyan-500 hover:bg-cyan-600 text-white"
            >
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Appuyez sur Entrée pour envoyer, Shift+Entrée pour un saut de ligne
          </p>
        </div>
      )}
      
      {ticket.status === 'resolved' && (
        <div className="p-4 border-t border-slate-700 bg-emerald-500/10">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">Ce ticket est résolu</span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Si vous avez encore un problème, vous pouvez créer un nouveau ticket.
          </p>
        </div>
      )}
    </Card>
  );
}

function MessageBubble({ 
  message, 
  isFirst 
}: { 
  message: any; 
  isFirst?: boolean;
}) {
  const isClient = message.author_type === 'client';
  const isAdmin = message.author_type === 'admin';
  const isSystem = message.author_type === 'system';
  
  if (isSystem) {
    return (
      <div className="flex justify-center">
        <span className="text-xs text-slate-500 bg-slate-800/50 px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    );
  }
  
  return (
    <div className={cn(
      'flex gap-3',
      isClient ? 'flex-row-reverse' : 'flex-row'
    )}>
      <Avatar className={cn(
        'h-8 w-8',
        isClient ? 'bg-blue-500' : 'bg-cyan-500'
      )}>
        <AvatarFallback className="text-xs text-white">
          {isClient ? (
            <User className="h-4 w-4" />
          ) : (
            <HeadphonesIcon className="h-4 w-4" />
          )}
        </AvatarFallback>
      </Avatar>
      
      <div className={cn(
        'max-w-[70%] space-y-1',
        isClient ? 'items-end' : 'items-start'
      )}>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="font-medium">
            {isClient 
              ? 'Vous' 
              : message.author 
                ? `${message.author.first_name} ${message.author.last_name}`
                : 'Support FleetMaster'
            }
          </span>
          <span>·</span>
          <span>{formatDistanceToNow(new Date(message.created_at), { addSuffix: true, locale: fr })}</span>
        </div>
        
        <div className={cn(
          'p-3 rounded-2xl text-sm',
          isClient 
            ? 'bg-blue-500/20 text-blue-100 border border-blue-500/30 rounded-tr-sm'
            : 'bg-slate-800 text-slate-100 border border-slate-700 rounded-tl-sm'
        )}>
          {message.content}
        </div>
      </div>
    </div>
  );
}
