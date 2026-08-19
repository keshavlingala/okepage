/* ============================================================================
   Offline — registers the service worker and reports two things the footer
   cares about: the app is cached and will open with no network (`ready`), and
   a newer version is sitting in the wings waiting for a reload (`updateReady`).

   Nothing here touches the DOM; app.js reads `Offline.status` during render.
   ========================================================================= */

const Offline = (() => {

  /* file:// has no service workers, and that is a supported way to run this —
     the app simply stays a plain page there. */
  const supported = 'serviceWorker' in navigator &&
    (location.protocol === 'https:' || location.protocol === 'http:');

  const status = { ready: false, updateReady: false };

  let waiting = null;      // the installed-but-not-yet-active worker
  let reloading = false;
  let onChange = () => {};

  /** Register, then keep `status` in step with the worker's lifecycle. */
  function start(callback) {
    onChange = callback || onChange;
    if (!supported) return;

    navigator.serviceWorker.register('sw.js').then(registration => {
      /* Someone is already controlling this page, so the files are cached. */
      if (navigator.serviceWorker.controller) update({ ready: true });

      check(registration.waiting);
      registration.addEventListener('updatefound', () => {
        const installing = registration.installing;
        if (!installing) return;
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed') check(installing);
          /* First ever install: nothing was controlling the page before. */
          if (installing.state === 'activated') update({ ready: true });
        });
      });
    }).catch(() => {
      /* Registration can be blocked (private mode, no HTTPS). Not fatal. */
    });

    /* The new worker took over — pick up its files. */
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!reloading) return;
      reloading = false;
      location.reload();
    });
  }

  /** A worker in the 'installed' state is only an *update* if one was already
      in charge; otherwise it is the very first install finishing. */
  function check(worker) {
    if (!worker || worker.state !== 'installed') return;
    if (navigator.serviceWorker.controller) {
      waiting = worker;
      update({ ready: true, updateReady: true });
    } else {
      update({ ready: true });
    }
  }

  /** Switch to the waiting worker and reload once it has taken control. */
  function applyUpdate() {
    if (!waiting) return;
    reloading = true;
    waiting.postMessage('skip-waiting');
  }

  function update(patch) {
    const changed = Object.keys(patch).some(key => status[key] !== patch[key]);
    Object.assign(status, patch);
    if (changed) onChange();
  }

  return { supported, status, start, applyUpdate };
})();
