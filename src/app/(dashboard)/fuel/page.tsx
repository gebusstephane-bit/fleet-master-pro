'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Fuel, Plus, TrendingUp, Droplets, Euro } from 'lucide-react';
import { useFuelRecords, useCreateFuelRecord, useFuelStats } from '@/hooks/use-fuel';
import { FuelForm } from '@/components/fuel/fuel-form';
import { Skeleton } from '@/components/ui/skeleton';
import { useState } from 'react';

export default function FuelPage() {
  const { data: recordsData, isLoading: isLoadingRecords } = useFuelRecords();
  const { data: stats, isLoading: isLoadingStats } = useFuelStats();
  const createMutation = useCreateFuelRecord();
  const [open, setOpen] = useState(false);
  
  // @ts-ignore
  const records = recordsData?.data || recordsData || [];
  
  const totalLiters = (records as any[])?.reduce((sum: number, r: any) => sum + (r.quantity_liters || 0), 0) || 0;
  const totalCost = (records as any[])?.reduce((sum: number, r: any) => sum + (r.price_total || 0), 0) || 0;
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Carburant</h1>
          <p className="text-muted-foreground">
            Suivi des consommations et dépenses
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau plein
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Enregistrer un plein</DialogTitle>
            </DialogHeader>
            <FuelForm
              onSubmit={async (data) => {
                await createMutation.mutateAsync(data);
                setOpen(false);
              }}
              isSubmitting={createMutation.isPending}
            />
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total pleins
            </CardTitle>
            <Fuel className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(records as any[])?.length || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Litres totals
            </CardTitle>
            <Droplets className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLiters.toFixed(0)} L</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Coût total
            </CardTitle>
            <Euro className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCost.toFixed(0)} €</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Moyenne/L
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalLiters > 0 ? (totalCost / totalLiters).toFixed(2) : '0.00'} €
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Liste des pleins */}
      <Card>
        <CardHeader>
          <CardTitle>Historique des pleins</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingRecords ? (
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (records as any[])?.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              Aucun plein enregistré
            </p>
          ) : (
            <div className="space-y-4">
              {(records as any[])?.map((record: any) => (
                <div key={record.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">
                      {/* @ts-ignore */}
                      {record.vehicles?.registration_number || record.vehicle_id}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(record.date).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{record.quantity_liters} L</p>
                    <p className="text-sm text-muted-foreground">{record.price_total} €</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
