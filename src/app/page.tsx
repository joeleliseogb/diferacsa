'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F6F9] dark:bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-[#1E2538] text-white flex items-center justify-center font-black text-xl shadow-md animate-pulse">
          D
        </div>
        <span className="text-xs text-muted-foreground font-semibold">Cargando Diferacsa...</span>
      </div>
    </div>
  );
}
