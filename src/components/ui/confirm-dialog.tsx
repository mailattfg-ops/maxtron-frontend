'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { AlertCircle, X, Check } from 'lucide-react';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './card';

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
      {isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={handleCancel} />
          
          <Card className="relative w-full max-w-[400px] shadow-2xl animate-in zoom-in duration-300 border-primary/20 bg-white">
            <CardHeader className="bg-slate-50/50 border-b p-6">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-full ${options?.type === 'danger' ? 'bg-rose-100 text-rose-600' : 'bg-primary/10 text-primary'}`}>
                  {options?.type === 'danger' ? <AlertCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                </div>
                <div>
                  <CardTitle className="text-lg font-bold">{options?.title || 'Are you sure?'}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <CardDescription className="text-sm font-medium text-slate-700 leading-relaxed mb-8">
                {options?.message}
              </CardDescription>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={handleCancel} className="rounded-full px-6 font-semibold">
                  {options?.cancelLabel || 'Cancel'}
                </Button>
                <Button 
                  variant={options?.type === 'danger' ? 'destructive' : 'default'} 
                  onClick={handleConfirm}
                  className="rounded-full px-6 font-bold shadow-lg"
                >
                  {options?.confirmLabel || 'Proceed'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
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
