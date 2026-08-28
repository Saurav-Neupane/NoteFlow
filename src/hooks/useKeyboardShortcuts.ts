import { useEffect, type DependencyList } from 'react';

export interface Shortcut {
  keys: string[] | string;
  handler: (e: KeyboardEvent) => void;
  preventDefault?: boolean;
  excludeInputs?: boolean;
}

function matches(e: KeyboardEvent, keys: string[]): boolean {
  const combo = keys.join('+').toLowerCase();
  const parts = combo.split('+');
  const needsCtrl = parts.includes('ctrl') || parts.includes('meta');
  const needsShift = parts.includes('shift');
  const needsAlt = parts.includes('alt');
  const needKey = parts.filter(
    (p) => !['ctrl', 'meta', 'shift', 'alt'].includes(p)
  );
  if (needsCtrl !== (e.ctrlKey || e.metaKey)) return false;
  if (needsAlt !== e.altKey) return false;
  if (needKey.length) {
    const k = e.key.toLowerCase();
    return needKey.some((key) => key.toLowerCase() === k);
  }
  return needsShift === e.shiftKey;
}

/** Register global keyboard shortcuts. */
export function useKeyboardShortcuts(
  shortcuts: Shortcut[],
  deps: DependencyList = []
): void {
  useEffect(() => {
    const isEditable = (el: Element | null) =>
      !!el &&
      (el.tagName === 'INPUT' ||
        el.tagName === 'TEXTAREA' ||
        el.tagName === 'SELECT' ||
        (el as HTMLElement).isContentEditable);

    const onKey = (e: KeyboardEvent) => {
      for (const s of shortcuts) {
        const keys = Array.isArray(s.keys) ? s.keys : [s.keys];
        if (matches(e, keys)) {
          if (s.excludeInputs && isEditable(e.target as Element)) continue;
          if (s.preventDefault !== false) e.preventDefault();
          s.handler(e);
          return;
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}