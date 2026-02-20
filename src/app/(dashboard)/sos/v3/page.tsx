/**
 * SOS Garage V3.2 - Page unifiée
 * Nouvelle interface avec arbre de décision intelligent
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SOSGarageCard } from '@/components/sos/SOSGarageCard';
import { toast } from 'sonner';

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  type?: string;
  registration_number: string;
}

export default function SOSV3Page() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const response = await fetch('/api/sos/vehicles');
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error);
      
      setVehicles(data.vehicles);
    } catch (error: any) {
      toast.error('Erreur lors du chargement des véhicules');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto flex items-center justify-center h-96">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-4">
        <Button 
          variant="ghost" 
          onClick={() => router.push('/sos')}
          className="text-gray-600"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
      </div>

      <SOSGarageCard vehicles={vehicles} />
    </div>
  );
}
