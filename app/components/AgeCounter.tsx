'use client';

import { useEffect, useState } from 'react';

export default function AgeCounter() {
  const [age, setAge] = useState<number>(0);

  useEffect(() => {
    const calculateAge = () => {
      const birthDate = new Date('1997-09-09');
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

  return (
    <span className="font-mono">
      {age.toFixed(8)}
    </span>
  );
} 