import { useState, useMemo, useCallback } from "react";

interface UseTableFiltersOptions<T> {
  data: T[];
  searchFields: (keyof T)[];
  pageSize?: number;
}

interface SortConfig<T> {
  key: keyof T | null;
  direction: "asc" | "desc";
}

export function useTableFilters<T extends Record<string, any>>({
  data,
  searchFields,
  pageSize = 10,
}: UseTableFiltersOptions<T>) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<SortConfig<T>>({ key: null, direction: "asc" });
  const [page, setPage] = useState(1);

  // Debounced search value
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchTimeoutRef = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
    if (searchTimeoutRef[0]) clearTimeout(searchTimeoutRef[0]);
    searchTimeoutRef[0] = setTimeout(() => {
      setDebouncedSearch(value);
    }, 300);
  }, [searchTimeoutRef]);

  const handleFilter = useCallback((key: string, value: string) => {
    setFilters((prev) => {
      if (value === "" || value === "all") {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: value };
    });
    setPage(1);
  }, []);

  const handleSort = useCallback((key: keyof T) => {
    setSort((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  }, []);

  const filteredData = useMemo(() => {
    let result = [...data];

    // Search
    if (debouncedSearch) {
      const lower = debouncedSearch.toLowerCase();
      result = result.filter((item) =>
        searchFields.some((field) => {
          const val = item[field];
          return val && String(val).toLowerCase().includes(lower);
        })
      );
    }

    // Filters
    for (const [key, value] of Object.entries(filters)) {
      result = result.filter((item) => {
        const itemVal = item[key];
        return itemVal && String(itemVal).toLowerCase() === value.toLowerCase();
      });
    }

    // Sort
    if (sort.key) {
      result.sort((a, b) => {
        const aVal = a[sort.key!];
        const bVal = b[sort.key!];
        if (aVal == null) return 1;
        if (bVal == null) return -1;
        const cmp = typeof aVal === "number" ? aVal - (bVal as number) : String(aVal).localeCompare(String(bVal));
        return sort.direction === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [data, debouncedSearch, filters, sort, searchFields]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const safeCurrentPage = Math.min(page, totalPages);
  const paginatedData = filteredData.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize
  );

  return {
    search,
    setSearch: handleSearch,
    filters,
    setFilter: handleFilter,
    sort,
    setSort: handleSort,
    page: safeCurrentPage,
    setPage,
    totalPages,
    totalFiltered: filteredData.length,
    paginatedData,
    filteredData,
  };
}
