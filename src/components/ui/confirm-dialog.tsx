'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from './button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './dialog';
import { VisuallyHidden } from './visually-hidden';

interface ConfirmOptions {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: 'danger' | 'info';
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolveRef, setResolveRef] = useState<((val: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      setResolveRef(() => resolve);
    });
  }, []);

  const handleConfirm = () => {
    resolveRef?.(true);
    setIsOpen(false);
  };

  const handleCancel = () => {
    resolveRef?.(false);
    setIsOpen(false);
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
        <DialogContent className="max-w-[400px] sm:rounded-[2rem]">
          <DialogHeader>
            <div className="flex items-center gap-4 mb-2">
              <div className={`p-2 rounded-full ${options?.type === 'danger' ? 'bg-rose-100 text-rose-600' : 'bg-primary/10 text-primary'}`}>
                <AlertCircle className="w-5 h-5" />
              </div>
              <DialogTitle className="text-xl font-bold">
                {options?.title || 'Are you sure?'}
              </DialogTitle>
            </div>
            <DialogDescription className="text-sm font-medium text-slate-600 leading-relaxed text-left">
              {options?.message}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 flex-row sm:justify-end gap-3">
            <Button 
                variant="outline" 
                onClick={handleCancel} 
                className="flex-1 sm:flex-none rounded-full px-6 font-semibold border-slate-200"
            >
              {options?.cancelLabel || 'Cancel'}
            </Button>
            <Button 
              variant={options?.type === 'danger' ? 'destructive' : 'default'} 
              onClick={handleConfirm}
              className="flex-1 sm:flex-none rounded-full px-8 font-bold shadow-lg shadow-primary/10"
            >
              {options?.confirmLabel || 'Proceed'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmProvider');
  }
  return context;
}
