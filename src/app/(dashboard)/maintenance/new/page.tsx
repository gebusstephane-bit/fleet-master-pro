'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, Save, Wrench, Calendar, DollarSign, 
  MapPin, FileText, Upload, Calculator, AlertCircle
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { useCreateMaintenance } from '@/hooks/use-maintenance';
import { useVehicles } from '@/hooks/use-vehicles';
import { maintenanceTypeConfig, calculateNextService } from '@/lib/schemas/maintenance';
import { toast } from 'sonner';
import { format, addMonths } from 'date-fns';

// Composant qui utilise useSearchParams
function NewMaintenanceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedVehicleId = searchParams.get('vehicleId');
  
  const { data: vehicles } = useVehicles();
  const createMutation = useCreateMaintenance();

  const [vehicleId, setVehicleId] = useState(preselectedVehicleId || '');
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState('');
  const [mileageAtService, setMileageAtService] = useState('');
  const [serviceDate, setServiceDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [garage, setGarage] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [notes, setNotes] = useState('');
  
  // Programme prochain entretien
  const [scheduleNext, setScheduleNext] = useState(false);
  const [nextServiceDue, setNextServiceDue] = useState('');
  const [nextServiceMileage, setNextServiceMileage] = useState('');

  // Auto-remplir le kilométrage quand on sélectionne un véhicule
  useEffect(() => {
    if (vehicleId) {
      const vehicle = vehicles?.find((v: any) => v.id === vehicleId);
      if (vehicle?.mileage) {
        setMileageAtService(vehicle.mileage.toString());
      }
    }
  }, [vehicleId, vehicles]);

  // Calculer prochain entretien quand le type change
  useEffect(() => {
    if (type && mileageAtService && serviceDate) {
      const result = calculateNextService(
        type as keyof typeof maintenanceTypeConfig,
        parseInt(mileageAtService) || 0,
        serviceDate
      );
      
      if (result.nextMileage) {
        setNextServiceMileage(result.nextMileage.toString());
      }
      if (result.nextDate) {
        setNextServiceDue(result.nextDate);
      }
    }
  }, [type, mileageAtService, serviceDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!vehicleId || !type || !description) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    await createMutation.mutateAsync({
      vehicleId,
      type: type as any,
      description,
      cost: parseFloat(cost) || 0,
      mileageAtService: parseInt(mileageAtService) || 0,
      serviceDate,
      garage: garage || undefined,
      invoiceNumber: invoiceNumber || undefined,
      notes: notes || undefined,
      nextServiceDue: scheduleNext ? nextServiceDue : undefined,
      nextServiceMileage: scheduleNext ? parseInt(nextServiceMileage) : undefined,
      status: 'COMPLETED',
      priority: 'NORMAL',
    });

    router.push('/maintenance');
  };

  const selectedVehicle = vehicles?.find((v: any) => v.id === vehicleId);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Nouvelle intervention"
        description="Enregistrer une réparation ou un entretien"
        backHref="/maintenance"
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informations principales */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              Informations de l&apos;intervention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vehicle">Véhicule *</Label>
                <Select value={vehicleId} onValueChange={setVehicleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un véhicule" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles?.map((v: any) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.registration_number} - {v.brand} {v.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Type d&apos;intervention *</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner le type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(maintenanceTypeConfig).map(([key, config]) => (
                      <SelectItem key={key} value={key}>
                        <div className="flex items-center gap-2">
                          <span>{config.label}</span>
                          {(config as any).defaultIntervalKm && (
                            <Badge variant="secondary" className="text-xs">
                              Tous les {(config as any).defaultIntervalKm.toLocaleString('fr-FR')} km
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez l'intervention effectuée..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="serviceDate">Date *</Label>
                <Input
                  id="serviceDate"
                  type="date"
                  value={serviceDate}
                  onChange={(e) => setServiceDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mileage">Kilométrage *</Label>
                <Input
                  id="mileage"
                  type="number"
                  value={mileageAtService}
                  onChange={(e) => setMileageAtService(e.target.value)}
                  placeholder={selectedVehicle?.mileage?.toString() || '0'}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cost">Coût total (€)</Label>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="garage">Garage / Prestataire</Label>
                <Input
                  id="garage"
                  value={garage}
                  onChange={(e) => setGarage(e.target.value)}
                  placeholder="Nom du garage"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invoice">N° de facture</Label>
                <Input
                  id="invoice"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="FAC-2024-001"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes complémentaires</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Informations supplémentaires..."
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Prochain entretien */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Prochain entretien
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start space-x-3 mb-4">
              <Checkbox
                id="scheduleNext"
                checked={scheduleNext}
                onCheckedChange={(checked) => setScheduleNext(checked as boolean)}
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="scheduleNext" className="font-medium">
                  Programmer le prochain entretien
                </Label>
                <p className="text-sm text-muted-foreground">
                  Définir la date et/ou le kilométrage du prochain entretien préventif
                </p>
              </div>
            </div>

            {scheduleNext && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-7">
                <div className="space-y-2">
                  <Label htmlFor="nextDate">Date prévue</Label>
                  <Input
                    id="nextDate"
                    type="date"
                    value={nextServiceDue}
                    onChange={(e) => setNextServiceDue(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nextMileage">Kilométrage prévu</Label>
                  <Input
                    id="nextMileage"
                    type="number"
                    value={nextServiceMileage}
                    onChange={(e) => setNextServiceMileage(e.target.value)}
                    placeholder="Ex: 150000"
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Récap véhicule */}
        {selectedVehicle && (
          <Card className="bg-muted/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <AlertCircle className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{selectedVehicle.registration_number}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedVehicle.brand} {selectedVehicle.model} • {selectedVehicle.mileage?.toLocaleString('fr-FR')} km
                  </p>
                  {((selectedVehicle as any).next_service_due || (selectedVehicle as any).next_service_mileage) && (
                    <p className="text-sm text-amber-600 mt-1">
                      Prochain entretien: {(selectedVehicle as any).next_service_due && format(new Date((selectedVehicle as any).next_service_due), 'dd/MM/yyyy')} 
                      {(selectedVehicle as any).next_service_mileage && `ou ${(selectedVehicle as any).next_service_mileage.toLocaleString('fr-FR')} km`}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Boutons */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" asChild>
            <Link href="/maintenance">Annuler</Link>
          </Button>
          <Button 
            type="submit" 
            disabled={createMutation.isPending || !vehicleId || !type || !description}
            className="gap-2"
          >
            <Save className="h-4 w-4" />
            {createMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </div>
      </form>
    </div>
  );
}

// Loading fallback
function NewMaintenanceSkeleton() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="h-8 w-64 bg-slate-200 rounded animate-pulse" />
      <div className="h-96 bg-white rounded-lg shadow animate-pulse" />
    </div>
  );
}

// Export avec Suspense
export default function NewMaintenancePage() {
  return (
    <Suspense fallback={<NewMaintenanceSkeleton />}>
      <NewMaintenanceContent />
    </Suspense>
  );
}
