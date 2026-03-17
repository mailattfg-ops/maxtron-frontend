'use client';

import React from 'react';
import { Button } from './button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  rowsPerPage: number;
  onRowsPerPageChange: (rows: number) => void;
  totalEntries: number;
  startEntry: number;
  endEntry: number;
  rowsPerPageOptions?: number[];
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  rowsPerPage,
  onRowsPerPageChange,
  totalEntries,
  startEntry,
  endEntry,
  rowsPerPageOptions = [10, 20, 50, 100],
}: PaginationProps) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 px-4 py-4 md:px-6">
      <div className="text-sm text-muted-foreground font-medium order-2 sm:order-1">
        Showing <span className="text-foreground font-bold">{startEntry}</span> to <span className="text-foreground font-bold">{endEntry}</span> of <span className="text-foreground font-bold">{totalEntries}</span> entries
      </div>
      <div className="flex items-center gap-3 md:gap-6 order-1 sm:order-2">
        <div className="hidden md:flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest whitespace-nowrap">Rows per page:</span>
          <select
            value={rowsPerPage}
            onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
            className="h-8 rounded-lg border border-primary/20 bg-primary/5 px-2 py-0 text-xs font-bold text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer hover:bg-primary/10 transition-colors"
          >
            {rowsPerPageOptions.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="h-8 rounded-full px-4 border-primary/10 hover:bg-primary/5 hover:text-primary transition-all disabled:opacity-50 font-black text-[10px] uppercase tracking-widest"
          >
            <ChevronLeft className="w-3.5 h-3.5 mr-1" /> Prev
          </Button>
          
          <div className="flex items-center justify-center min-w-[40px] h-8 rounded-full bg-primary/10 text-primary text-[10px] font-black shadow-inner border border-primary/5">
            {currentPage} <span className="mx-1.5 opacity-40">/</span> {totalPages}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
            className="h-8 rounded-full px-4 border-primary/10 hover:bg-primary/5 hover:text-primary transition-all disabled:opacity-50 font-black text-[10px] uppercase tracking-widest"
          >
            Next <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
