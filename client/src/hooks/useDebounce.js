import { useEffect, useState } from 'react';

export function useDebounce(valor, delay = 300) {
  const [debounced, setDebounced] = useState(valor);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(valor), delay);
    return () => clearTimeout(id);
  }, [valor, delay]);
  return debounced;
}
