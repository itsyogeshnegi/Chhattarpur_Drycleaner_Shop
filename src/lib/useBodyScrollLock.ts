'use client';

import { useEffect } from 'react';

let activeLockCount = 0;
let savedBodyOverflow = '';
let savedHtmlOverflow = '';
let savedBodyPaddingRight = '';

/**
 * Locks background document scrolling while a modal is open,
 * preventing background scroll-chaining without horizontal layout shift.
 */
export function useBodyScrollLock(isLocked: boolean) {
  useEffect(() => {
    if (!isLocked || typeof document === 'undefined') return;

    if (activeLockCount === 0) {
      savedBodyOverflow = document.body.style.overflow;
      savedHtmlOverflow = document.documentElement.style.overflow;
      savedBodyPaddingRight = document.body.style.paddingRight;

      const scrollbarWidth =
        window.innerWidth - document.documentElement.clientWidth;
      if (scrollbarWidth > 0) {
        const computedPadding =
          parseFloat(window.getComputedStyle(document.body).paddingRight) || 0;
        document.body.style.paddingRight = `${computedPadding + scrollbarWidth}px`;
      }

      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    }

    activeLockCount += 1;

    return () => {
      activeLockCount = Math.max(0, activeLockCount - 1);
      if (activeLockCount === 0) {
        document.documentElement.style.overflow = savedHtmlOverflow;
        document.body.style.overflow = savedBodyOverflow;
        document.body.style.paddingRight = savedBodyPaddingRight;
      }
    };
  }, [isLocked]);
}

