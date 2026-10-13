import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function useModalFocus(isOpen: boolean, onClose: () => void, allowEscape = true) {
  const containerRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);

  closeRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = window.requestAnimationFrame(() => {
      const container = containerRef.current;
      if (!container) return;
      const preferred = container.querySelector<HTMLElement>('input:not([disabled]), textarea:not([disabled]), select:not([disabled])');
      const first = preferred || container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      first?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      const container = containerRef.current;
      if (!container) return;

      if (event.key === 'Escape' && allowEscape) {
        event.preventDefault();
        closeRef.current();
        return;
      }

      if (event.key !== 'Tab') return;
      const focusable = [...container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)]
        .filter((element) => element.getClientRects().length > 0);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [allowEscape, isOpen]);

  return containerRef;
}
