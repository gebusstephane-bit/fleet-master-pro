/**
 * Data Table - Design moderne style Airtable/Notion
 */

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp, ArrowUpDown } from 'lucide-react';

interface Column<T> {
  key: string;
  header: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: string) => void;
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  sortColumn,
  sortDirection,
  onSort,
  isLoading,
  emptyState,
  className,
}: DataTableProps<T>) {
  if (isLoading) {
    return <DataTableSkeleton columns={columns.length} />;
  }

  if (data.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
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
                  onClick={() => column.sortable && onSort?.(column.key)}
                >
                  <div className={cn(
                    'flex items-center gap-1',
                    column.align === 'center' && 'justify-center',
                    column.align === 'right' && 'justify-end'
                  )}>
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
            {data.map((item, index) => (
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
  );
}

function DataTableSkeleton({ columns }: { columns: number }) {
  return (
    <div className="rounded-xl border border-slate-700 overflow-hidden">
      <div className="p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 py-3">
            {Array.from({ length: columns }).map((_, j) => (
              <div
                key={j}
                className="h-4 bg-slate-700 rounded animate-pulse flex-1"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Empty state component
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="h-16 w-16 rounded-2xl bg-slate-800 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
      <p className="text-sm text-slate-400 max-w-sm mb-4">{description}</p>
      {action}
    </div>
  );
}

// Status badge component
export function StatusBadge({
  status,
  children,
}: {
  status: 'active' | 'inactive' | 'warning' | 'error' | 'pending';
  children: React.ReactNode;
}) {
  const styles = {
    active: 'bg-emerald-900/30 text-emerald-400 border-emerald-800',
    inactive: 'bg-slate-800 text-slate-400 border-slate-700',
    warning: 'bg-amber-900/30 text-amber-400 border-amber-800',
    error: 'bg-red-900/30 text-red-400 border-red-800',
    pending: 'bg-blue-900/30 text-blue-400 border-blue-800',
  };

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-full border',
      styles[status]
    )}>
      <span className={cn(
        'h-1.5 w-1.5 rounded-full',
        status === 'active' && 'bg-emerald-500',
        status === 'inactive' && 'bg-slate-400',
        status === 'warning' && 'bg-amber-500',
        status === 'error' && 'bg-red-500',
        status === 'pending' && 'bg-blue-500',
      )} />
      {children}
    </span>
  );
}
