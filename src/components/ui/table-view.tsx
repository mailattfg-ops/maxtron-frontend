'use client';

import React, { useState, useMemo } from 'react';
import { Button } from './button';
import { Input } from './input';
import { Search, ChevronLeft, ChevronRight, Trash2, Loader2, CheckSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './card';
import { Pagination } from './pagination';
import { Checkbox } from './checkbox';
import { useConfirm } from './confirm-dialog';
import { useToast } from './toast';

export interface TableViewProps<T> {
  title?: string;
  description?: string;
  headers: string[];
  data: T[];
  loading?: boolean;
  searchPlaceholder?: string;
  searchFields: (keyof T)[];
  renderRow: (item: T, isSelected?: boolean, toggleSelect?: () => void) => React.ReactNode;
  actions?: React.ReactNode;
  rowsPerPageOptions?: number[];
  initialRowsPerPage?: number;
  rightAlignedColumns?: number[];

  // Selection & Bulk Action Options
  selectable?: boolean;
  getItemId?: (item: T) => string;
  selectedIds?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  deleteUrl?: string;
  onRefresh?: () => void;
  onDeleteSelected?: (selectedIds: string[], selectedItems: T[]) => Promise<void> | void;
  onDelete?: (id: string) => Promise<any> | void;
  deleteConfirmTitle?: string;
  deleteConfirmMessage?: string;
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
  rightAlignedColumns = [],
  selectable,
  getItemId: customGetItemId,
  selectedIds: controlledSelectedIds,
  onSelectionChange,
  deleteUrl,
  onRefresh,
  onDeleteSelected,
  onDelete,
  deleteConfirmTitle,
  deleteConfirmMessage
}: TableViewProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);
  const [searchQuery, setSearchQuery] = useState('');
  const [internalSelectedIds, setInternalSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const { confirm } = useConfirm();
  const { success: toastSuccess, error: toastError } = useToast();

  // Selection is enabled if explicitly requested or if any delete/selection handler is provided
  const isSelectionEnabled = selectable ?? Boolean(onDeleteSelected || onDelete || deleteUrl);

  const selectedIds = useMemo(() => {
    if (controlledSelectedIds) {
      return new Set(controlledSelectedIds);
    }
    return internalSelectedIds;
  }, [controlledSelectedIds, internalSelectedIds]);

  const updateSelectedIds = (newSet: Set<string>) => {
    if (!controlledSelectedIds) {
      setInternalSelectedIds(newSet);
    }
    if (onSelectionChange) {
      onSelectionChange(Array.from(newSet));
    }
  };

  const resolveItemId = (item: any, fallbackIndex: number): string => {
    if (customGetItemId) return customGetItemId(item);
    if (item && typeof item === 'object') {
      if (item.id !== undefined && item.id !== null) return String(item.id);
      if (item._id !== undefined && item._id !== null) return String(item._id);
      if (item.uuid !== undefined && item.uuid !== null) return String(item.uuid);
    }
    return String(fallbackIndex);
  };

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

  // Selection helpers
  const currentPageIds = currentData.map((item, idx) => resolveItemId(item, (currentPage - 1) * rowsPerPage + idx));
  const isAllSelectedOnPage = currentPageIds.length > 0 && currentPageIds.every(id => selectedIds.has(id));
  const isSomeSelectedOnPage = currentPageIds.some(id => selectedIds.has(id));

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    updateSelectedIds(next);
  };

  const toggleSelectAllOnPage = () => {
    const next = new Set(selectedIds);
    if (isAllSelectedOnPage) {
      currentPageIds.forEach(id => next.delete(id));
    } else {
      currentPageIds.forEach(id => next.add(id));
    }
    updateSelectedIds(next);
  };

  const selectAllFiltered = () => {
    const allFilteredIds = filteredData.map((item, idx) => resolveItemId(item, idx));
    updateSelectedIds(new Set(allFilteredIds));
  };

  const clearSelection = () => {
    updateSelectedIds(new Set());
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;

    const count = selectedIds.size;
    const confirmed = await confirm({
      title: deleteConfirmTitle || `Delete ${count} Item${count > 1 ? 's' : ''}`,
      message: deleteConfirmMessage || `Are you sure you want to permanently delete ${count} selected item${count > 1 ? 's' : ''}? This action cannot be undone.`,
      confirmLabel: `Delete ${count} Item${count > 1 ? 's' : ''}`,
      type: 'danger'
    });

    if (!confirmed) return;

    setIsDeleting(true);
    const idsArray = Array.from(selectedIds);
    const itemsArray = data.filter((item, idx) => selectedIds.has(resolveItemId(item, idx)));

    try {
      if (onDeleteSelected) {
        await onDeleteSelected(idsArray, itemsArray);
        toastSuccess(`Successfully deleted ${count} item${count > 1 ? 's' : ''}.`);
      } else if (deleteUrl) {
        const token = localStorage.getItem('token');
        let errorCount = 0;
        await Promise.all(
          idsArray.map(async (id) => {
            try {
              const res = await fetch(`${deleteUrl}/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
              });
              const json = await res.json().catch(() => ({}));
              if (!res.ok || json.success === false) errorCount++;
            } catch {
              errorCount++;
            }
          })
        );

        if (errorCount === 0) {
          toastSuccess(`Successfully deleted ${count} item${count > 1 ? 's' : ''}.`);
        } else if (errorCount < count) {
          toastSuccess(`Deleted ${count - errorCount} items (${errorCount} items could not be deleted).`);
        } else {
          toastError(`Failed to delete selected items.`);
        }
      } else if (onDelete) {
        let errorCount = 0;
        for (const id of idsArray) {
          try {
            await onDelete(id);
          } catch {
            errorCount++;
          }
        }
        if (errorCount === 0) {
          toastSuccess(`Successfully deleted ${count} item${count > 1 ? 's' : ''}.`);
        } else {
          toastError(`Some items could not be deleted.`);
        }
      }

      clearSelection();
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toastError(err?.message || 'Failed to delete selected items.');
    } finally {
      setIsDeleting(false);
    }
  };

  const injectCheckboxIntoRow = (rendered: React.ReactNode, itemId: string, isSelected: boolean) => {
    if (!isSelectionEnabled) return rendered;

    const checkboxTd = (
      <td
        key="__select_box_cell__"
        className="w-12 px-4 py-3 text-center align-middle"
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => toggleSelect(itemId)}
          aria-label={`Select row ${itemId}`}
          className="border-slate-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
        />
      </td>
    );

    if (React.isValidElement(rendered)) {
      if (rendered.type === 'tr' || (typeof rendered.type === 'string' && rendered.type.toLowerCase() === 'tr')) {
        const trProps = rendered.props as any;
        const originalChildren = React.Children.toArray(trProps.children);
        return React.cloneElement(rendered, {
          className: `${trProps.className || ''} ${isSelected ? 'bg-primary/5 transition-colors' : ''}`,
          children: [checkboxTd, ...originalChildren]
        } as any);
      }

      // If renderRow returned a Fragment (<><tr>...</tr>...</>)
      if (rendered.type === React.Fragment || (rendered.props && (rendered.props as any).children)) {
        const children = React.Children.toArray((rendered.props as any).children);
        let injectedFirstTr = false;
        const mappedChildren = children.map((child) => {
          if (React.isValidElement(child) && (child.type === 'tr' || (typeof child.type === 'string' && child.type.toLowerCase() === 'tr'))) {
            const trProps = child.props as any;
            const originalChildren = React.Children.toArray(trProps.children);
            if (!injectedFirstTr) {
              injectedFirstTr = true;
              return React.cloneElement(child, {
                className: `${trProps.className || ''} ${isSelected ? 'bg-primary/5 transition-colors' : ''}`,
                children: [checkboxTd, ...originalChildren]
              } as any);
            } else {
              const emptyTd = <td key="__select_box_cell_sub__" className="w-12 px-4 py-3" />;
              return React.cloneElement(child, {
                children: [emptyTd, ...originalChildren]
              } as any);
            }
          }
          return child;
        });
        return React.cloneElement(rendered, { children: mappedChildren } as any);
      }
    }

    return rendered;
  };

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
              className="w-full pl-9 rounded-full border-primary/20 bg-white"
              placeholder={searchPlaceholder}
              value={searchQuery}
              autoComplete="off"
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          {actions}
        </div>
      </CardHeader>

      {/* Bulk Selection Action Bar */}
      {isSelectionEnabled && selectedIds.size > 0 && (
        <div className="bg-primary/5 border-b border-primary/15 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-black shadow-sm">
              {selectedIds.size}
            </div>
            <span className="text-xs font-bold text-slate-800">
              {selectedIds.size === 1 ? '1 row selected' : `${selectedIds.size} rows selected`}
            </span>
            {filteredData.length > currentData.length && selectedIds.size !== filteredData.length && (
              <button
                type="button"
                onClick={selectAllFiltered}
                className="text-xs text-primary font-bold hover:underline ml-2"
              >
                Select all {filteredData.length} records in this view
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              className="h-8 px-3 text-xs font-semibold text-muted-foreground hover:text-foreground"
            >
              Clear Selection
            </Button>
            {(onDeleteSelected || onDelete || deleteUrl) && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={isDeleting}
                onClick={handleBatchDelete}
                className="h-8 px-4 text-xs font-bold gap-1.5 shadow-sm rounded-full active:scale-95 transition-all"
              >
                {isDeleting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Delete Selected ({selectedIds.size})</span>
              </Button>
            )}
          </div>
        </div>
      )}

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-slate-50 text-muted-foreground font-bold uppercase text-[10px] tracking-widest border-b">
              <tr>
                {isSelectionEnabled && (
                  <th className="w-12 px-4 py-4 text-center">
                    <Checkbox
                      checked={isAllSelectedOnPage ? true : isSomeSelectedOnPage ? "indeterminate" : false}
                      onCheckedChange={toggleSelectAllOnPage}
                      aria-label="Select all rows on page"
                      className="border-slate-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                  </th>
                )}
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
                  <td colSpan={headers.length + (isSelectionEnabled ? 1 : 0)} className="px-6 py-12 text-center text-muted-foreground animate-pulse">
                    Syncing data...
                  </td>
                </tr>
              ) : currentData.length === 0 ? (
                <tr>
                  <td colSpan={headers.length + (isSelectionEnabled ? 1 : 0)} className="px-6 py-12 text-center text-muted-foreground font-medium italic">
                    No records found matching your selection.
                  </td>
                </tr>
              ) : (
                currentData.map((item, idx) => {
                  const itemId = resolveItemId(item, (currentPage - 1) * rowsPerPage + idx);
                  const isSelected = selectedIds.has(itemId);
                  const rendered = renderRow(item, isSelected, () => toggleSelect(itemId));
                  return (
                    <React.Fragment key={itemId || idx}>
                      {injectCheckboxIntoRow(rendered, itemId, isSelected)}
                    </React.Fragment>
                  );
                })
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
