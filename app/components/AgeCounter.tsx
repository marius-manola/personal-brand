'use client';

import { useEffect, useState } from 'react';

export default function AgeCounter() {
  const [age, setAge] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const calculateAge = () => {
      const birthDate = new Date('2006-05-25');
      const now = new Date();
      const ageInMilliseconds = now.getTime() - birthDate.getTime();
      const ageInYears = ageInMilliseconds / (1000 * 60 * 60 * 24 * 365.25);
      setAge(ageInYears);
    };

    // Calculate immediately
    calculateAge();

    // Update every 10ms for maximum smoothness
    const interval = setInterval(calculateAge, 10);

    return () => clearInterval(interval);
  }, []);

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted || age === null) {
    return <span>18</span>; // Static fallback that matches expected age range
  }

  return (
    <span className="font-mono">
      {age.toFixed(8)}
    </span>
  );
} 