import { Inter } from 'next/font/google';
import './globals.css';
import AppLayout from '@/components/AppLayout';
import { TooltipProvider } from '@/components/ui/tooltip';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Maxtron ERP',
  description: 'Enterprise Resource Planning for Polybag manufacturing',
};

import { ToastProvider } from '@/components/ui/toast';
import { ConfirmProvider } from '@/components/ui/confirm-dialog';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <TooltipProvider>
          <ToastProvider>
            <ConfirmProvider>
              <AppLayout>{children}</AppLayout>
            </ConfirmProvider>
          </ToastProvider>
        </TooltipProvider>
      </body>
    </html>
  );
}
