'use client';

/**
 * Support Widget - Bouton flottant et modal de création de ticket
 * S'affiche sur toutes les pages du dashboard
 */

import { useState } from 'react';
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useCreateTicket, useSupportStats } from '@/hooks/use-support';
import { 
  LifeBuoy, 
  MessageSquare, 
  X, 
  CheckCircle2, 
  Loader2,
  ExternalLink 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITY_LABELS,
  type TicketCategory,
  type TicketPriority,
} from '@/types/support';

export function SupportWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const pathname = usePathname();
  
  const { data: stats } = useSupportStats();
  const createTicket = useCreateTicket();
  
  // Formulaire
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
      
      setShowSuccess(true);
      setFormData({ subject: '', description: '', category: '', priority: 'medium' });
      
      // Reset après 3 secondes
      setTimeout(() => {
        setShowSuccess(false);
        setIsOpen(false);
      }, 3000);
    } catch (error) {
      toast.error('Impossible de créer le ticket. Veuillez réessayer.');
    }
  };
  
  // Ne pas afficher sur la page support (éviter redondance)
  if (pathname?.startsWith('/support')) return null;
  
  return (
    <>
      {/* Bouton flottant */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <button
            className={cn(
              'fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full px-4 py-3',
              'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg',
              'hover:shadow-xl hover:scale-105 transition-all duration-200',
              'border border-white/20'
            )}
          >
            <LifeBuoy className="h-5 w-5" />
            <span className="font-medium text-sm">Support</span>
            {stats && stats.open > 0 && (
              <Badge className="ml-1 bg-white text-cyan-600 h-5 min-w-5 flex items-center justify-center text-xs">
                {stats.open}
              </Badge>
            )}
          </button>
        </DialogTrigger>
        
        <DialogContent className="sm:max-w-lg bg-slate-900 border-slate-700 text-white">
          {showSuccess ? (
            <div className="py-8 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Ticket créé avec succès !
              </h3>
              <p className="text-slate-400 mb-4">
                Notre équipe vous répondra sous 24h ouvrées.
              </p>
              <Link href="/support">
                <Button variant="outline" className="border-slate-600">
                  Voir mes tickets
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-white">
                  <MessageSquare className="h-5 w-5 text-cyan-400" />
                  Contacter le support
                </DialogTitle>
                <DialogDescription className="text-slate-400">
                  Décrivez votre problème et nous vous répondrons rapidement.
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                {/* Catégorie */}
                <div className="space-y-2">
                  <Label htmlFor="category">Catégorie *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => 
                      setFormData(prev => ({ ...prev, category: value as TicketCategory }))
                    }
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue placeholder="Sélectionnez une catégorie" />
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
                
                {/* Sujet */}
                <div className="space-y-2">
                  <Label htmlFor="subject">Sujet *</Label>
                  <Input
                    id="subject"
                    placeholder="Ex: Problème de connexion"
                    value={formData.subject}
                    onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                  />
                </div>
                
                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Décrivez votre problème en détail..."
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 resize-none"
                  />
                  <p className="text-xs text-slate-500">
                    Page actuelle : {pathname}
                  </p>
                </div>
                
                {/* Priorité */}
                <div className="space-y-2">
                  <Label htmlFor="priority">Priorité</Label>
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
                
                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsOpen(false)}
                    className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800"
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
                      'Envoyer'
                    )}
                  </Button>
                </div>
                
                <p className="text-center text-xs text-slate-500 pt-2">
                  Vous pouvez aussi consulter{' '}
                  <Link href="/support" className="text-cyan-400 hover:underline">
                    vos tickets existants
                  </Link>
                </p>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
