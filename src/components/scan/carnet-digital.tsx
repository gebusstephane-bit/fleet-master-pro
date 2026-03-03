'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  ArrowLeft, 
  Truck,
  ClipboardCheck,
  Fuel,
  Wrench,
  Calendar,
  Gauge,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  QrCode,
  Download
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';

interface CarnetDigitalProps {
  vehicleId: string;
  accessToken: string;
  vehicleInfo: {
    id: string;
    registration_number: string;
    brand?: string;
    model?: string;
    type?: string;
    mileage?: number;
    insurance_expiry?: string | null;
    technical_control_expiry?: string | null;
  };
  inspections: any[];
  fuelRecords: any[];
  maintenances: any[];
}

export function CarnetDigital({ 
  vehicleId, 
  accessToken, 
  vehicleInfo, 
  inspections, 
  fuelRecords, 
  maintenances 
}: CarnetDigitalProps) {
  const [activeTab, setActiveTab] = useState('overview');

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const qrUrl = `${baseUrl}/scan/${vehicleId}?token=${accessToken}`;

  // Calculer les stats
  const avgConsumption = fuelRecords
    .filter((r: any) => r.consumption_l_per_100km)
    .reduce((acc: number, r: any, i: number, arr: any[]) => 
      acc + r.consumption_l_per_100km / arr.length, 0
    );

  const totalFuelCost = fuelRecords.reduce((acc: number, r: any) => acc + (r.price_total || 0), 0);
  const totalLiters = fuelRecords.reduce((acc: number, r: any) => acc + (r.quantity_liters || 0), 0);

  // Vérifier les documents à jour
  const now = new Date();
  const insuranceValid = vehicleInfo.insurance_expiry ? new Date(vehicleInfo.insurance_expiry) > now : false;
  const ctValid = vehicleInfo.technical_control_expiry ? new Date(vehicleInfo.technical_control_expiry) > now : false;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 p-4">
      <div className="max-w-6xl mx-auto py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Link href={`/scan/${vehicleId}?token=${accessToken}`}>
            <Button variant="ghost" size="sm" className="mb-4 -ml-2 text-slate-400">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Retour
            </Button>
          </Link>
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Carnet d&apos;entretien</h1>
                <p className="text-slate-400">{vehicleInfo.brand} {vehicleInfo.model} • {vehicleInfo.registration_number}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/30">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Actif
              </Badge>
            </div>
          </div>
        </motion.div>

        {/* Stats cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
        >
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <p className="text-slate-500 text-xs mb-1">Kilométrage</p>
              <p className="text-xl font-bold text-white">{vehicleInfo.mileage?.toLocaleString()} km</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <p className="text-slate-500 text-xs mb-1">Consommation moy.</p>
              <p className="text-xl font-bold text-white">
                {avgConsumption ? `${avgConsumption.toFixed(1)} L/100` : 'N/A'}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <p className="text-slate-500 text-xs mb-1">Coût carburant</p>
              <p className="text-xl font-bold text-white">{totalFuelCost.toFixed(0)} €</p>
            </CardContent>
          </Card>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-4">
              <p className="text-slate-500 text-xs mb-1">Volume total</p>
              <p className="text-xl font-bold text-white">{totalLiters.toFixed(0)} L</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Documents */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6"
        >
          <div className="flex gap-3">
            <Badge className={insuranceValid ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
              Assurance {insuranceValid ? '✓' : '✗'}
            </Badge>
            <Badge className={ctValid ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>
              Contrôle technique {ctValid ? '✓' : '✗'}
            </Badge>
          </div>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="bg-slate-800/50 border-slate-700">
            <TabsTrigger value="overview" className="data-[state=active]:bg-slate-700">
              Vue d&apos;ensemble
            </TabsTrigger>
            <TabsTrigger value="inspections" className="data-[state=active]:bg-slate-700">
              Inspections
            </TabsTrigger>
            <TabsTrigger value="fuel" className="data-[state=active]:bg-slate-700">
              Carburant
            </TabsTrigger>
            <TabsTrigger value="maintenance" className="data-[state=active]:bg-slate-700">
              Maintenance
            </TabsTrigger>
            <TabsTrigger value="qrcode" className="data-[state=active]:bg-slate-700">
              QR Code
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Dernière inspection */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ClipboardCheck className="w-5 h-5 text-blue-400" />
                    Dernière inspection
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {inspections[0] ? (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Date</span>
                        <span className="text-white">{new Date(inspections[0].created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Score</span>
                        <Badge className={inspections[0].score >= 90 ? 'bg-green-500/20 text-green-400' : inspections[0].score >= 75 ? 'bg-blue-500/20 text-blue-400' : 'bg-amber-500/20 text-amber-400'}>
                          {inspections[0].score}%
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Conducteur</span>
                        <span className="text-white">{inspections[0].driver_name || 'N/A'}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-slate-500 text-center py-4">Aucune inspection enregistrée</p>
                  )}
                </CardContent>
              </Card>

              {/* Dernier plein */}
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Fuel className="w-5 h-5 text-green-400" />
                    Dernier plein
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {fuelRecords[0] ? (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Date</span>
                        <span className="text-white">{new Date(fuelRecords[0].date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Quantité</span>
                        <span className="text-white">{fuelRecords[0].quantity_liters} L</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Prix</span>
                        <span className="text-white">{fuelRecords[0].price_total} €</span>
                      </div>
                      {fuelRecords[0].consumption_l_per_100km && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Conso.</span>
                          <Badge className="bg-cyan-500/20 text-cyan-400">
                            {fuelRecords[0].consumption_l_per_100km.toFixed(1)} L/100
                          </Badge>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-slate-500 text-center py-4">Aucun plein enregistré</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="inspections" className="space-y-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-lg">Historique des inspections</CardTitle>
              </CardHeader>
              <CardContent>
                {inspections.length > 0 ? (
                  <div className="space-y-3">
                    {inspections.map((inspection: any) => (
                      <div key={inspection.id} className="flex items-center justify-between p-3 bg-slate-800/40 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                            inspection.score >= 90 ? 'bg-green-500/20 text-green-400' :
                            inspection.score >= 75 ? 'bg-blue-500/20 text-blue-400' :
                            'bg-amber-500/20 text-amber-400'
                          }`}>
                            {inspection.score}%
                          </div>
                          <div>
                            <p className="text-white font-medium">{inspection.driver_name || 'Inconnu'}</p>
                            <p className="text-slate-500 text-sm">{new Date(inspection.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <Badge variant={inspection.status === 'COMPLETED' ? 'default' : 'secondary'}>
                          {inspection.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-8">Aucune inspection enregistrée</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fuel" className="space-y-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-lg">Historique carburant</CardTitle>
              </CardHeader>
              <CardContent>
                {fuelRecords.length > 0 ? (
                  <div className="space-y-3">
                    {fuelRecords.map((record: any) => (
                      <div key={record.id} className="flex items-center justify-between p-3 bg-slate-800/40 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                            <Fuel className="w-5 h-5 text-green-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium">{record.quantity_liters} L • {record.price_total} €</p>
                            <p className="text-slate-500 text-sm">{new Date(record.date).toLocaleDateString()}</p>
                          </div>
                        </div>
                        {record.consumption_l_per_100km && (
                          <Badge className="bg-cyan-500/20 text-cyan-400">
                            {record.consumption_l_per_100km.toFixed(1)} L/100
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-8">Aucun plein enregistré</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="maintenance" className="space-y-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-lg">Historique maintenance</CardTitle>
              </CardHeader>
              <CardContent>
                {maintenances.length > 0 ? (
                  <div className="space-y-3">
                    {maintenances.map((maintenance: any) => (
                      <div key={maintenance.id} className="flex items-center justify-between p-3 bg-slate-800/40 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                            <Wrench className="w-5 h-5 text-amber-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium">{maintenance.type}</p>
                            <p className="text-slate-500 text-sm truncate max-w-[200px]">{maintenance.description}</p>
                          </div>
                        </div>
                        <Badge variant={maintenance.status === 'TERMINEE' ? 'default' : 'secondary'}>
                          {maintenance.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-center py-8">Aucune maintenance enregistrée</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="qrcode" className="space-y-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <QrCode className="w-5 h-5" />
                  QR Code du véhicule
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="inline-block p-4 bg-white rounded-xl mb-4">
                  <QRCodeSVG value={qrUrl} size={200} level="M" />
                </div>
                <p className="text-slate-400 text-sm mb-4">
                  Scannez ce QR code pour accéder rapidement au véhicule
                </p>
                <p className="text-xs text-slate-600 font-mono break-all">
                  {qrUrl}
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
