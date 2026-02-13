'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Edit, Trash2, Car, Eye } from 'lucide-react';
import { DeleteDialog } from './delete-dialog';

interface Vehicle {
  id: string;
  registration_number: string;
  brand: string;
  model: string;
  year: number;
  type: string;
  mileage: number;
  status: string;
  drivers?: { first_name: string; last_name: string } | null;
}

interface VehicleTableProps {
  data: Vehicle[];
  isLoading: boolean;
  onDelete: (id: string) => Promise<void>;
}

const vehicleTypeLabels: Record<string, string> = {
  truck: 'Camion',
  van: 'Fourgon',
  car: 'Voiture',
  motorcycle: 'Moto',
  trailer: 'Remorque',
};

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'Actif', variant: 'default' },
  inactive: { label: 'Inactif', variant: 'secondary' },
  maintenance: { label: 'Maintenance', variant: 'destructive' },
  retired: { label: 'Retiré', variant: 'outline' },
};

export function VehicleTable({ data, isLoading, onDelete }: VehicleTableProps) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const columns: ColumnDef<Vehicle>[] = [
    {
      accessorKey: 'registration_number',
      header: 'Immatriculation',
      cell: ({ row }) => (
        <Link 
          href={`/vehicles/${row.original.id}`}
          className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
        >
          {row.original.registration_number}
        </Link>
      ),
    },
    {
      accessorKey: 'brand',
      header: 'Marque',
    },
    {
      accessorKey: 'model',
      header: 'Modèle',
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => vehicleTypeLabels[row.original.type] || row.original.type,
    },
    {
      accessorKey: 'year',
      header: 'Année',
    },
    {
      accessorKey: 'mileage',
      header: 'Kilométrage',
      cell: ({ row }) => `${row.original.mileage.toLocaleString()} km`,
    },
    {
      accessorKey: 'status',
      header: 'Statut',
      cell: ({ row }) => {
        const status = statusLabels[row.original.status] || { label: row.original.status, variant: 'default' };
        return <Badge variant={status.variant}>{status.label}</Badge>;
      },
    },
    {
      accessorKey: 'drivers',
      header: 'Chauffeur',
      cell: ({ row }) => {
        const driver = row.original.drivers;
        return driver ? `${driver.first_name} ${driver.last_name}` : '-';
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/vehicles/${row.original.id}`)}
            title="Voir la fiche"
          >
            <Eye className="h-4 w-4 text-slate-500" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/vehicles/${row.original.id}/edit`)}
            title="Modifier"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeleteId(row.original.id)}
            title="Supprimer"
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Car className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">Aucun véhicule</h3>
        <p className="text-muted-foreground">
          Commencez par ajouter votre premier véhicule.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <DeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={async () => {
          if (deleteId) {
            await onDelete(deleteId);
            setDeleteId(null);
          }
        }}
        title="Supprimer le véhicule"
        description="Êtes-vous sûr de vouloir supprimer ce véhicule ? Cette action est irréversible."
      />
    </>
  );
}
