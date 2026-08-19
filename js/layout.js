/* ============================================================================
   Layout — pure geometry, no DOM. Everything is in millimetres until the very
   last step, because that is what the printer cares about.

   A preset stores its grid for PORTRAIT paper; landscape simply swaps the
   columns and rows (2 photos stacked become 2 side by side, 6 = 2x3 becomes
   3x2, and so on). 'auto' ignores that and derives a grid from the photo
   count and the printable area's aspect ratio.
   ========================================================================= */

const Layout = (() => {

  const MM_PER_INCH = 25.4;
  const PX_PER_MM = 96 / MM_PER_INCH;   // CSS reference pixels per mm

  const PAPER = { width: 210, height: 297 };   // A4, portrait

  const PRESETS = [
    { id: 'auto', labelKey: 'auto', cols: 2, rows: 3 },   // cols/rows here only draw the icon
    { id: 'p1', label: '1', cols: 1, rows: 1 },
    { id: 'p2', label: '2', cols: 1, rows: 2 },
    { id: 'p4', label: '4', cols: 2, rows: 2 },
    { id: 'p6', label: '6', cols: 2, rows: 3 },
    { id: 'p9', label: '9', cols: 3, rows: 3 }
  ];

  const MAX_AUTO_PER_PAGE = 24;

  /** Sheet size in mm for the given orientation. */
  function pageSize(orientation) {
    return orientation === 'landscape'
      ? { width: PAPER.height, height: PAPER.width }
      : { width: PAPER.width, height: PAPER.height };
  }

  /** The grid an option button should draw, honouring orientation. */
  function presetGrid(preset, orientation) {
    return orientation === 'landscape'
      ? { cols: preset.rows, rows: preset.cols }
      : { cols: preset.cols, rows: preset.rows };
  }

  /**
   * Work out the grid and cell size for the current settings.
   * Returns mm measurements plus the pixel cell size the drag maths needs.
   */
  function compute(state, photoCount) {
    const page = pageSize(state.orientation);
    const innerWidth = page.width - 2 * state.margin;
    const innerHeight = page.height - 2 * state.margin;

    const preset = PRESETS.find(item => item.id === state.preset) || PRESETS[0];
    let cols, rows;

    if (preset.id === 'auto') {
      /* Pick the column count that makes cells closest to square, then fit the
         rows around it — the tightest honest packing of a plain grid. */
      const count = Math.max(1, Math.min(photoCount, MAX_AUTO_PER_PAGE));
      cols = Math.max(1, Math.round(Math.sqrt((count * innerWidth) / innerHeight)));
      rows = Math.max(1, Math.ceil(count / cols));
      /* Drop any column or row that would come out completely empty, so a
         single photo on landscape paper gets the whole sheet, not half of it. */
      while (cols > 1 && (cols - 1) * rows >= count) cols--;
      while (rows > 1 && cols * (rows - 1) >= count) rows--;
    } else {
      const grid = presetGrid(preset, state.orientation);
      cols = grid.cols;
      rows = grid.rows;
    }

    const cellWidth = (innerWidth - (cols - 1) * state.gap) / cols;
    const cellHeight = (innerHeight - (rows - 1) * state.gap) / rows;

    return {
      page: page,
      cols: cols,
      rows: rows,
      perPage: cols * rows,
      cellWidth: cellWidth,
      cellHeight: cellHeight,
      cellWidthPx: cellWidth * PX_PER_MM,
      cellHeightPx: cellHeight * PX_PER_MM,
      pageWidthPx: page.width * PX_PER_MM,
      pageHeightPx: page.height * PX_PER_MM
    };
  }

  /** Split photos into pages of `perPage`. Always at least one (empty) page. */
  function paginate(photos, perPage) {
    const pages = [];
    for (let i = 0; i < photos.length; i += perPage) pages.push(photos.slice(i, i + perPage));
    return pages.length ? pages : [[]];
  }

  return { PRESETS, PX_PER_MM, pageSize, presetGrid, compute, paginate };
})();
