import { useEffect, useState, useCallback } from 'react';

/** Tracks navigator online status and a stable syncing flag. */
export function useIsOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

/** Debounced value setter — returns [value, setValue, isDirty]. */
export function useDebouncedState<T>(initial: T, delay = 800) {
  const [value, setValue] = useState<T>(initial);
  const [draft, setDraft] = useState<T>(initial);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => setValue(draft), delay);
    return () => clearTimeout(t);
  }, [draft, delay, dirty]);

  const update = useCallback(
    (next: T) => {
      setDraft(next);
      setDirty(true);
    },
    []
  );

  const commit = useCallback(() => {
    setValue(draft);
    setDirty(false);
  }, [draft]);

  return { value, draft, dirty, update, commit };
}