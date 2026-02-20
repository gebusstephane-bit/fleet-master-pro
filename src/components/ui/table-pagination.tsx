"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface TablePaginationProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function TablePagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: TablePaginationProps) {
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  if (totalItems === 0) return null;

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-white/[0.06]">
      <p className="text-sm text-[#71717a]">
        {start}–{end} sur {totalItems}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
            page <= 1
              ? "text-[#52525b] cursor-not-allowed"
              : "text-[#a1a1aa] hover:bg-[#27272a] hover:text-white"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
          .reduce<(number | "ellipsis")[]>((acc, p, idx, arr) => {
            if (idx > 0 && p - (arr[idx - 1] as number) > 1) {
              acc.push("ellipsis");
            }
            acc.push(p);
            return acc;
          }, [])
          .map((item, idx) =>
            item === "ellipsis" ? (
              <span key={`e-${idx}`} className="px-1 text-[#71717a]">...</span>
            ) : (
              <button
                key={item}
                onClick={() => onPageChange(item as number)}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition-colors",
                  page === item
                    ? "bg-blue-500/20 text-blue-400"
                    : "text-[#a1a1aa] hover:bg-[#27272a] hover:text-white"
                )}
              >
                {item}
              </button>
            )
          )}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
            page >= totalPages
              ? "text-[#52525b] cursor-not-allowed"
              : "text-[#a1a1aa] hover:bg-[#27272a] hover:text-white"
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
