// Security Shield - Disables DevTools, Right-Click, View Source
// This runs on every page load to protect the application

(function() {
  'use strict';

  // 1. Disable Right-Click Context Menu
  document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    return false;
  });

  // 2. Disable Keyboard Shortcuts for DevTools & View Source
  document.addEventListener('keydown', function(e) {
    // F12 - DevTools
    if (e.key === 'F12' || e.keyCode === 123) {
      e.preventDefault();
      return false;
    }
    // Ctrl+Shift+I - DevTools
    if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.keyCode === 73)) {
      e.preventDefault();
      return false;
    }
    // Ctrl+Shift+J - Console
    if (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j' || e.keyCode === 74)) {
      e.preventDefault();
      return false;
    }
    // Ctrl+Shift+C - Element Picker
    if (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c' || e.keyCode === 67)) {
      e.preventDefault();
      return false;
    }
    // Ctrl+U - View Source
    if (e.ctrlKey && (e.key === 'U' || e.key === 'u' || e.keyCode === 85)) {
      e.preventDefault();
      return false;
    }
    // Ctrl+S - Save Page
    if (e.ctrlKey && (e.key === 'S' || e.key === 's' || e.keyCode === 83)) {
      e.preventDefault();
      return false;
    }
  });

  // 3. Disable Text Selection (prevents copy-paste of page content)
  document.addEventListener('selectstart', function(e) {
    // Allow selection in input fields and textareas
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
      return true;
    }
    e.preventDefault();
    return false;
  });

  // 4. Disable Drag (prevents dragging images/elements)
  document.addEventListener('dragstart', function(e) {
    e.preventDefault();
    return false;
  });

  // 5. DevTools Detection - Detects if DevTools is open via debugger timing
  (function detectDevTools() {
    const threshold = 160;
    const check = function() {
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      if (widthThreshold || heightThreshold) {
        document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;background:#0f172a;color:#ef4444;font-family:Inter,sans-serif;font-size:24px;font-weight:bold;text-align:center;padding:2rem;">⛔ Access Denied<br/><span style="font-size:14px;color:#94a3b8;font-weight:normal;margin-top:8px;display:block;">Developer tools are not allowed on this application.</span></div>';
      }
    };
    setInterval(check, 1000);
  })();

  // 6. Console warning
  console.log('%c⛔ STOP!', 'color: red; font-size: 60px; font-weight: bold;');
  console.log('%cThis is a restricted application. Unauthorized access is monitored and logged.', 'color: #ef4444; font-size: 16px;');

})();
