/**
 * Pre-React error handler — catches fatal JS errors before React mounts.
 * Uses safe DOM APIs (createElement + textContent) to avoid XSS via innerHTML.
 */
(function () {
  window.__APP_ERROR__ = null;

  function showError(msg) {
    var root = document.getElementById('root');
    if (!root) return;
    root.textContent = '';
    var div = document.createElement('div');
    div.style.cssText = 'padding:24px;font-family:system-ui';
    var h1 = document.createElement('h1');
    h1.style.color = '#dc2626';
    h1.textContent = 'Error';
    var pre = document.createElement('pre');
    pre.style.cssText = 'background:#fef2f2;padding:16px;overflow:auto;border-radius:8px';
    pre.textContent = msg || 'Unknown error';
    div.appendChild(h1);
    div.appendChild(pre);
    root.appendChild(div);
  }

  window.onerror = function (msg, url, line, col, err) {
    window.__APP_ERROR__ = {
      message: (err && err.message) || msg,
      stack: err && err.stack,
    };
    showError(window.__APP_ERROR__.message);
    return true;
  };

  window.addEventListener('unhandledrejection', function (e) {
    var msg =
      (e.reason && e.reason.message) || String(e.reason) || 'Unhandled rejection';
    showError(msg);
    e.preventDefault();
  });
})();
