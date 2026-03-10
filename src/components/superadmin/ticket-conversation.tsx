/**
 * Conversation ticket - Vue SuperAdmin
 * Avec workflow automatique de statut
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  useCreateMessage, 
  useUpdateTicketStatus,
  useSupportTicket 
} from '@/hooks/use-support';
import { toast } from 'sonner';
import { 
  Send, 
  CheckCircle2, 
  XCircle, 
  User, 
  Bot,
  Clock,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SupportTicket, SupportMessage } from '@/types/support';

interface TicketConversationProps {
  ticket: SupportTicket & { user?: any; company?: any };
  messages: SupportMessage[];
}

const statusLabels: Record<string, string> = {
  open: 'Nouveau',
  in_progress: 'En cours',
  waiting_client: 'En attente client',
  resolved: 'Résolu',
  closed: 'Clôturé',
};

const statusColors: Record<string, string> = {
  open: 'bg-red-500/20 text-red-300 border-red-500/30',
  in_progress: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  waiting_client: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  resolved: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  closed: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
};

export function TicketConversation({ ticket: initialTicket, messages: initialMessages }: TicketConversationProps) {
  const [reply, setReply] = useState('');
  const [localMessages, setLocalMessages] = useState<SupportMessage[]>(initialMessages);
  const [localTicket, setLocalTicket] = useState<SupportTicket>(initialTicket);
  
  const createMessage = useCreateMessage();
  const updateStatus = useUpdateTicketStatus();
  
  // Rafraîchir les données
  const { data: freshData } = useSupportTicket(initialTicket.id);
  
  useEffect(() => {
    if (freshData) {
      setLocalTicket(freshData.ticket);
      setLocalMessages(freshData.messages);
    }
  }, [freshData]);
  
  // Workflow automatique: passer en "in_progress" si le ticket est "open"
  useEffect(() => {
    if (localTicket.status === 'open') {
      updateStatus.mutate({ ticketId: localTicket.id, status: 'in_progress' });
      setLocalTicket(prev => ({ ...prev, status: 'in_progress' }));
    }
  }, [localTicket.id, localTicket.status]);
  
  const handleSendReply = async () => {
    if (!reply.trim()) return;
    
    try {
      // Envoyer le message
      await createMessage.mutateAsync({
        ticket_id: localTicket.id,
        content: reply.trim(),
        author_type: 'admin',
        is_internal: false,
      });
      
      // Mettre à jour le statut si nécessaire
      if (localTicket.status === 'waiting_client') {
        await updateStatus.mutateAsync({ ticketId: localTicket.id, status: 'in_progress' });
      }
      
      setReply('');
      toast.success('Réponse envoyée');
    } catch (error) {
      toast.error('Erreur lors de l\'envoi');
    }
  };
  
  const handleStatusChange = async (newStatus: 'waiting_client' | 'resolved' | 'closed') => {
    try {
      await updateStatus.mutateAsync({ ticketId: localTicket.id, status: newStatus });
      setLocalTicket(prev => ({ ...prev, status: newStatus }));
      toast.success(`Statut mis à jour: ${statusLabels[newStatus]}`);
    } catch (error) {
      toast.error('Erreur lors du changement de statut');
    }
  };
  
  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader className="border-b border-white/10">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-lg">Conversation</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={statusColors[localTicket.status]}>
              {statusLabels[localTicket.status]}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {/* Messages */}
        <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
          {/* Message initial (description du ticket) */}
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center shrink-0">
              <User className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-white">
                  {initialTicket.user?.first_name} {initialTicket.user?.last_name}
                </span>
                <span className="text-xs text-white/40">
                  {new Date(localTicket.created_at).toLocaleString('fr-FR')}
                </span>
              </div>
              <div className="bg-white/5 rounded-lg p-3 text-white/90 text-sm">
                <p className="whitespace-pre-wrap">{localTicket.description}</p>
              </div>
            </div>
          </div>
          
          {/* Messages de la conversation */}
          {localMessages.map((message) => (
            <MessageItem key={message.id} message={message} />
          ))}
          
          {localMessages.length === 0 && (
            <div className="text-center py-8 text-white/40">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucune réponse pour le moment</p>
              <p className="text-xs mt-1">Soyez le premier à répondre</p>
            </div>
          )}
        </div>
        
        {/* Zone de réponse */}
        <div className="p-4 border-t border-white/10 space-y-3">
          <Textarea
            placeholder="Écrivez votre réponse..."
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            className="bg-white/5 border-white/10 text-white placeholder:text-white/30 resize-none min-h-[100px]"
          />
          
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              {localTicket.status !== 'waiting_client' && localTicket.status !== 'resolved' && localTicket.status !== 'closed' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange('waiting_client')}
                  disabled={updateStatus.isPending}
                  className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  En attente client
                </Button>
              )}
              
              {localTicket.status !== 'resolved' && localTicket.status !== 'closed' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange('resolved')}
                  disabled={updateStatus.isPending}
                  className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Marquer résolu
                </Button>
              )}
              
              {localTicket.status !== 'closed' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange('closed')}
                  disabled={updateStatus.isPending}
                  className="border-slate-500/30 text-slate-400 hover:bg-slate-500/10"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Clôturer
                </Button>
              )}
            </div>
            
            <Button
              onClick={handleSendReply}
              disabled={!reply.trim() || createMessage.isPending}
              className="bg-cyan-500 hover:bg-cyan-600 text-white"
            >
              {createMessage.isPending ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Répondre
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MessageItem({ message }: { message: SupportMessage }) {
  const isAdmin = message.author_type === 'admin';
  const isSystem = message.author_type === 'system';
  
  if (isSystem) {
    return (
      <div className="flex justify-center">
        <div className="bg-white/5 rounded-full px-3 py-1 text-xs text-white/40 flex items-center gap-1">
          <Bot className="h-3 w-3" />
          {message.content}
        </div>
      </div>
    );
  }
  
  return (
    <div className={cn("flex gap-3", isAdmin && "flex-row-reverse")}>
      <div className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
        isAdmin ? "bg-purple-500/20" : "bg-cyan-500/20"
      )}>
        {isAdmin ? (
          <User className="h-4 w-4 text-purple-400" />
        ) : (
          <User className="h-4 w-4 text-cyan-400" />
        )}
      </div>
      <div className={cn("flex-1", isAdmin && "text-right")}>
        <div className={cn(
          "flex items-center gap-2 mb-1",
          isAdmin && "flex-row-reverse justify-start"
        )}>
          <span className="text-sm font-medium text-white">
            {isAdmin ? 'Support' : 'Client'}
          </span>
          <span className="text-xs text-white/40">
            {new Date(message.created_at).toLocaleString('fr-FR')}
          </span>
        </div>
        <div className={cn(
          "rounded-lg p-3 text-white/90 text-sm inline-block text-left",
          isAdmin ? "bg-purple-500/10 border border-purple-500/20" : "bg-white/5"
        )}>
          <p className="whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    </div>
  );
}
