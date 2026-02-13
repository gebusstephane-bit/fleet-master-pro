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
import { Edit, Trash2, Users, Eye } from 'lucide-react';
import { DeleteDialog } from '@/components/vehicles/delete-dialog';

interface Driver {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  license_number: string;
  license_expiry: string;
  status: string;
  vehicles?: { registration_number: string; brand: string; model: string } | null;
}

interface DriverTableProps {
  data: Driver[];
  isLoading: boolean;
  onDelete: (id: string) => Promise<void>;
}

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'Actif', variant: 'default' },
  inactive: { label: 'Inactif', variant: 'secondary' },
  on_leave: { label: 'En congé', variant: 'outline' },
  terminated: { label: 'Licencié', variant: 'destructive' },
};

export function DriverTable({ data, isLoading, onDelete }: DriverTableProps) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const columns: ColumnDef<Driver>[] = [
    {
      accessorKey: 'last_name',
      header: 'Nom',
      cell: ({ row }) => (
        <Link 
          href={`/drivers/${row.original.id}`}
          className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
        >
          {row.original.first_name} {row.original.last_name}
        </Link>
      ),
    },
    {
      accessorKey: 'email',
      header: 'Email',
    },
    {
      accessorKey: 'phone',
      header: 'Téléphone',
    },
    {
      accessorKey: 'license_number',
      header: 'N° Permis',
    },
    {
      accessorKey: 'license_expiry',
      header: 'Expiration',
      cell: ({ row }) => {
        const expiry = new Date(row.original.license_expiry);
        const isExpired = expiry < new Date();
        return (
          <span className={isExpired ? 'text-red-600 font-medium' : ''}>
            {expiry.toLocaleDateString('fr-FR')}
          </span>
        );
      },
    },
    {
      accessorKey: 'vehicles',
      header: 'Véhicule assigné',
      cell: ({ row }) => {
        const vehicle = row.original.vehicles;
        return vehicle ? `${vehicle.brand} ${vehicle.model}` : '-';
      },
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
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/drivers/${row.original.id}`)}
            title="Voir la fiche"
          >
            <Eye className="h-4 w-4 text-slate-500" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/drivers/${row.original.id}/edit`)}
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
        <Users className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">Aucun chauffeur</h3>
        <p className="text-muted-foreground">
          Commencez par ajouter votre premier chauffeur.
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
        title="Supprimer le chauffeur"
        description="Êtes-vous sûr de vouloir supprimer ce chauffeur ? Cette action est irréversible."
      />
    </>
  );
}
