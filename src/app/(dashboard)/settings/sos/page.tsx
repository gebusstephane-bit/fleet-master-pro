'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Phone, 
  MapPin, 
  Wrench, 
  Shield, 
  Building2,
  Plus,
  Trash2,
  Edit,
  AlertCircle,
  Clock,
  Car,
  Thermometer,
  Users
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
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
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

// Types
interface SOSProvider {
  id: string;
  name: string;
  specialty: string;
  phone_standard?: string;
  phone_24h?: string;
  max_distance_km: number;
  city: string;
  address?: string;
  is_active: boolean;
}

interface SOSContract {
  id: string;
  service_type: string;
  name: string;
  phone_number: string;
  contract_ref?: string;
  instructions: string;
  for_distance: string;
  for_immobilized: boolean | null;
  is_active: boolean;
}

const SPECIALTIES = [
  { value: 'pneu', label: 'Pneumatique', icon: Car },
  { value: 'mecanique', label: 'Mécanique', icon: Wrench },
  { value: 'frigo', label: 'Frigo / Groupe froid', icon: Thermometer },
  { value: 'carrosserie', label: 'Carrosserie', icon: Building2 },
  { value: 'general', label: 'Généraliste', icon: Wrench },
];

const SERVICE_TYPES = [
  { value: 'pneu_24h', label: 'Dépannage pneu 24/24', icon: Car },
  { value: 'frigo_assistance', label: 'Assistance frigo', icon: Thermometer },
  { value: 'mecanique_24h', label: 'Mécanique 24/24', icon: Wrench },
  { value: 'remorquage', label: 'Remorquage', icon: Car },
  { value: 'assurance', label: 'Assurance sinistres', icon: Shield },
  { value: 'direction', label: 'Direction', icon: Users },
];

export default function SOSSettingsPage() {
  const [providers, setProviders] = useState<SOSProvider[]>([]);
  const [contracts, setContracts] = useState<SOSContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('providers');

  // Fetch data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [providersRes, contractsRes] = await Promise.all([
        fetch('/api/sos/providers'),
        fetch('/api/sos/contracts'),
      ]);

      if (providersRes.ok) {
        const providersData = await providersRes.json();
        setProviders(providersData.providers || []);
      }

      if (contractsRes.ok) {
        const contractsData = await contractsRes.json();
        setContracts(contractsData.contracts || []);
      }
    } catch (error) {
      toast.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">🚨 SOS & Dépannage</h1>
        <p className="text-muted-foreground">
          Configurez vos prestataires et contrats d'urgence
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="providers" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Prestataires
          </TabsTrigger>
          <TabsTrigger value="contracts" className="flex items-center gap-2">
            <Phone className="w-4 h-4" />
            Contrats 24/24
          </TabsTrigger>
        </TabsList>

        <TabsContent value="providers" className="space-y-4">
          <ProvidersTab providers={providers} onUpdate={fetchData} />
        </TabsContent>

        <TabsContent value="contracts" className="space-y-4">
          <ContractsTab contracts={contracts} onUpdate={fetchData} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ==========================================
// TAB: PRESTATAIRES
// ==========================================
function ProvidersTab({ providers, onUpdate }: { providers: SOSProvider[]; onUpdate: () => void }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<SOSProvider | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce prestataire ?')) return;
    
    try {
      const res = await fetch(`/api/sos/providers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Prestataire supprimé');
        onUpdate();
      } else {
        toast.error('Erreur lors de la suppression');
      }
    } catch (error) {
      toast.error('Erreur réseau');
    }
  };

  return (
    <>
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Garages partenaires</h2>
          <p className="text-sm text-muted-foreground">
            {providers.length} prestataire{providers.length > 1 ? 's' : ''} configuré
            {providers.length > 1 ? 's' : ''}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingProvider(null)}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingProvider ? 'Modifier' : 'Ajouter'} un prestataire
              </DialogTitle>
            </DialogHeader>
            <ProviderForm 
              provider={editingProvider} 
              onSuccess={() => {
                setIsDialogOpen(false);
                onUpdate();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {providers.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Aucun prestataire configuré
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Ajoutez vos garages partenaires pour le dépannage
              </p>
            </CardContent>
          </Card>
        ) : (
          providers.map((provider) => (
            <Card key={provider.id} className={!provider.is_active ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{provider.name}</h3>
                      <Badge variant="outline">
                        {SPECIALTIES.find(s => s.value === provider.specialty)?.label || provider.specialty}
                      </Badge>
                      {!provider.is_active && (
                        <Badge variant="secondary">Inactif</Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {provider.city}
                      </span>
                      <span className="flex items-center gap-1">
                        <Car className="w-4 h-4" />
                        {provider.max_distance_km} km
                      </span>
                    </div>

                    <div className="flex items-center gap-4 mt-2">
                      {provider.phone_standard && (
                        <span className="text-sm flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          {provider.phone_standard}
                        </span>
                      )}
                      {provider.phone_24h && (
                        <span className="text-sm flex items-center gap-1 text-green-600">
                          <Clock className="w-4 h-4" />
                          24/24: {provider.phone_24h}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => {
                        setEditingProvider(provider);
                        setIsDialogOpen(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-red-600"
                      onClick={() => handleDelete(provider.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </>
  );
}

// ==========================================
// FORM: PRESTATAIRE
// ==========================================
function ProviderForm({ provider, onSuccess }: { provider: SOSProvider | null; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    name: provider?.name || '',
    specialty: provider?.specialty || 'general',
    phone_standard: provider?.phone_standard || '',
    phone_24h: provider?.phone_24h || '',
    max_distance_km: provider?.max_distance_km || 50,
    city: provider?.city || '',
    address: provider?.address || '',
    is_active: provider?.is_active ?? true,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = provider ? `/api/sos/providers/${provider.id}` : '/api/sos/providers';
      const method = provider ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success(provider ? 'Prestataire mis à jour' : 'Prestataire ajouté');
        onSuccess();
      } else {
        const error = await res.json();
        toast.error(error.message || 'Erreur');
      }
    } catch (error) {
      toast.error('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Nom du garage *</Label>
        <Input 
          value={formData.name}
          onChange={e => setFormData({...formData, name: e.target.value})}
          placeholder="Ex: Euromaster Metz"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Spécialité *</Label>
          <Select 
            value={formData.specialty}
            onValueChange={v => setFormData({...formData, specialty: v})}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SPECIALTIES.map(s => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Rayon d'action (km) *</Label>
          <Input 
            type="number"
            value={formData.max_distance_km}
            onChange={e => setFormData({...formData, max_distance_km: parseInt(e.target.value) || 50})}
            min="1"
            max="500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Téléphone standard</Label>
          <Input 
            value={formData.phone_standard}
            onChange={e => setFormData({...formData, phone_standard: e.target.value})}
            placeholder="03.87.XX.XX.XX"
          />
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Téléphone 24/24
          </Label>
          <Input 
            value={formData.phone_24h}
            onChange={e => setFormData({...formData, phone_24h: e.target.value})}
            placeholder="06.XX.XX.XX.XX (optionnel)"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Ville *</Label>
        <Input 
          value={formData.city}
          onChange={e => setFormData({...formData, city: e.target.value})}
          placeholder="Ex: Metz"
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Adresse complète</Label>
        <Textarea 
          value={formData.address}
          onChange={e => setFormData({...formData, address: e.target.value})}
          placeholder="Adresse complète (optionnel)"
          rows={2}
        />
      </div>

      <div className="flex items-center gap-2">
        <Switch 
          checked={formData.is_active}
          onCheckedChange={v => setFormData({...formData, is_active: v})}
        />
        <Label>Prestataire actif</Label>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Enregistrement...' : (provider ? 'Mettre à jour' : 'Ajouter')}
      </Button>
    </form>
  );
}

// ==========================================
// TAB: CONTRATS
// ==========================================
function ContractsTab({ contracts, onUpdate }: { contracts: SOSContract[]; onUpdate: () => void }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<SOSContract | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce contrat ?')) return;
    
    try {
      const res = await fetch(`/api/sos/contracts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Contrat supprimé');
        onUpdate();
      } else {
        toast.error('Erreur lors de la suppression');
      }
    } catch (error) {
      toast.error('Erreur réseau');
    }
  };

  return (
    <>
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Contrats d'urgence</h2>
          <p className="text-sm text-muted-foreground">
            {contracts.length} contrat{contracts.length > 1 ? 's' : ''} configuré
            {contracts.length > 1 ? 's' : ''}
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingContract(null)}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingContract ? 'Modifier' : 'Ajouter'} un contrat
              </DialogTitle>
            </DialogHeader>
            <ContractForm 
              contract={editingContract}
              onSuccess={() => {
                setIsDialogOpen(false);
                onUpdate();
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {contracts.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <Phone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Aucun contrat d'urgence configuré
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Ajoutez vos numéros d'astreinte 24/24 et assurances
              </p>
            </CardContent>
          </Card>
        ) : (
          contracts.map((contract) => (
            <Card key={contract.id} className={!contract.is_active ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{contract.name}</h3>
                      <Badge 
                        variant={contract.service_type === 'assurance' ? 'secondary' : 'default'}
                      >
                        {SERVICE_TYPES.find(s => s.value === contract.service_type)?.label || contract.service_type}
                      </Badge>
                      {!contract.is_active && (
                        <Badge variant="secondary">Inactif</Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 text-lg font-bold text-green-600">
                      <Phone className="w-5 h-5" />
                      {contract.phone_number}
                    </div>

                    {contract.contract_ref && (
                      <p className="text-sm text-muted-foreground">
                        Réf: {contract.contract_ref}
                      </p>
                    )}

                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-xs">
                        Distance: {contract.for_distance === 'close' ? '< 50km' : contract.for_distance === 'far' ? '> 50km' : 'Toutes'}
                      </Badge>
                      {contract.for_immobilized !== null && (
                        <Badge variant="outline" className="text-xs">
                          {contract.for_immobilized ? 'Immobilisé uniquement' : 'Roulant uniquement'}
                        </Badge>
                      )}
                    </div>

                    {contract.instructions && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {contract.instructions}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => {
                        setEditingContract(contract);
                        setIsDialogOpen(true);
                      }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="text-red-600"
                      onClick={() => handleDelete(contract.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </>
  );
}

// ==========================================
// FORM: CONTRAT
// ==========================================
function ContractForm({ contract, onSuccess }: { contract: SOSContract | null; onSuccess: () => void }) {
  const [formData, setFormData] = useState({
    service_type: contract?.service_type || 'pneu_24h',
    name: contract?.name || '',
    phone_number: contract?.phone_number || '',
    contract_ref: contract?.contract_ref || '',
    instructions: contract?.instructions || '',
    for_distance: contract?.for_distance || 'both',
    for_immobilized: contract?.for_immobilized ?? null as boolean | null,
    is_active: contract?.is_active ?? true,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = contract ? `/api/sos/contracts/${contract.id}` : '/api/sos/contracts';
      const method = contract ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        toast.success(contract ? 'Contrat mis à jour' : 'Contrat ajouté');
        onSuccess();
      } else {
        const error = await res.json();
        toast.error(error.message || 'Erreur');
      }
    } catch (error) {
      toast.error('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Type de service *</Label>
        <Select 
          value={formData.service_type}
          onValueChange={v => setFormData({...formData, service_type: v})}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SERVICE_TYPES.map(s => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Nom du service *</Label>
        <Input 
          value={formData.name}
          onChange={e => setFormData({...formData, name: e.target.value})}
          placeholder="Ex: Euromaster Astreinte"
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Numéro de téléphone *</Label>
        <Input 
          value={formData.phone_number}
          onChange={e => setFormData({...formData, phone_number: e.target.value})}
          placeholder="06.XX.XX.XX.XX"
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Référence contrat</Label>
        <Input 
          value={formData.contract_ref}
          onChange={e => setFormData({...formData, contract_ref: e.target.value})}
          placeholder="Ex: CTR-2024-001 (optionnel)"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Distance concernée</Label>
          <Select 
            value={formData.for_distance}
            onValueChange={v => setFormData({...formData, for_distance: v})}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="close">Moins de 50 km</SelectItem>
              <SelectItem value="far">Plus de 50 km</SelectItem>
              <SelectItem value="both">Toutes distances</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>État du véhicule</Label>
          <Select 
            value={formData.for_immobilized === null ? 'any' : formData.for_immobilized ? 'immobilized' : 'rolling'}
            onValueChange={v => setFormData({...formData, for_immobilized: v === 'any' ? null : v === 'immobilized'})}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Peu importe</SelectItem>
              <SelectItem value="immobilized">Immobilisé uniquement</SelectItem>
              <SelectItem value="rolling">Roulant uniquement</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Instructions à afficher</Label>
        <Textarea 
          value={formData.instructions}
          onChange={e => setFormData({...formData, instructions: e.target.value})}
          placeholder="Instructions pour le chauffeur (ex: Restez à l'arrêt, précisez votre position...)"
          rows={4}
        />
      </div>

      <div className="flex items-center gap-2">
        <Switch 
          checked={formData.is_active}
          onCheckedChange={v => setFormData({...formData, is_active: v})}
        />
        <Label>Contrat actif</Label>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Enregistrement...' : (contract ? 'Mettre à jour' : 'Ajouter')}
      </Button>
    </form>
  );
}
