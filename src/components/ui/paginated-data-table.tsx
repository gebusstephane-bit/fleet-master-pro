/**
 * Paginated Data Table - DataTable avec pagination côté client
 */

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
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { TableSkeleton } from './skeletons';

export interface Column<T> {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
}

interface PaginatedDataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  className?: string;
  pageSize?: number;
  pageSizeOptions?: number[];
  searchable?: boolean;
  searchKeys?: string[];
  searchValue?: string;
}

export function PaginatedDataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  isLoading,
  emptyState,
  className,
  pageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  searchable = false,
  searchKeys = [],
  searchValue = '',
}: PaginatedDataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageSize, setCurrentPageSize] = useState(pageSize);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!searchable || !searchValue || searchKeys.length === 0) {
      return data;
    }

    const searchLower = searchValue.toLowerCase();
    return data.filter((item) =>
      searchKeys.some((key) => {
        const value = (item as any)[key];
        if (typeof value === 'string') {
          return value.toLowerCase().includes(searchLower);
        }
        if (typeof value === 'number') {
          return value.toString().includes(searchLower);
        }
        return false;
      })
    );
  }, [data, searchable, searchKeys, searchValue]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = (a as any)[sortColumn];
      const bValue = (b as any)[sortColumn];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      const comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortColumn, sortDirection]);

  // Paginate data
  const totalPages = Math.ceil(sortedData.length / currentPageSize);
  const startIndex = (currentPage - 1) * currentPageSize;
  const paginatedData = sortedData.slice(startIndex, startIndex + currentPageSize);

  // Reset to first page when search or page size changes
  useMemo(() => {
    setCurrentPage(1);
  }, [searchValue, currentPageSize]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  if (isLoading) {
    return <TableSkeleton columns={columns.length} rows={currentPageSize} />;
  }

  if (filteredData.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div className="space-y-4">
      <div className={cn('rounded-xl border border-slate-700 overflow-hidden', className)}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-800 hover:bg-gray-800 border-b border-slate-700">
                {columns.map((column) => (
                  <TableHead
                    key={column.key}
                    style={column.width ? { width: column.width, minWidth: column.width } : undefined}
                    className={cn(
                      'py-3 px-4 text-xs font-semibold text-slate-300 uppercase tracking-wider',
                      column.align === 'center' && 'text-center',
                      column.align === 'right' && 'text-right',
                      column.sortable && 'cursor-pointer hover:text-white select-none'
                    )}
                    onClick={() => column.sortable && handleSort(column.key)}
                  >
                    <div
                      className={cn(
                        'flex items-center gap-1',
                        column.align === 'center' && 'justify-center',
                        column.align === 'right' && 'justify-end'
                      )}
                    >
                      {column.header}
                      {column.sortable && (
                        <span className="text-slate-500">
                          {sortColumn === column.key ? (
                            sortDirection === 'asc' ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-50" />
                          )}
                        </span>
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((item, index) => (
                <TableRow
                  key={keyExtractor(item)}
                  onClick={() => onRowClick?.(item)}
                  className={cn(
                    'group transition-colors duration-150',
                    onRowClick && 'cursor-pointer',
                    index % 2 === 0 ? 'bg-gray-900' : 'bg-gray-800/50',
                    'hover:bg-blue-900/20',
                    'border-b border-slate-800 last:border-0'
                  )}
                >
                  {columns.map((column) => (
                    <TableCell
                      key={`${keyExtractor(item)}-${column.key}`}
                      style={column.width ? { width: column.width, minWidth: column.width } : undefined}
                      className={cn(
                        'py-3 px-4 text-sm',
                        column.align === 'center' && 'text-center',
                        column.align === 'right' && 'text-right'
                      )}
                    >
                      {column.render ? column.render(item) : (item as any)[column.key]}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-400">
            Affichage de {startIndex + 1} à{' '}
            {Math.min(startIndex + currentPageSize, sortedData.length)} sur{' '}
            {sortedData.length} entrées
          </div>

          <div className="flex items-center gap-2">
            {/* Page size selector */}
            <select
              value={currentPageSize}
              onChange={(e) => setCurrentPageSize(Number(e.target.value))}
              className="h-9 px-2 rounded-md bg-[#18181b] border border-slate-700 text-sm text-white"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size} / page
                </option>
              ))}
            </select>

            {/* Page navigation */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 border-slate-700 bg-[#18181b] hover:bg-[#27272a]"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              {getPageNumbers().map((page, index) =>
                page === '...' ? (
                  <span key={index} className="px-2 text-slate-500">
                    ...
                  </span>
                ) : (
                  <Button
                    key={index}
                    variant={currentPage === page ? 'default' : 'outline'}
                    size="icon"
                    className={cn(
                      'h-9 w-9',
                      currentPage === page
                        ? 'bg-blue-600 hover:bg-blue-700'
                        : 'border-slate-700 bg-[#18181b] hover:bg-[#27272a]'
                    )}
                    onClick={() => setCurrentPage(page as number)}
                  >
                    {page}
                  </Button>
                )
              )}

              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 border-slate-700 bg-[#18181b] hover:bg-[#27272a]"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
