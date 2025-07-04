'use client';

import { useState, useEffect } from 'react';

interface CounterProps {
  startDate: Date;
  afterDecimals?: number;
}

export default function Counter({ startDate, afterDecimals = 8 }: CounterProps) {
  const [timeElapsed, setTimeElapsed] = useState<number>(0);

  useEffect(() => {
    const calculateTimeElapsed = () => {
      const now = new Date();
      const diff = now.getTime() - startDate.getTime();
      const timeInYears = diff / (1000 * 60 * 60 * 24 * 365.25);
      setTimeElapsed(timeInYears);
    };

    // Calculate immediately
    calculateTimeElapsed();

    // Update every 10ms for maximum smoothness
    const interval = setInterval(calculateTimeElapsed, 10);

    return () => clearInterval(interval);
  }, [startDate]);

  return (
    <span className="font-mono">
      {timeElapsed.toFixed(afterDecimals)}
    </span>
  );
} 