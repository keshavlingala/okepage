/* ============================================================================
   Store — the single source of truth.

   `Store.state` is read-only from the outside: mutate it through the helpers
   below, which notify every subscriber so the UI re-renders exactly once.
   Settings (not photos — those are session-only blob URLs) persist to
   localStorage so the next print job starts where the last one left off.
   ========================================================================= */

const Store = (() => {

  const STORAGE_KEY = 'okepage/settings';
  const PERSISTED = ['lang', 'orientation', 'preset', 'gap', 'margin', 'border'];

  const DEFAULTS = {
    lang: 'te',
    orientation: 'portrait',   // 'portrait' | 'landscape'
    preset: 'auto',            // see PRESETS in layout.js
    gap: 2,                    // mm between photos
    margin: 5,                 // mm of blank paper edge
    border: 0                  // px cutting line drawn around each photo
  };

  /* A photo: { id, url, fit: 'cover'|'contain', x, y, zoom }
     x/y are object-position percentages (only meaningful when fit is 'cover'). */
  const state = Object.assign({}, DEFAULTS, {
    photos: [],
    selectedId: null,
    scale: 1                   // preview shrink factor, measured from the stage
  });

  const listeners = [];
  let nextId = 0;

  /* — persistence — */

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      PERSISTED.forEach(key => {
        if (saved[key] !== undefined) state[key] = saved[key];
      });
    } catch (err) {
      /* Corrupt or blocked storage is not worth failing over. */
    }
  }

  function save() {
    const settings = {};
    PERSISTED.forEach(key => { settings[key] = state[key]; });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (err) { /* private mode — ignore */ }
  }

  /* — core — */

  function subscribe(listener) { listeners.push(listener); }

  function notify() { listeners.forEach(listener => listener(state)); }

  /** Merge `patch` into the state, persist, and re-render. */
  function set(patch) {
    Object.assign(state, patch);
    save();
    notify();
  }

  /* — photos — */

  function addFiles(fileList) {
    const images = Array.from(fileList || []).filter(file => file.type.startsWith('image/'));
    if (!images.length) return;
    const added = images.map(file => ({
      id: 'p' + (++nextId),
      url: URL.createObjectURL(file),
      fit: 'cover',
      x: 50,
      y: 50,
      zoom: 100
    }));
    set({ photos: state.photos.concat(added) });
  }

  function updatePhoto(id, patch) {
    set({
      photos: state.photos.map(photo => (photo.id === id ? Object.assign({}, photo, patch) : photo))
    });
  }

  /** Same as updatePhoto but silent — used while dragging, where the DOM is
      nudged directly and a full re-render on every pointer move would waste work. */
  function updatePhotoQuietly(id, patch) {
    state.photos = state.photos.map(photo => (photo.id === id ? Object.assign({}, photo, patch) : photo));
  }

  function updateAllPhotos(patch) {
    set({ photos: state.photos.map(photo => Object.assign({}, photo, patch)) });
  }

  function removePhoto(id) {
    const photo = state.photos.find(item => item.id === id);
    const photos = state.photos.filter(item => item.id !== id);
    /* Copies share one blob URL, so only release it when the last user is gone. */
    if (photo && !photos.some(item => item.url === photo.url)) URL.revokeObjectURL(photo.url);
    set({ photos: photos, selectedId: state.selectedId === id ? null : state.selectedId });
  }

  function duplicatePhoto(id, copies) {
    const photo = state.photos.find(item => item.id === id);
    if (!photo) return;
    const added = [];
    for (let i = 0; i < (copies || 1); i++) {
      added.push(Object.assign({}, photo, { id: 'p' + (++nextId) }));
    }
    set({ photos: state.photos.concat(added) });
  }

  /** Replace every photo with `count` copies of one of them. */
  function fillWith(id, count) {
    const photo = state.photos.find(item => item.id === id);
    if (!photo) return;
    const photos = [];
    for (let i = 0; i < count; i++) photos.push(Object.assign({}, photo, { id: 'p' + (++nextId) }));
    releaseUnused(photos);
    set({ photos: photos, selectedId: null });
  }

  /** Start over: drop the photos, restore the layout defaults, keep the language. */
  function reset() {
    releaseUnused([]);
    set(Object.assign({}, DEFAULTS, { lang: state.lang, photos: [], selectedId: null }));
  }

  /** Revoke blob URLs that `keeping` no longer references. */
  function releaseUnused(keeping) {
    state.photos.forEach(photo => {
      if (!keeping.some(item => item.url === photo.url)) URL.revokeObjectURL(photo.url);
    });
  }

  load();

  return {
    state,
    subscribe,
    set,
    addFiles,
    updatePhoto,
    updatePhotoQuietly,
    updateAllPhotos,
    removePhoto,
    duplicatePhoto,
    fillWith,
    reset
  };
})();
