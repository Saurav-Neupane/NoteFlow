import { useEffect, type RefObject } from 'react';

/** Invoke `handler` when a pointer event lands outside `ref`. */
export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  handler: () => void,
  enabled = true
): void {
  useEffect(() => {
    if (!enabled) return;
    const onPointer = (e: PointerEvent | MouseEvent | TouchEvent) => {
      const el = ref.current;
      if (!el || el.contains(e.target as Node)) return;
      handler();
    };
    document.addEventListener('mousedown', onPointer as EventListener);
    document.addEventListener('touchstart', onPointer as EventListener);
    return () => {
      document.removeEventListener('mousedown', onPointer as EventListener);
      document.removeEventListener('touchstart', onPointer as EventListener);
    };
  }, [ref, handler, enabled]);
}