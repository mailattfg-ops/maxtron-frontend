import { Inter } from 'next/font/google';
import './globals.css';
import AppLayout from '@/components/AppLayout';
import MovedNotice from '@/components/MovedNotice';
import { TooltipProvider } from '@/components/ui/tooltip';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Maxtron ERP',
  description: 'Enterprise Resource Planning for Polybag manufacturing',
};

import { ToastProvider } from '@/components/ui/toast';
import { ConfirmProvider } from '@/components/ui/confirm-dialog';
import { ThemeProvider } from '@/components/theme-provider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} h-screen overflow-hidden`}>
        {/* <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        > */}
          <TooltipProvider>
            <ToastProvider>
              <ConfirmProvider>
                <AppLayout>{children}</AppLayout>
                <MovedNotice />
              </ConfirmProvider>
            </ToastProvider>
          </TooltipProvider>
        {/* </ThemeProvider> */}
      </body>
    </html>
  );
}
