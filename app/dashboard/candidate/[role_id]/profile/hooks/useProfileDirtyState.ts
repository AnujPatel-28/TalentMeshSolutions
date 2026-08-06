import { useState, useEffect } from 'react';

export function useProfileDirtyState<T>(current: T | null, original: T | null) {
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (!current || !original) {
      setIsDirty(false);
      return;
    }

    const checkIsDirty = () => {
      const currentStr = JSON.stringify(current);
      const originalStr = JSON.stringify(original);
      return currentStr !== originalStr;
    };

    // Debounce the structural diff checking by 200ms to eliminate 
    // serialization overhead on every single keystroke.
    const timer = setTimeout(() => {
      setIsDirty(checkIsDirty());
    }, 200);

    return () => clearTimeout(timer);
  }, [current, original]);

  return isDirty;
}
