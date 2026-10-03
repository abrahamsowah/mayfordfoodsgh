/**
 * Sajama Shield browser telemetry tag (v2.1.0).
 * Sends page views, measured Web Vitals, and browser errors directly to Shield.
 * No administrator credential or browser cookie is sent. Random per-tab session tokens are keyed-hashed by Shield before storage.
 *
 * <script src="https://shield.example.com/sajama-tag.js"
 *         data-site-id="YOUR_SITE_ID" async></script>
 */
(function (window, document) {
  'use strict';

  if (window.__SAJAMA_SHIELD_INITIALIZED__) return;
  window.__SAJAMA_SHIELD_INITIALIZED__ = true;

  var currentScript = document.currentScript;
  if (!currentScript) {
    var scriptList = document.getElementsByTagName('script');
    currentScript = scriptList[scriptList.length - 1] || null;
  }

  var siteId = (currentScript && currentScript.getAttribute('data-site-id')) || window.SAJAMA_SHIELD_SITE_ID || '';
  var endpoint = (currentScript && currentScript.getAttribute('data-endpoint')) || (function () {
    try {
      var scriptUrl = new URL(currentScript && currentScript.src ? currentScript.src : window.location.href, window.location.href);
      return scriptUrl.origin + '/api/shield/telemetry';
    } catch (error) {
      return '';
    }
  })();

  function createSessionId() {
    try {
      var existing = window.sessionStorage.getItem('sajama_shield_session');
      if (existing) return existing;
      var generated = 's_' + (window.crypto && window.crypto.randomUUID
        ? window.crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36));
      window.sessionStorage.setItem('sajama_shield_session', generated);
      return generated;
    } catch (error) {
      return 's_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    }
  }

  var sessionId = createSessionId();

  function pagePath() {
    return String(window.location.pathname || '/').slice(0, 300) || '/';
  }

  function send(type, data) {
    if (!siteId || !endpoint) return;
    try {
      var body = JSON.stringify({
        siteId: siteId,
        sessionId: sessionId,
        type: type,
        url: pagePath(),
        data: data || {},
      });
      if (window.navigator && typeof window.navigator.sendBeacon === 'function') {
        var blob = new Blob([body], { type: 'application/json' });
        if (window.navigator.sendBeacon(endpoint, blob)) return;
      }
      if (typeof window.fetch === 'function') {
        window.fetch(endpoint, {
          method: 'POST',
          mode: 'cors',
          credentials: 'omit',
          keepalive: true,
          headers: { 'Content-Type': 'application/json' },
          body: body,
        }).catch(function () {});
      }
    } catch (error) {
      // Telemetry must never interfere with the monitored page.
    }
  }

  var lastPagePath = '';
  function trackPageView() {
    var currentPath = pagePath();
    if (currentPath === lastPagePath) return;
    lastPagePath = currentPath;
    send('pageview', {});
  }

  var webVitals = {};
  var clsSupported = false;
  var lcpSupported = false;
  var inpSupported = false;
  var largestContentfulPaint = null;
  var cumulativeLayoutShift = 0;
  var sessionLayoutShift = 0;
  var sessionWindowStart = 0;
  var lastLayoutShift = 0;
  var interactions = new Map();
  var performanceSent = false;

  function setDuration(name, value) {
    var duration = Number(value);
    if (Number.isFinite(duration) && duration >= 0 && duration <= 60000) {
      webVitals[name] = Math.round(duration);
    }
  }

  function observeWebVitals() {
    var Observer = window.PerformanceObserver;
    if (typeof Observer !== 'function') return;

    try {
      var shiftObserver = new Observer(function (list) {
        var entries = list.getEntries();
        for (var i = 0; i < entries.length; i += 1) {
          var entry = entries[i];
          if (entry.hadRecentInput) continue;
          if (!sessionWindowStart || entry.startTime - lastLayoutShift > 1000 || entry.startTime - sessionWindowStart > 5000) {
            sessionWindowStart = entry.startTime;
            sessionLayoutShift = entry.value;
          } else {
            sessionLayoutShift += entry.value;
          }
          lastLayoutShift = entry.startTime;
          cumulativeLayoutShift = Math.max(cumulativeLayoutShift, sessionLayoutShift);
        }
      });
      shiftObserver.observe({ type: 'layout-shift', buffered: true });
      clsSupported = true;
    } catch (error) {}

    try {
      var lcpObserver = new Observer(function (list) {
        var entries = list.getEntries();
        if (entries.length) largestContentfulPaint = entries[entries.length - 1].startTime;
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
      lcpSupported = true;
    } catch (error) {}

    try {
      var inpObserver = new Observer(function (list) {
        var entries = list.getEntries();
        for (var i = 0; i < entries.length; i += 1) {
          var entry = entries[i];
          if (!entry.interactionId) continue;
          var duration = Number(entry.duration);
          if (!Number.isFinite(duration) || duration < 0) continue;
          var previous = interactions.get(entry.interactionId) || 0;
          interactions.set(entry.interactionId, Math.max(previous, duration));
        }
      });
      inpObserver.observe({ type: 'event', buffered: true, durationThreshold: 16 });
      inpSupported = true;
    } catch (error) {}
  }

  function readNavigationMetrics() {
    if (!window.performance || typeof window.performance.getEntriesByType !== 'function') return;
    var navigation = window.performance.getEntriesByType('navigation')[0];
    if (navigation) {
      var requestStart = navigation.requestStart > 0 ? navigation.requestStart : navigation.fetchStart;
      setDuration('ttfb_ms', navigation.responseStart - requestStart);
    }
    var paints = window.performance.getEntriesByType('paint');
    for (var i = 0; i < paints.length; i += 1) {
      if (paints[i].name === 'first-contentful-paint') {
        setDuration('fcp_ms', paints[i].startTime);
        break;
      }
    }
  }

  function interactionToNextPaint() {
    var durations = Array.from(interactions.values()).sort(function (a, b) { return a - b; });
    if (!durations.length) return null;
    var index = Math.max(0, Math.ceil(durations.length * 0.98) - 1);
    return Math.round(durations[index]);
  }

  function sendPerformance() {
    if (performanceSent) return;
    performanceSent = true;
    readNavigationMetrics();
    var data = {};
    Object.keys(webVitals).forEach(function (key) { data[key] = webVitals[key]; });
    if (clsSupported) data.cls = Number(cumulativeLayoutShift.toFixed(4));
    if (lcpSupported && largestContentfulPaint !== null) setDuration('lcp_ms', largestContentfulPaint);
    if (inpSupported) {
      var inp = interactionToNextPaint();
      if (inp !== null) webVitals.inp_ms = inp;
    }
    Object.keys(webVitals).forEach(function (key) { data[key] = webVitals[key]; });
    if (Object.keys(data).length) send('performance', data);
  }

  function reportError(errorType, message, filename, line) {
    send('client_error', {
      error_type: String(errorType || 'JavaScriptError').slice(0, 80),
      message: String(message || 'Unknown browser error').slice(0, 300),
      filename: String(filename || 'inline').split('?')[0].slice(0, 180),
      lineno: Number(line) || 0,
    });
  }

  window.addEventListener('error', function (event) {
    reportError('UncaughtException', event.message, event.filename, event.lineno);
  });
  window.addEventListener('unhandledrejection', function (event) {
    var reason = event.reason;
    reportError('UnhandledPromiseRejection', reason && reason.message ? reason.message : String(reason), 'promise', 0);
  });

  observeWebVitals();
  window.addEventListener('pagehide', sendPerformance, { once: true });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') sendPerformance();
  });
  window.addEventListener('load', function () {
    trackPageView();
    window.setTimeout(sendPerformance, 15000);
  }, { once: true });
  if (document.readyState === 'complete') {
    trackPageView();
    window.setTimeout(sendPerformance, 15000);
  }

  if (window.history && typeof window.history.pushState === 'function') {
    var originalPushState = window.history.pushState;
    window.history.pushState = function () {
      originalPushState.apply(this, arguments);
      window.setTimeout(trackPageView, 0);
    };
  }
  if (window.history && typeof window.history.replaceState === 'function') {
    var originalReplaceState = window.history.replaceState;
    window.history.replaceState = function () {
      originalReplaceState.apply(this, arguments);
      window.setTimeout(trackPageView, 0);
    };
  }
  window.addEventListener('popstate', function () { window.setTimeout(trackPageView, 0); });

  window.sajamaShield = {
    version: '2.1.0',
    siteId: siteId,
    trackPageView: trackPageView,
  };
})(window, document);
