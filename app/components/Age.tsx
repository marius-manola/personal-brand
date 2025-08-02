'use client';

import { useEffect, useState } from 'react';

export default function Age() {
  const [age, setAge] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const calculateAge = () => {
      const birthDate = new Date('2006-05-25');
      const today = new Date();
      let calculatedAge = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        calculatedAge--;
      }
      
      setAge(calculatedAge);
    };

    calculateAge();
    const interval = setInterval(calculateAge, 1000); // Update every second

    return () => clearInterval(interval);
  }, []);

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted || age === null) {
    return <>18</>; // Static fallback
  }

  return <>{age}</>;
}