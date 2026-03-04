'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if token exists on client side
    const token = localStorage.getItem('token');
    if (token) {
      router.replace('/maxtron');
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
