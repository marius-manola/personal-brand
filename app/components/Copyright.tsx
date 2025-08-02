'use client';

import { useEffect, useState } from 'react';

export default function Copyright() {
  const [year, setYear] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setYear(new Date().getFullYear());
  }, []);

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted || year === null) {
    return <>2024</>; // Static fallback
  }

  return <>{year}</>;
}