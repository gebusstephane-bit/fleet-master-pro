'use client';

import { Filter, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface FilterGroup {
  key: string;
  label: string;
  options: FilterOption[];
}

interface FilterDropdownProps {
  filters: FilterGroup[];
  activeFilters: Record<string, string | null>;
  onFilterChange: (key: string, value: string | null) => void;
  onClearAll: () => void;
  className?: string;
}

/**
 * FilterDropdown - Dropdown de filtres multi-critères
 * 
 * Usage:
 * ```tsx
 * <FilterDropdown
 *   filters={[
 *     {
 *       key: 'status',
 *       label: 'Statut',
 *       options: [
 *         { value: 'active', label: 'Actif' },
 *         { value: 'inactive', label: 'Inactif' },
 *       ],
 *     },
 *   ]}
 *   activeFilters={{ status: 'active' }}
 *   onFilterChange={(key, value) => setFilters({ ...filters, [key]: value })}
 *   onClearAll={() => setFilters({})}
 * />
 * ```
 */
export function FilterDropdown({
  filters,
  activeFilters,
  onFilterChange,
  onClearAll,
  className,
}: FilterDropdownProps) {
  const activeCount = Object.values(activeFilters).filter(Boolean).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'border-slate-700 bg-[#18181b] text-white hover:bg-[#27272a] hover:text-white',
            activeCount > 0 && 'border-blue-500/50'
          )}
        >
          <Filter className="mr-2 h-4 w-4" />
          Filtres
          {activeCount > 0 && (
            <Badge
              variant="secondary"
              className="ml-2 bg-blue-500/20 text-blue-400 border-0"
            >
              {activeCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 bg-[#18181b] border-slate-700 text-white"
      >
        {filters.map((group, groupIndex) => (
          <div key={group.key}>
            {groupIndex > 0 && <DropdownMenuSeparator className="bg-slate-700" />}
            <div className="px-2 py-1.5 text-xs font-semibold text-slate-400 uppercase">
              {group.label}
            </div>
            {group.options.map((option) => {
              const isActive = activeFilters[group.key] === option.value;
              return (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() =>
                    onFilterChange(group.key, isActive ? null : option.value)
                  }
                  className={cn(
                    'flex items-center justify-between cursor-pointer',
                    'focus:bg-[#27272a] focus:text-white',
                    isActive && 'bg-blue-500/10'
                  )}
                >
                  <span className={cn(isActive && 'text-blue-400')}>
                    {option.label}
                  </span>
                  {isActive && <Check className="h-4 w-4 text-blue-400" />}
                  {option.count !== undefined && !isActive && (
                    <span className="text-xs text-slate-500">{option.count}</span>
                  )}
                </DropdownMenuItem>
              );
            })}
          </div>
        ))}
        {activeCount > 0 && (
          <>
            <DropdownMenuSeparator className="bg-slate-700" />
            <DropdownMenuItem
              onClick={onClearAll}
              className="cursor-pointer focus:bg-[#27272a] focus:text-white text-slate-400"
            >
              Réinitialiser les filtres
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
