'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const LINKS = [
  { name: 'MAXTRON POLYMERS', url: 'https://maxtron-poly-frontend.vercel.app/' },
  { name: 'MAXTRON TRANSPORTATION', url: 'https://maxtron-keil-frontend.vercel.app/' },
];

/** Shown on every page of this old system: work must move to the new platforms. */
export default function MovedNotice() {
  const pathname = usePathname();
  const [open, setOpen] = useState(true);
  useEffect(() => setOpen(true), [pathname]); // again on each page they open

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>The platform has been updated</DialogTitle>
          <DialogDescription>
            This system is no longer updated. Please use the new links below and enter all new data there.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-2">
          {LINKS.map(l => (
            <a key={l.url} href={l.url}
              className="rounded-md border border-primary/30 px-4 py-3 hover:bg-primary/5 focus:outline-none focus:ring-2 focus:ring-primary">
              <span className="block font-bold">{l.name}</span>
              <span className="block text-sm text-primary underline break-all">{l.url}</span>
            </a>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
