// Coalesce refresh requests so slow networks never accumulate parallel polls.
function createLiveRefresh(refresh, { isActive = () => true, onError = () => {} } = {}) {
  let stopped = false;
  let running = null;
  let queued = false;
  let nextSilent = true;
  function request(silent = true) {
    if (stopped || !isActive()) return Promise.resolve();
    queued = true;
    nextSilent = nextSilent && silent;
    if (running) return running;
    running = Promise.resolve().then(async () => {
      while (queued && !stopped && isActive()) {
        queued = false;
        const quiet = nextSilent;
        nextSilent = true;
        try { await refresh(quiet, () => !stopped); } catch (error) { if (!stopped) onError(error); }
      }
      queued = false;
    }).finally(() => { running = null; });
    return running;
  }
  return { request, stop() { stopped = true; queued = false; } };
}
module.exports = { createLiveRefresh };
