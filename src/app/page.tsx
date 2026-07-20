'use client';

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// Butun ilova bo'ylab bitta umumiy client — har bir komponentda
// qayta yaratishning hojati yo'q.
export const supabase = createClient();
