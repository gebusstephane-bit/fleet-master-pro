/**
 * Page Support - Centre d'aide client
 */

'use client';

import { useState } from 'react';
import { TicketList } from '@/components/support/TicketList';
import { TicketConversation } from '@/components/support/TicketConversation';
import { SupportWidget } from '@/components/support/SupportWidget';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useCreateTicket, useSupportStats } from '@/hooks/use-support';
import { useMediaQuery } from '@/hooks/use-media-query';
import type { SupportTicket } from '@/types/support';
import {
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITY_LABELS,
  type TicketCategory,
  type TicketPriority,
} from '@/types/support';
import {
  LifeBuoy,
  MessageSquare,
  Plus,
  Loader2,
  CheckCircle2,
  HelpCircle,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// Articles de la base de connaissances (statiques pour l'instant)
const kbArticles = [
  {
    icon: FileText,
    title: 'Guide de démarrage rapide',
    description: 'Premiers pas avec FleetMaster Pro',
    href: '#',
  },
  {
    icon: HelpCircle,
    title: 'FAQ - Questions fréquentes',
    description: 'Réponses aux problèmes courants',
    href: '#',
  },
  {
    icon: MessageSquare,
    title: 'Contacter le support',
    description: 'Créer un ticket de support',
    href: '#new-ticket',
  },
];

export default function SupportPage() {
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const isMobile = useMediaQuery('(max-width: 1024px)');
  const { data: stats } = useSupportStats();
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <LifeBuoy className="h-6 w-6 text-cyan-400" />
            Centre d'aide
          </h1>
          <p className="text-slate-400 mt-1">
            Besoin d'aide ? Consultez nos guides ou contactez notre équipe.
          </p>
        </div>
        
        <Dialog open={showNewTicket} onOpenChange={setShowNewTicket}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Nouveau ticket
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg bg-slate-900 border-slate-700 text-white">
            <NewTicketForm onSuccess={() => setShowNewTicket(false)} />
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Tickets ouverts"
          value={stats?.open || 0}
          icon={MessageSquare}
          color="cyan"
        />
        <StatCard
          label="En cours"
          value={stats?.in_progress || 0}
          icon={HelpCircle}
          color="yellow"
        />
        <StatCard
          label="Résolus"
          value={stats?.resolved || 0}
          icon={CheckCircle2}
          color="emerald"
        />
      </div>
      
      {/* Articles KB */}
      <div className="grid md:grid-cols-3 gap-4">
        {kbArticles.map((article) => (
          <Link
            key={article.title}
            href={article.href}
            onClick={(e) => {
              if (article.href === '#new-ticket') {
                e.preventDefault();
                setShowNewTicket(true);
              }
            }}
            className={cn(
              'p-4 rounded-xl border transition-all group',
              'bg-slate-900 border-slate-700 hover:border-cyan-500/30'
            )}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500/20 transition-colors">
                <article.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-white group-hover:text-cyan-400 transition-colors">
                  {article.title}
                </h3>
                <p className="text-sm text-slate-400 mt-0.5">
                  {article.description}
                </p>
              </div>
              <ExternalLink className="h-4 w-4 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>
        ))}
      </div>
      
      {/* Liste et Conversation */}
      <div className="grid lg:grid-cols-2 gap-6">
        <TicketList
          onSelectTicket={(ticket) => {
            setSelectedTicket(ticket);
            if (isMobile) {
              // Sur mobile, scroll vers le détail
              document.getElementById('ticket-detail')?.scrollIntoView({ behavior: 'smooth' });
            }
          }}
          selectedTicketId={selectedTicket?.id}
        />
        
        <div id="ticket-detail">
          {selectedTicket ? (
            <TicketConversation
              ticket={selectedTicket}
              onBack={() => setSelectedTicket(null)}
            />
          ) : (
            <div className="h-full flex items-center justify-center p-12 bg-slate-900/50 rounded-xl border border-slate-800 border-dashed">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">
                  Sélectionnez un ticket
                </h3>
                <p className="text-slate-400">
                  Choisissez un ticket dans la liste pour voir la conversation.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Widget flottant (pas besoin sur cette page) */}
    </div>
  );
}

function StatCard({ 
  label, 
  value, 
  icon: Icon, 
  color 
}: { 
  label: string; 
  value: number; 
  icon: React.ElementType;
  color: 'cyan' | 'yellow' | 'emerald';
}) {
  const colors = {
    cyan: 'from-cyan-500/20 to-blue-500/20 border-cyan-500/30 text-cyan-400',
    yellow: 'from-yellow-500/20 to-orange-500/20 border-yellow-500/30 text-yellow-400',
    emerald: 'from-emerald-500/20 to-green-500/20 border-emerald-500/30 text-emerald-400',
  };
  
  return (
    <div className={cn(
      'p-4 rounded-xl border bg-gradient-to-br',
      colors[color]
    )}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4" />
        <span className="text-sm font-medium opacity-80">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function NewTicketForm({ onSuccess }: { onSuccess: () => void }) {

  const createTicket = useCreateTicket();
  
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    category: '' as TicketCategory | '',
    priority: 'medium' as TicketPriority,
  });
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subject || !formData.description || !formData.category) {
      toast.error('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    
    try {
      await createTicket.mutateAsync({
        subject: formData.subject,
        description: formData.description,
        category: formData.category,
        priority: formData.priority,
        page_url: window.location.href,
      });
      
      toast.success('Ticket créé ! Notre équipe vous répondra sous 24h.');
      
      onSuccess();
    } catch (error) {
      toast.error('Impossible de créer le ticket.');
    }
  };
  
  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-white">Nouveau ticket de support</DialogTitle>
        <DialogDescription className="text-slate-400">
          Décrivez votre problème et nous vous répondrons rapidement.
        </DialogDescription>
      </DialogHeader>
      
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <div className="space-y-2">
          <Label>Catégorie *</Label>
          <Select
            value={formData.category}
            onValueChange={(value) => 
              setFormData(prev => ({ ...prev, category: value as TicketCategory }))
            }
          >
            <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
              <SelectValue placeholder="Sélectionnez" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              {Object.entries(TICKET_CATEGORY_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key} className="text-white">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label>Sujet *</Label>
          <Input
            value={formData.subject}
            onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
            placeholder="Ex: Problème de connexion"
            className="bg-slate-800 border-slate-700 text-white"
          />
        </div>
        
        <div className="space-y-2">
          <Label>Description *</Label>
          <Textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Décrivez votre problème..."
            rows={4}
            className="bg-slate-800 border-slate-700 text-white resize-none"
          />
        </div>
        
        <div className="space-y-2">
          <Label>Priorité</Label>
          <Select
            value={formData.priority}
            onValueChange={(value) => 
              setFormData(prev => ({ ...prev, priority: value as TicketPriority }))
            }
          >
            <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              {Object.entries(TICKET_PRIORITY_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key} className="text-white">
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onSuccess}
            className="flex-1 border-slate-600 text-slate-300"
          >
            Annuler
          </Button>
          <Button
            type="submit"
            disabled={createTicket.isPending}
            className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
          >
            {createTicket.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Envoi...
              </>
            ) : (
              'Créer le ticket'
            )}
          </Button>
        </div>
      </form>
    </>
  );
}
