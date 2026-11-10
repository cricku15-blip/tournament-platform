import * as React from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

export interface LoadMoreProps {
  hasMore: boolean;
  loading?: boolean;
  onLoadMore: () => void;
  label?: string;
  loadingLabel?: string;
  className?: string;
}

export function LoadMore({
  hasMore,
  loading = false,
  onLoadMore,
  label = "Load more",
  loadingLabel = "Loading...",
  className,
}: LoadMoreProps) {
  if (!hasMore && !loading) return null;

  return (
    <div className={cn("flex justify-center pt-4", className)}>
      <Button
        type="button"
        variant="secondary"
        onClick={onLoadMore}
        disabled={loading || !hasMore}
        className="min-w-[160px]"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-ink" />
            <span>{loadingLabel}</span>
          </>
        ) : (
          label
        )}
      </Button>
    </div>
  );
}

export interface PaginationProps {
  currentPage?: number;
  totalPages?: number;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  className?: string;
}

export function Pagination({
  currentPage,
  totalPages,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  className,
}: PaginationProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between border-t border-line pt-4 mt-4 text-sm text-muted",
        className
      )}
    >
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={!hasPrevious}
        onClick={onPrevious}
        className="gap-1"
      >
        <ChevronLeft className="h-4 w-4" />
        <span>Previous</span>
      </Button>

      {currentPage !== undefined && totalPages !== undefined && (
        <span className="font-medium text-ink tabular-nums">
          Page {currentPage} of {totalPages}
        </span>
      )}

      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={!hasNext}
        onClick={onNext}
        className="gap-1"
      >
        <span>Next</span>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
