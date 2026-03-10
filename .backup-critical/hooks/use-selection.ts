'use client';

import { useState, useCallback } from 'react';

export function useSelection<T>(items: T[], idKey: keyof T) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      if (prev.size === items.length) return new Set();
      return new Set(items.map((i) => String(i[idKey])));
    });
  }, [items, idKey]);

  const clear = useCallback(() => setSelected(new Set()), []);

  const isSelected = useCallback((id: string) => selected.has(id), [selected]);

  const isAllSelected = items.length > 0 && selected.size === items.length;
  const isIndeterminate = selected.size > 0 && selected.size < items.length;

  return {
    selected,
    toggle,
    toggleAll,
    clear,
    isSelected,
    isAllSelected,
    isIndeterminate,
    selectedCount: selected.size,
    selectedIds: Array.from(selected),
  };
}
