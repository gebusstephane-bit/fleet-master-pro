'use client';

import { ReactNode } from 'react';
import { SearchInput } from './search-input';
import { FilterDropdown, FilterGroup } from './filter-dropdown';
import { cn } from '@/lib/utils';

interface DataTableToolbarProps {
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange: (value: string) => void;
  filters?: FilterGroup[];
  activeFilters?: Record<string, string | null>;
  onFilterChange?: (key: string, value: string | null) => void;
  onClearFilters?: () => void;
  rightContent?: ReactNode;
  className?: string;
}

/**
 * DataTableToolbar - Barre d'outils pour tables avec search et filtres
 * 
 * Usage:
 * ```tsx
 * <DataTableToolbar
 *   searchPlaceholder="Rechercher..."
 *   onSearchChange={setSearch}
 *   filters={filterGroups}
 *   activeFilters={activeFilters}
 *   onFilterChange={handleFilterChange}
 *   onClearFilters={() => setActiveFilters({})}
 *   rightContent={<Button>Ajouter</Button>}
 * />
 * ```
 */
export function DataTableToolbar({
  searchPlaceholder = 'Rechercher...',
  searchValue,
  onSearchChange,
  filters,
  activeFilters = {},
  onFilterChange,
  onClearFilters,
  rightContent,
  className,
}: DataTableToolbarProps) {
  const hasFilters = filters && filters.length > 0;

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-start sm:items-center gap-4',
        className
      )}
    >
      {/* Left section: Search + Filters */}
      <div className="flex flex-1 items-center gap-3 w-full sm:w-auto">
        <SearchInput
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={onSearchChange}
          className="w-full sm:w-72"
        />

        {hasFilters && onFilterChange && onClearFilters && (
          <FilterDropdown
            filters={filters}
            activeFilters={activeFilters}
            onFilterChange={onFilterChange}
            onClearAll={onClearFilters}
          />
        )}
      </div>

      {/* Right section: Actions */}
      {rightContent && (
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {rightContent}
        </div>
      )}
    </div>
  );
}
