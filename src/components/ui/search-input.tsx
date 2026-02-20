'use client';

import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState, useEffect, useCallback } from 'react';

interface SearchInputProps {
  placeholder?: string;
  value?: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  debounceMs?: number;
  className?: string;
  autoFocus?: boolean;
}

/**
 * SearchInput - Input de recherche avec debounce intégré
 * 
 * Usage:
 * ```tsx
 * <SearchInput
 *   placeholder="Rechercher un véhicule..."
 *   onChange={(value) => setSearchQuery(value)}
 *   debounceMs={300}
 * />
 * ```
 */
export function SearchInput({
  placeholder = 'Rechercher...',
  value,
  onChange,
  onClear,
  debounceMs = 300,
  className,
  autoFocus = false,
}: SearchInputProps) {
  const [inputValue, setInputValue] = useState(value || '');

  // Sync with external value
  useEffect(() => {
    if (value !== undefined && value !== inputValue) {
      setInputValue(value);
    }
  }, [value]);

  // Debounced onChange
  useEffect(() => {
    const timeout = setTimeout(() => {
      onChange(inputValue);
    }, debounceMs);

    return () => clearTimeout(timeout);
  }, [inputValue, debounceMs, onChange]);

  const handleClear = useCallback(() => {
    setInputValue('');
    onChange('');
    onClear?.();
  }, [onChange, onClear]);

  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input
        type="text"
        placeholder={placeholder}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        className={cn(
          'pl-10 pr-10 bg-[#18181b] border-slate-700 text-white',
          'placeholder:text-slate-500 focus-visible:ring-blue-500'
        )}
        autoFocus={autoFocus}
      />
      {inputValue && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-slate-400 hover:text-white"
          onClick={handleClear}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
