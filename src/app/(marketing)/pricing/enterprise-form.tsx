'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Building2, Send, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface EnterpriseFormProps {
  onClose: () => void;
}

export function EnterpriseForm({ onClose }: EnterpriseFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    company: '',
    email: '',
    phone: '',
    vehicles: '',
    message: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simuler l'envoi (à remplacer par l'API réelle)
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setLoading(false);
    setSubmitted(true);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gray-900 p-6 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-lg">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">Enterprise</h3>
                <p className="text-sm text-gray-400">Demande de devis personnalisé</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {submitted ? (
              <div className="text-center py-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"
                >
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </motion.div>
                <h4 className="text-xl font-semibold text-gray-900 mb-2">
                  Demande envoyée !
                </h4>
                <p className="text-gray-600">
                  Notre équipe commerciale vous contactera sous 24h pour établir un devis adapté à vos besoins.
                </p>
                <Button 
                  onClick={onClose} 
                  className="mt-6"
                  variant="outline"
                >
                  Fermer
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="company">Nom de l'entreprise *</Label>
                  <Input
                    id="company"
                    required
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    placeholder="Transport Dupont SA"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email professionnel *</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="contact@entreprise.fr"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Téléphone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="01 23 45 67 89"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="vehicles">Nombre de véhicules *</Label>
                  <Input
                    id="vehicles"
                    type="number"
                    required
                    min="15"
                    value={formData.vehicles}
                    onChange={(e) => setFormData({ ...formData, vehicles: e.target.value })}
                    placeholder="20"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Minimum 15 véhicules pour le plan Enterprise
                  </p>
                </div>

                <div>
                  <Label htmlFor="message">Vos besoins spécifiques</Label>
                  <Textarea
                    id="message"
                    rows={4}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Décrivez vos besoins : intégrations, SSO, formation, hébergement dédié..."
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-gray-900 hover:bg-gray-800"
                  disabled={loading}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin">⏳</span>
                      Envoi en cours...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Send className="h-4 w-4" />
                      Envoyer la demande
                    </span>
                  )}
                </Button>

                <p className="text-xs text-center text-gray-500">
                  En envoyant cette demande, vous acceptez d'être contacté par notre équipe commerciale.
                </p>
              </form>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
