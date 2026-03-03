'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Loader2, Navigation } from 'lucide-react';
import { geocodeAddress } from '@/lib/mapbox/geocoding';
import { Badge } from '@/components/ui/badge';

interface DepotConfigProps {
  depot: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  };
  onChange: (depot: { name: string; address: string; latitude: number; longitude: number }) => void;
}

export function DepotConfig({ depot, onChange }: DepotConfigProps) {
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [editAddress, setEditAddress] = useState(depot.address);
  const [editName, setEditName] = useState(depot.name);
  const [isEditing, setIsEditing] = useState(false);

  const handleUpdateDepot = async () => {
    if (!editAddress.trim()) return;

    setIsGeocoding(true);
    try {
      const result = await geocodeAddress(editAddress);
      if (result) {
        const [lng, lat] = result.center;
        onChange({
          name: editName || 'Dépôt',
          address: result.place_name,
          latitude: lat,
          longitude: lng,
        });
        setIsEditing(false);
      } else {
        alert('Adresse non trouvée');
      }
    } catch (error) {
      console.error('Erreur géocodage:', error);
      alert('Erreur lors du géocodage');
    } finally {
      setIsGeocoding(false);
    }
  };

  if (isEditing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Navigation className="w-4 h-4" />
            Configurer le point de départ
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Nom du dépôt</Label>
            <Input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Ex: Entrepôt principal"
            />
          </div>
          <div>
            <Label>Adresse</Label>
            <div className="flex gap-2">
              <Input
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                placeholder="Adresse du dépôt..."
                onKeyDown={(e) => e.key === 'Enter' && handleUpdateDepot()}
              />
              <Button
                onClick={handleUpdateDepot}
                disabled={isGeocoding}
              >
                {isGeocoding ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Valider'}
              </Button>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
            Annuler
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Navigation className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-medium">{depot.name}</p>
              <p className="text-sm text-muted-foreground">{depot.address}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  <MapPin className="w-3 h-3 mr-1" />
                  {depot.latitude.toFixed(4)}, {depot.longitude.toFixed(4)}
                </Badge>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
            Modifier
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
