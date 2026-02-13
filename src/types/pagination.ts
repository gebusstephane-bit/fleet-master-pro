/**
 * Types pour la pagination cursor-based
 */

export interface CursorPaginationParams {
  cursor?: string | null;
  pageSize?: number;
  direction?: 'next' | 'previous';
}

export interface CursorPaginatedResult<T> {
  data: T[];
  nextCursor: string | null;
  previousCursor: string | null;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  totalCount?: number;
}

export interface OffsetPaginationParams {
  page?: number;
  pageSize?: number;
}

export interface OffsetPaginatedResult<T> {
  data: T[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Type pour les clés de query paginées
export type PaginatedQueryKey = [
  string,
  {
    cursor?: string | null;
    pageSize: number;
    filters?: Record<string, unknown>;
  }
];
