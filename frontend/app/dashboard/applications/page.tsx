'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Redirect to dashboard; applications list lives there. */
export default function ApplicationsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);
  return null;
}
