'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if token exists on client side
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      const user = JSON.parse(storedUser);
      const isAdmin = user?.role_name?.toLowerCase() === 'admin' || user?.email?.toLowerCase() === 'admin@maxtron.com';
      
      if (isAdmin) {
        router.replace('/maxtron');
      } else {
        const companyCode = user?.company?.company_code?.toLowerCase() || 'maxtron';
        router.replace(`/${companyCode}`);
      }
    } else {
      router.replace('/login');
    }
  }, [router]);

  // Render a simple loading state or nothing during the check
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}
