'use client';

import React, { useState } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './card';
import { Pagination } from './pagination';

interface TableViewProps<T> {
  title?: string;
  description?: string;
  headers: string[];
  data: T[];
  loading?: boolean;
  searchPlaceholder?: string;
  searchFields: (keyof T)[];
  renderRow: (item: T) => React.ReactNode;
  actions?: React.ReactNode;
  rowsPerPageOptions?: number[];
  initialRowsPerPage?: number;
  rightAlignedColumns?: number[];
}

export function TableView<T>({
  title,
  description,
  headers,
  data,
  loading = false,
  searchPlaceholder = "Search...",
  searchFields,
  renderRow,
  actions,
  rowsPerPageOptions = [10, 20, 50, 100],
  initialRowsPerPage = 10,
  rightAlignedColumns = []
}: TableViewProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);
  const [searchQuery, setSearchQuery] = useState('');

  // Helper to resolve nested fields like 'users.name'
  const getNestedValue = (obj: any, path: string) => {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  };

  const filteredData = data.filter(item => {
    if (!searchQuery) return true;
    return searchFields.some(field => {
      const value = getNestedValue(item, String(field));
      if (value === null || value === undefined) return false;
      return String(value).toLowerCase().includes(searchQuery.toLowerCase());
    });
  });

  const totalPages = Math.ceil(filteredData.length / rowsPerPage) || 1;
  const currentData = filteredData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

  const startIdx = filteredData.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const endIdx = Math.min(currentPage * rowsPerPage, filteredData.length);

  return (
    <Card className="mt-6 border-primary/10 shadow-sm overflow-hidden bg-white">
      <CardHeader className="flex flex-col lg:flex-row items-center justify-between gap-4 border-b bg-slate-50/50 p-6">
        <div className="w-full lg:w-auto">
          {title && <CardTitle className="text-xl text-primary font-bold">{title}</CardTitle>}
          {description && <CardDescription className="text-muted-foreground font-medium">{description}</CardDescription>}
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="w-fit pl-9 rounded-full border-primary/20 bg-white"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          {actions}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-slate-50 text-muted-foreground font-bold uppercase text-[10px] tracking-widest border-b">
              <tr>
                {headers.map((header, i) => (
                  <th key={i} className={`px-6 py-4 ${rightAlignedColumns.includes(i) || i === headers.length - 1 ? 'text-right' : ''}`}>
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/5">
              {loading ? (
                <tr>
                  <td colSpan={headers.length} className="px-6 py-12 text-center text-muted-foreground animate-pulse">
                    Syncing data...
                  </td>
                </tr>
              ) : currentData.length === 0 ? (
                <tr>
                  <td colSpan={headers.length} className="px-6 py-12 text-center text-muted-foreground font-medium italic">
                    No records found matching your selection.
                  </td>
                </tr>
              ) : (
                currentData.map((item, idx) => (
                  <React.Fragment key={idx}>
                    {renderRow(item)}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(rows) => {
            setRowsPerPage(rows);
            setCurrentPage(1);
          }}
          totalEntries={filteredData.length}
          startEntry={startIdx}
          endEntry={endIdx}
          rowsPerPageOptions={rowsPerPageOptions}
        />
      </CardContent>
    </Card>
  );
}
