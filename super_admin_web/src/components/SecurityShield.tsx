'use client';
import { useEffect } from 'react';

export default function SecurityShield() {
  useEffect(() => {
    // 1. Disable Right Click
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // 2. Disable Keyboard Shortcuts (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.keyCode === 123 || // F12
        (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.keyCode === 74 || e.keyCode === 67)) || // Ctrl+Shift+I/J/C
        (e.ctrlKey && e.keyCode === 85) // Ctrl+U (View Source)
      ) {
        e.preventDefault();
        return false;
      }
    };

    // 3. Anti-Debugging Loop (freezes DevTools if opened)
    const antiDebug = setInterval(() => {
      const before = new Date().getTime();
      // eslint-disable-next-line no-debugger
      debugger; // This triggers a breakpoint if devtools is open
      const after = new Date().getTime();
      if (after - before > 100) {
        // DevTools might be open
      }
    }, 1000);

    // 4. Overwrite Console (prevents them from reading logs)
    const noop = () => {};
    const originalConsole = { ...console };
    if (process.env.NODE_ENV === 'production') {
       console.log = noop;
       console.info = noop;
       console.warn = noop;
       console.error = noop;
    }

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      clearInterval(antiDebug);
      if (process.env.NODE_ENV === 'production') {
         console.log = originalConsole.log;
         console.info = originalConsole.info;
         console.warn = originalConsole.warn;
         console.error = originalConsole.error;
      }
    };
  }, []);

  return null;
}
