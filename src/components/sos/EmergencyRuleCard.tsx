/**
 * EmergencyRuleCard - Affiche une carte de règle d'urgence (contrat, assurance, direction)
 * Version V3.2 - Arbre de décision
 */

'use client';

import { Phone, Shield, User, FileText, AlertTriangle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EmergencyRuleCardProps {
  rule: {
    id: string;
    name: string;
    rule_type: 'contract_24_7' | 'insurance' | 'management' | 'highway_service' | 'garage_partner';
    phone_number: string;
    contact_name?: string;
    contract_reference?: string;
    instructions?: string;
    display_color?: 'red' | 'orange' | 'green' | 'blue';
  };
  context?: string;
  warning?: string;
  nextSteps?: string[];
  showBypass?: boolean;
  onBypass?: () => void;
}

const RULE_TYPE_LABELS: Record<string, { label: string; icon: React.ElementType; colorClass: string }> = {
  contract_24_7: { 
    label: 'Contrat 24/7', 
    icon: Clock, 
    colorClass: 'text-green-600 bg-green-50 border-green-200' 
  },
  insurance: { 
    label: 'Assurance', 
    icon: Shield, 
    colorClass: 'text-orange-600 bg-orange-50 border-orange-200' 
  },
  management: { 
    label: 'Direction', 
    icon: User, 
    colorClass: 'text-blue-600 bg-blue-50 border-blue-200' 
  },
  highway_service: { 
    label: 'Service Autoroute', 
    icon: AlertTriangle, 
    colorClass: 'text-red-600 bg-red-50 border-red-200' 
  },
  garage_partner: { 
    label: 'Garage Partenaire', 
    icon: FileText, 
    colorClass: 'text-blue-600 bg-blue-50 border-blue-200' 
  }
};

export function EmergencyRuleCard({ 
  rule, 
  context, 
  warning, 
  nextSteps,
  showBypass,
  onBypass 
}: EmergencyRuleCardProps) {
  const typeInfo = RULE_TYPE_LABELS[rule.rule_type] || RULE_TYPE_LABELS.garage_partner;
  const Icon = typeInfo.icon;

  const getCardColor = () => {
    switch (rule.display_color || 'blue') {
      case 'red': return 'border-red-400 bg-red-50/50';
      case 'orange': return 'border-orange-400 bg-orange-50/50';
      case 'green': return 'border-green-400 bg-green-50/50';
      default: return 'border-blue-400 bg-blue-50/50';
    }
  };

  const getBadgeColor = () => {
    switch (rule.display_color || 'blue') {
      case 'red': return 'bg-red-100 text-red-700 border-red-200';
      case 'orange': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'green': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const handleCall = () => {
    window.location.href = `tel:${rule.phone_number.replace(/\D/g, '')}`;
  };

  return (
    <Card className={cn("border-2 shadow-lg", getCardColor())}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className={cn("p-2 rounded-lg border", typeInfo.colorClass)}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{rule.name}</h3>
              <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border", getBadgeColor())}>
                {typeInfo.label}
              </span>
            </div>
          </div>
        </div>
        
        {context && (
          <p className="text-sm text-gray-600 mt-2">{context}</p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Numéro principal */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Numéro à appeler</div>
              <div className="text-2xl font-bold text-gray-900">{rule.phone_number}</div>
              {rule.contact_name && (
                <div className="text-sm text-gray-600">{rule.contact_name}</div>
              )}
            </div>
            <Button 
              onClick={handleCall}
              size="lg"
              className="bg-green-600 hover:bg-green-700"
            >
              <Phone className="w-5 h-5 mr-2" />
              Appeler
            </Button>
          </div>
        </div>

        {/* Référence contrat */}
        {rule.contract_reference && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <FileText className="w-4 h-4" />
            <span>Référence: <strong>{rule.contract_reference}</strong></span>
          </div>
        )}

        {/* Instructions */}
        {rule.instructions && (
          <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
            <h4 className="font-medium text-sm mb-2">Instructions:</h4>
            <div className="text-sm text-gray-700 whitespace-pre-line">
              {rule.instructions}
            </div>
          </div>
        )}

        {/* Prochaines étapes */}
        {nextSteps && nextSteps.length > 0 && (
          <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
            <h4 className="font-medium text-sm mb-2">Prochaines étapes:</h4>
            <ol className="list-decimal list-inside text-sm text-gray-700 space-y-1">
              {nextSteps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>
        )}

        {/* Warning */}
        {warning && (
          <div className="flex items-start gap-2 text-sm text-orange-700 bg-orange-50 p-3 rounded-lg border border-orange-200">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{warning}</span>
          </div>
        )}

        {/* Bypass */}
        {showBypass && onBypass && (
          <div className="pt-2 border-t">
            <Button variant="ghost" size="sm" onClick={onBypass} className="text-gray-500">
              Ignorer et chercher un garage
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
