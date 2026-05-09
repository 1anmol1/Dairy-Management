/**
 * useDebounce — delays a value update until the user stops typing.
 * Use for search inputs and filter changes.
 *
 * Usage:
 *   const debouncedSearch = useDebounce(search, 350);
 *   useEffect(() => { fetchData(debouncedSearch); }, [debouncedSearch]);
 */
import { useState, useEffect } from 'react';

const useDebounce = (value, delay = 350) => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
};

export default useDebounce;
