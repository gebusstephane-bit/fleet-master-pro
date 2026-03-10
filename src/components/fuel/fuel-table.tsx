'use client';

import { useState, useMemo } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Fuel, Eye, Trash2, ArrowUpDown, ArrowUp, ArrowDown, Fuel as FuelIcon, AlertTriangle } from 'lucide-react';
import { FuelRecord, FUEL_TYPE_CONFIG, getConsumptionIndicator } from '@/types/fuel';
import { detectFuelAnomaly, computeVehicleAverages } from '@/lib/fuel-anomaly-detector';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { FuelRecordDetail } from './fuel-record-detail';
import { cn } from '@/lib/utils';
import {
  TablePagination,
} from '@/components/ui/table-pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FuelTableProps {
  records: FuelRecord[];
  isLoading?: boolean;
  onDelete?: (id: string) => void;
  userRole?: string;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
}

type SortField = 'date' | 'vehicle' | 'fuel_type' | 'quantity_liters' | 'price_total' | 'mileage_at_fill' | 'consumption_l_per_100km';
type SortDirection = 'asc' | 'desc';

export function FuelTable({
  records,
  isLoading,
  onDelete,
  userRole,
  selectedIds = [],
  onSelectionChange,
}: FuelTableProps) {
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedRecord, setSelectedRecord] = useState<FuelRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const canDelete = userRole === 'ADMIN' || userRole === 'AGENT_DE_PARC';

  // Moyenne de consommation par véhicule (basée sur tous les records reçus)
  const vehicleAverages = useMemo(() => computeVehicleAverages(records), [records]);

  const handleViewDetail = (record: FuelRecord) => {
    setSelectedRecord(record);
    setDetailOpen(true);
  };

  // Tri des données
  const sortedRecords = [...records].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortField) {
      case 'date':
        aValue = new Date(a.date).getTime();
        bValue = new Date(b.date).getTime();
        break;
      case 'vehicle':
        aValue = a.vehicles?.registration_number || '';
        bValue = b.vehicles?.registration_number || '';
        break;
      case 'fuel_type':
        aValue = a.fuel_type;
        bValue = b.fuel_type;
        break;
      case 'quantity_liters':
        aValue = a.quantity_liters;
        bValue = b.quantity_liters;
        break;
      case 'price_total':
        aValue = a.price_total;
        bValue = b.price_total;
        break;
      case 'mileage_at_fill':
        aValue = a.mileage_at_fill;
        bValue = b.mileage_at_fill;
        break;
      case 'consumption_l_per_100km':
        aValue = a.consumption_l_per_100km || 0;
        bValue = b.consumption_l_per_100km || 0;
        break;
      default:
        return 0;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(sortedRecords.length / pageSize);
  const paginatedRecords = sortedRecords.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const toggleSelection = (id: string) => {
    if (!onSelectionChange) return;
    const newSelection = selectedIds.includes(id)
      ? selectedIds.filter((sid) => sid !== id)
      : [...selectedIds, id];
    onSelectionChange(newSelection);
  };

  const toggleAllSelection = () => {
    if (!onSelectionChange) return;
    const pageIds = paginatedRecords.map((r) => r.id);
    const allSelected = pageIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      onSelectionChange(selectedIds.filter((id) => !pageIds.includes(id)));
    } else {
      onSelectionChange(Array.from(new Set([...selectedIds, ...pageIds])));
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="ml-2 h-3 w-3" />;
    return sortDirection === 'asc' ? (
      <ArrowUp className="ml-2 h-3 w-3" />
    ) : (
      <ArrowDown className="ml-2 h-3 w-3" />
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="h-20 w-20 rounded-full bg-[#18181b] flex items-center justify-center mb-4">
          <FuelIcon className="h-10 w-10 text-[#52525b]" />
        </div>
        <h3 className="text-lg font-medium text-white mb-2">Aucun plein enregistré</h3>
        <p className="text-sm text-[#71717a] max-w-sm">
          Scannez le QR code du véhicule pour ajouter un plein depuis le terrain, ou utilisez le bouton &quot;Nouveau plein&quot;.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tableau */}
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {onSelectionChange && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={
                      paginatedRecords.length > 0 &&
                      paginatedRecords.every((r) => selectedIds.includes(r.id))
                    }
                    onCheckedChange={toggleAllSelection}
                  />
                </TableHead>
              )}
              <TableHead className="cursor-pointer" onClick={() => handleSort('date')}>
                <div className="flex items-center">
                  Date
                  <SortIcon field="date" />
                </div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('vehicle')}>
                <div className="flex items-center">
                  Véhicule
                  <SortIcon field="vehicle" />
                </div>
              </TableHead>
              <TableHead>Conducteur</TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('fuel_type')}>
                <div className="flex items-center">
                  Type
                  <SortIcon field="fuel_type" />
                </div>
              </TableHead>
              <TableHead className="cursor-pointer text-right" onClick={() => handleSort('quantity_liters')}>
                <div className="flex items-center justify-end">
                  Quantité
                  <SortIcon field="quantity_liters" />
                </div>
              </TableHead>
              <TableHead className="cursor-pointer text-right" onClick={() => handleSort('price_total')}>
                <div className="flex items-center justify-end">
                  Prix Total
                  <SortIcon field="price_total" />
                </div>
              </TableHead>
              <TableHead className="cursor-pointer text-right" onClick={() => handleSort('mileage_at_fill')}>
                <div className="flex items-center justify-end">
                  Km
                  <SortIcon field="mileage_at_fill" />
                </div>
              </TableHead>
              <TableHead className="cursor-pointer text-right" onClick={() => handleSort('consumption_l_per_100km')}>
                <div className="flex items-center justify-end">
                  Conso
                  <SortIcon field="consumption_l_per_100km" />
                </div>
              </TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedRecords.map((record) => {
              const fuelConfig = FUEL_TYPE_CONFIG[record.fuel_type];
              const consumptionIndicator = getConsumptionIndicator(record.consumption_l_per_100km);
              const vehicleAvg = vehicleAverages.get(record.vehicle_id) ?? 0;
              const anomaly = detectFuelAnomaly(
                record.consumption_l_per_100km,
                vehicleAvg,
                record.vehicles?.type
              );

              return (
                <TableRow
                  key={record.id}
                  className={cn(
                    'transition-colors',
                    selectedIds.includes(record.id) && 'bg-cyan-500/10'
                  )}
                >
                  {onSelectionChange && (
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(record.id)}
                        onCheckedChange={() => toggleSelection(record.id)}
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="font-medium">
                      {new Date(record.date).toLocaleDateString('fr-FR')}
                    </div>
                    <div className="text-xs text-[#52525b]">
                      {new Date(record.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {record.vehicles?.registration_number || 'N/A'}
                    </div>
                    <div className="text-xs text-[#52525b]">
                      {record.vehicles?.brand} {record.vehicles?.model}
                    </div>
                    {record.vehicles?.type && (
                      <Badge variant="outline" className="text-xs mt-1">
                        {record.vehicles.type}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {record.driver_name ? (
                      <span className="font-medium">{record.driver_name}</span>
                    ) : record.drivers ? (
                      `${record.drivers.first_name} ${record.drivers.last_name}`
                    ) : (
                      <span className="text-[#52525b] italic">Anonyme</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={cn(fuelConfig.bgColor, fuelConfig.color, 'border-0')}>
                      <Fuel className="mr-1 h-3 w-3" />
                      {fuelConfig.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {record.quantity_liters?.toFixed(2) || '0.00'} L
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {record.price_total ? `${record.price_total.toFixed(2)} €` : <span className="text-[#52525b] italic">Non renseigné</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    {record.mileage_at_fill ? record.mileage_at_fill.toLocaleString('fr-FR') : <span className="text-[#52525b]">-</span>}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {record.consumption_l_per_100km ? (
                        <Badge
                          variant="outline"
                          className={cn(
                            consumptionIndicator.bgColor,
                            consumptionIndicator.color,
                            'border-0'
                          )}
                        >
                          {record.consumption_l_per_100km.toFixed(1)} L/100
                        </Badge>
                      ) : (
                        <span className="text-[#52525b]">-</span>
                      )}
                      {anomaly.isAnomaly && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge
                                className={cn(
                                  'border-0 text-xs cursor-help',
                                  anomaly.severity === 'critical'
                                    ? 'bg-red-500/20 text-red-400'
                                    : 'bg-amber-500/20 text-amber-400'
                                )}
                              >
                                <AlertTriangle className="mr-1 h-3 w-3" />
                                {anomaly.deviationPercent > 0 ? '+' : ''}{anomaly.deviationPercent.toFixed(0)}%
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p className="text-xs">{anomaly.message}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8"
                        onClick={() => handleViewDetail(record)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {canDelete && onDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          onClick={() => onDelete(record.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-[#52525b]">
          <span>
            {records.length} résultat{records.length > 1 ? 's' : ''}
          </span>
          <Select
            value={pageSize.toString()}
            onValueChange={(v) => {
              setPageSize(Number(v));
              setCurrentPage(1);
            }}
          >
            <SelectTrigger className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
            </SelectContent>
          </Select>
          <span>par page</span>
        </div>

        {totalPages > 1 && (
          <TablePagination
            page={currentPage}
            totalPages={totalPages}
            totalItems={records.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {/* Modal de détail */}
      <FuelRecordDetail
        record={selectedRecord}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      />
    </div>
  );
}
