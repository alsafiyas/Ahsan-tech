'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login-screen');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: 'var(--background)' }}>
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        Loading...
      </div>
    </div>
  );
}
