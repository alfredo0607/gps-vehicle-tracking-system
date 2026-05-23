import { useEffect, useRef } from 'react';

export function useAutoRefresh(callback, interval = 5000) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    savedCallback.current();
    const id = setInterval(() => savedCallback.current(), interval);
    return () => clearInterval(id);
  }, [interval]);
}
