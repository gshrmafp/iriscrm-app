import { useState, useRef, useCallback } from 'react';

export function useDebounceSearch(delay = 400) {
  const [value, setValue] = useState('');
  const [debouncedValue, setDebouncedValue] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout>>();

  const onChange = useCallback(
    (text: string) => {
      setValue(text);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setDebouncedValue(text), delay);
    },
    [delay],
  );

  return { value, debouncedValue, onChange };
}
