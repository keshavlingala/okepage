/* ============================================================================
   App — wires the DOM to the Store. One render() rebuilds everything the user
   can see; every interaction just changes state and lets render() catch up.
   ========================================================================= */

(() => {

  const $ = id => document.getElementById(id);

  const el = {
    root: document.documentElement,
    pageRule: $('page-rule'),
    langs: $('langs'),
    countPhotos: $('count-photos'),
    countPaper: $('count-paper'),
    add: $('btn-add'),
    reset: $('btn-reset'),
    print: $('btn-print'),
    orientations: $('orientations'),
    presets: $('presets'),
    cover: $('btn-cover'),
    contain: $('btn-contain'),
    gap: $('gap'),
    gapValue: $('gap-value'),
    margin: $('margin'),
    marginValue: $('margin-value'),
    border: $('border'),
    borderValue: $('border-value'),
    selected: $('selected'),
    noSelection: $('no-selection'),
    selThumb: $('sel-thumb'),
    zoom: $('zoom'),
    zoomValue: $('zoom-value'),
    duplicate: $('btn-duplicate'),
    fillSheet: $('btn-fill-sheet'),
    remove: $('btn-remove'),
    stage: $('stage'),
    empty: $('empty'),
    fit: $('fit'),
    sheets: $('sheets'),
    dropzone: $('dropzone'),
    printSettings: $('print-settings'),
    saving: $('saving'),
    offlineReady: $('offline-ready'),
    offlineUpdate: $('offline-update'),
    fileInput: $('file-input')
  };

  const ORIENTATIONS = ['portrait', 'landscape'];
  const STAGE_INSET_X = 56;          // stage side padding + a little breathing room
  const STAGE_INSET_Y = 80;
  const REMOVE_ICON =
    '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M18 6L6 18M6 6l12 12"/></svg>';

  /* <img> elements are cached per photo id so re-rendering never reloads or
     flashes an image — the same node is simply moved into the new cell. */
  const images = new Map();

  let drag = null;
  let lastLang = null;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  /* ── Static controls ───────────────────────────────────────────────────── */

  function buildControls() {
    I18N.LANGS.forEach(lang => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'lang';
      button.textContent = lang.label;
      button.onclick = () => Store.set({ lang: lang.id });
      button.dataset.lang = lang.id;
      el.langs.appendChild(button);
    });

    ORIENTATIONS.forEach(orientation => {
      const button = option(orientation, orientation);
      button.firstChild.className = 'orient-icon orient-' + orientation;
      button.lastChild.dataset.i18n = orientation;
      button.onclick = () => Store.set({ orientation: orientation });
      el.orientations.appendChild(button);
    });

    Layout.PRESETS.forEach(preset => {
      const button = option(preset.id, preset.label || '');
      if (preset.labelKey) button.lastChild.dataset.i18n = preset.labelKey;
      button.onclick = () => Store.set({ preset: preset.id });
      el.presets.appendChild(button);
    });
  }

  /** An option button: a little page diagram above a label. */
  function option(value, label) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'option';
    button.dataset.value = value;

    const icon = document.createElement('span');
    icon.className = 'option-icon';

    const text = document.createElement('span');
    text.className = 'option-label';
    text.textContent = label;

    button.append(icon, text);
    return button;
  }

  /** Redraw the preset diagrams — their grids flip with the paper. */
  function paintPresetIcons(orientation) {
    Layout.PRESETS.forEach(preset => {
      const icon = el.presets.querySelector('[data-value="' + preset.id + '"] .option-icon');
      const grid = Layout.presetGrid(preset, orientation);
      icon.style.gridTemplateColumns = 'repeat(' + grid.cols + ', 1fr)';
      icon.style.gridTemplateRows = 'repeat(' + grid.rows + ', 1fr)';
      icon.replaceChildren(
        ...Array.from({ length: grid.cols * grid.rows }, () => document.createElement('span'))
      );
    });
  }

  const press = (button, on) => button.setAttribute('aria-pressed', on ? 'true' : 'false');

  /* ── Render ────────────────────────────────────────────────────────────── */

  function render() {
    const state = Store.state;
    const photos = state.photos;

    if (state.lang !== lastLang) {
      lastLang = state.lang;
      I18N.apply(state.lang);
      el.langs.querySelectorAll('.lang').forEach(b => press(b, b.dataset.lang === state.lang));
    }

    el.root.dataset.orientation = state.orientation;
    el.pageRule.textContent = '@page { size: A4 ' + state.orientation + '; margin: 0; }';

    const layout = Layout.compute(state, photos.length);
    const pages = Layout.paginate(photos, layout.perPage);

    /* Preview scale: fit one whole sheet into the stage, never magnifying. */
    state.scale = clamp(Math.min(
      (el.stage.clientWidth - STAGE_INSET_X) / layout.pageWidthPx,
      (el.stage.clientHeight - STAGE_INSET_Y) / layout.pageHeightPx
    ), 0.2, 1);

    renderSheets(state, layout, pages);
    renderSidebar(state, layout);
    renderChrome(state, pages.length);
  }

  function renderSheets(state, layout, pages) {
    const sheets = el.sheets.style;
    sheets.setProperty('--page-w', layout.page.width + 'mm');
    sheets.setProperty('--page-h', layout.page.height + 'mm');
    sheets.setProperty('--page-pad', state.margin + 'mm');
    sheets.setProperty('--cell-gap', state.gap + 'mm');
    sheets.setProperty('--cell-border', state.border ? state.border + 'px solid #201e1d' : '0');
    sheets.setProperty('--grid-cols', layout.cols);
    sheets.setProperty('--grid-rows', layout.rows);
    sheets.setProperty('--scale', state.scale);

    el.sheets.replaceChildren(...pages.map(page => {
      const sheet = document.createElement('div');
      sheet.className = 'sheet';
      sheet.append(...page.map(photo => cell(photo, state.selectedId === photo.id)));
      return sheet;
    }));

    /* The stage scrolls the *scaled* footprint, so reserve exactly that much. */
    const gaps = 28 * (pages.length - 1);
    el.fit.style.width = Math.round(layout.pageWidthPx * state.scale) + 'px';
    el.fit.style.height = Math.round((layout.pageHeightPx * pages.length + gaps) * state.scale) + 'px';
    el.fit.classList.toggle('is-hidden', state.photos.length === 0);
    el.empty.classList.toggle('is-hidden', state.photos.length > 0);

    forgetUnusedImages(state.photos);
  }

  function cell(photo, isSelected) {
    const node = document.createElement('div');
    node.className = 'cell' + (isSelected ? ' is-selected' : '');
    node.dataset.id = photo.id;

    const image = imageFor(photo);
    image.style.objectFit = photo.fit;
    image.style.objectPosition = photo.x + '% ' + photo.y + '%';
    image.style.transform = photo.zoom > 100 ? 'scale(' + (photo.zoom / 100).toFixed(3) + ')' : 'none';

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'cell-remove';
    remove.dataset.print = 'ui';
    remove.title = 'Remove';
    remove.innerHTML = REMOVE_ICON;

    node.append(image, remove);
    return node;
  }

  function imageFor(photo) {
    let image = images.get(photo.id);
    if (!image) {
      image = document.createElement('img');
      image.alt = '';
      image.draggable = false;
      images.set(photo.id, image);
    }
    if (image.getAttribute('src') !== photo.url) image.src = photo.url;
    return image;
  }

  function forgetUnusedImages(photos) {
    const alive = new Set(photos.map(photo => photo.id));
    images.forEach((_, id) => { if (!alive.has(id)) images.delete(id); });
  }

  function renderSidebar(state, layout) {
    el.orientations.querySelectorAll('.option')
      .forEach(button => press(button, button.dataset.value === state.orientation));
    el.presets.querySelectorAll('.option')
      .forEach(button => press(button, button.dataset.value === state.preset));
    paintPresetIcons(state.orientation);

    const photos = state.photos;
    const every = fit => photos.length > 0 && photos.every(photo => photo.fit === fit);
    press(el.cover, every('cover'));
    press(el.contain, every('contain'));

    el.gap.value = state.gap;
    el.margin.value = state.margin;
    el.border.value = state.border;
    el.gapValue.textContent = I18N.t('mm', state.gap);
    el.marginValue.textContent = I18N.t('mm', state.margin);
    el.borderValue.textContent = I18N.t('borderValue', state.border);

    const selected = photos.find(photo => photo.id === state.selectedId) || null;
    el.selected.classList.toggle('is-hidden', !selected);
    el.noSelection.classList.toggle('is-hidden', !!selected);
    if (selected) {
      el.selThumb.src = selected.url;
      el.zoom.value = selected.zoom;
      el.zoomValue.textContent = I18N.t('percent', selected.zoom);
    }

    el.fillSheet.dataset.perPage = layout.perPage;
  }

  function renderChrome(state, pageCount) {
    const count = state.photos.length;
    el.countPhotos.textContent = I18N.t('photoCount', count);
    el.countPaper.textContent = count ? I18N.t('paperCount', pageCount) : '';
    el.printSettings.innerHTML = I18N.t('printSettings', I18N.t(state.orientation));
    el.saving.textContent = I18N.t('saving', count, pageCount);

    /* Both stay hidden until the service worker has actually cached the app —
       promising "works offline" before that is true would be a lie. */
    const offline = Offline.status;
    el.offlineReady.textContent = I18N.t('offlineReady');
    el.offlineReady.classList.toggle('is-hidden', !offline.ready || offline.updateReady);
    el.offlineUpdate.textContent = I18N.t('updateReady');
    el.offlineUpdate.classList.toggle('is-hidden', !offline.updateReady);
  }

  /* ── Events ────────────────────────────────────────────────────────────── */

  function bindEvents() {
    el.add.onclick = () => el.fileInput.click();
    el.empty.onclick = () => el.fileInput.click();
    el.fileInput.onchange = event => {
      Store.addFiles(event.target.files);
      event.target.value = '';
    };

    el.reset.onclick = () => Store.reset();
    el.offlineUpdate.onclick = () => Offline.applyUpdate();
    el.print.onclick = () => {
      Store.set({ selectedId: null });
      setTimeout(() => window.print(), 60);
    };

    el.cover.onclick = () => Store.updateAllPhotos({ fit: 'cover' });
    el.contain.onclick = () => Store.updateAllPhotos({ fit: 'contain', x: 50, y: 50, zoom: 100 });

    el.gap.oninput = event => Store.set({ gap: +event.target.value });
    el.margin.oninput = event => Store.set({ margin: +event.target.value });
    el.border.oninput = event => Store.set({ border: +event.target.value });
    el.zoom.oninput = event => {
      if (Store.state.selectedId) Store.updatePhoto(Store.state.selectedId, { zoom: +event.target.value });
    };

    el.duplicate.onclick = () => Store.duplicatePhoto(Store.state.selectedId, 1);
    el.fillSheet.onclick = () => Store.fillWith(Store.state.selectedId, +el.fillSheet.dataset.perPage);
    el.remove.onclick = () => Store.removePhoto(Store.state.selectedId);

    /* Photos: click selects, the corner button removes, dragging pans a crop. */
    el.sheets.addEventListener('pointerdown', event => {
      const node = event.target.closest('.cell');
      if (!node) return;
      event.stopPropagation();

      const id = node.dataset.id;
      if (event.target.closest('.cell-remove')) {
        drag = null;
        Store.removePhoto(id);
        return;
      }

      const photo = Store.state.photos.find(item => item.id === id);
      Store.set({ selectedId: id });
      if (photo && photo.fit === 'cover') startDrag(photo, event);
    });

    el.stage.addEventListener('pointerdown', () => {
      if (Store.state.selectedId) Store.set({ selectedId: null });
    });

    window.addEventListener('pointermove', onDragMove);
    window.addEventListener('pointerup', () => { drag = null; });

    /* Drop images anywhere in the window. */
    window.addEventListener('dragover', event => {
      if (!Array.from(event.dataTransfer.types || []).includes('Files')) return;
      event.preventDefault();
      el.dropzone.classList.add('is-active');
    });
    window.addEventListener('dragleave', event => {
      if (!event.relatedTarget) el.dropzone.classList.remove('is-active');
    });
    window.addEventListener('drop', event => {
      event.preventDefault();
      el.dropzone.classList.remove('is-active');
      Store.addFiles(event.dataTransfer.files);
    });

    window.addEventListener('keydown', event => {
      if (event.key === 'Escape' && Store.state.selectedId) Store.set({ selectedId: null });
      if ((event.key === 'Delete' || event.key === 'Backspace') && Store.state.selectedId) {
        if (document.activeElement === document.body) Store.removePhoto(Store.state.selectedId);
      }
    });

    window.addEventListener('resize', render);
    window.addEventListener('beforeprint', () => Store.set({ selectedId: null }));
  }

  /* Panning moves the crop window, so the maths runs in cell-percent units and
     divides out the preview scale to keep the photo under the pointer. */
  function startDrag(photo, event) {
    const layout = Layout.compute(Store.state, Store.state.photos.length);
    drag = {
      id: photo.id,
      image: images.get(photo.id),
      pointerX: event.clientX,
      pointerY: event.clientY,
      x: photo.x,
      y: photo.y,
      width: Math.max(24, layout.cellWidthPx),
      height: Math.max(24, layout.cellHeightPx)
    };
  }

  function onDragMove(event) {
    if (!drag) return;
    const scale = Store.state.scale || 1;
    const dx = (event.clientX - drag.pointerX) / scale;
    const dy = (event.clientY - drag.pointerY) / scale;
    const x = clamp(drag.x - (dx / drag.width) * 100, 0, 100);
    const y = clamp(drag.y - (dy / drag.height) * 100, 0, 100);

    drag.image.style.objectPosition = x + '% ' + y + '%';
    Store.updatePhotoQuietly(drag.id, { x: x, y: y });
  }

  /* ── Boot ──────────────────────────────────────────────────────────────── */

  buildControls();
  bindEvents();
  Store.subscribe(render);
  render();
  Offline.start(render);   // re-renders when the app becomes cached or updatable
})();
