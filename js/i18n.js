/* ============================================================================
   i18n — Telugu (default) and English. Exactly one language is shown at a time.

   Static text: put `data-i18n="key"` on the element; I18N.apply() fills it.
   Dynamic text: call I18N.t('key', ...args) — those entries are functions.
   ========================================================================= */

const I18N = (() => {

  const LANGS = [
    { id: 'te', label: 'తెలుగు' },
    { id: 'en', label: 'English' }
  ];

  const STRINGS = {

    te: {
      brand: 'ఒకేపేజీ',
      tagline: 'ఒకే పేజీలో ఫోటోలు',
      addPhotos: 'ఫోటోలు చేర్చండి',
      startOver: 'మళ్లీ మొదలు',
      print: 'ప్రింట్ చేయండి',

      photoCount: n => (n === 0 ? 'ఫోటోలు లేవు' : n + ' ఫోటోలు'),
      paperCount: n => n + ' A4 పేజీ' + (n > 1 ? 'లు' : ''),

      orientationTitle: 'కాగితం దిశ',
      orientationHint: 'ఫోటోలు అడ్డంగా ఉంటే అడ్డం కాగితం ఎంచుకోండి.',
      portrait: 'నిలువు',
      landscape: 'అడ్డం',

      perPageTitle: 'ఒక పేజీలో ఎన్ని ఫోటోలు',
      perPageHint: 'ఆటో అంటే కాగితం వృథా కాకుండా అదే సర్దుతుంది.',
      auto: 'ఆటో',

      cuttingTitle: 'కత్తిరించడం & ఖాళీ',
      fitCover: 'బాక్స్ నిండా',
      fitCoverNote: 'అంచులు కత్తిరించబడతాయి',
      fitContain: 'పూర్తి ఫోటో',
      fitContainNote: 'ఏమీ కత్తిరించబడదు',

      gap: 'ఫోటోల మధ్య ఖాళీ',
      margin: 'పేజీ అంచు ఖాళీ',
      border: 'కత్తిరించే గీత',
      mm: n => n + ' mm',
      borderValue: n => (n === 0 ? 'లేదు' : n + ' px'),

      selectedTitle: 'ఎంచుకున్న ఫోటో',
      selectedHint: 'ఫోటోను మౌస్‌తో లాగి కావలసిన భాగం కనిపించేలా పెట్టండి.',
      zoom: 'జూమ్ / కత్తిరింపు',
      percent: n => n + '%',
      duplicate: 'ఇంకో కాపీ చేర్చు',
      fillSheet: 'ఈ ఫోటోతో పేజీ నింపు',
      removePhoto: 'ఈ ఫోటో తీసివేయి',
      noSelection: 'మార్చాలంటే పేజీలో ఏదైనా ఫోటోపై క్లిక్ చేయండి.',

      emptyTitle: 'ఫోటోలను ఇక్కడ వదిలిపెట్టండి',
      emptyBody: 'వాట్సాప్, డౌన్‌లోడ్స్, పెన్‌డ్రైవ్ — ఎన్ని ఫోటోలైనా ఒకేసారి వదలండి. అవే A4 పేజీలో సర్దుకుంటాయి.',
      emptyCta: 'లేదా ఇక్కడ క్లిక్ చేసి ఫైల్స్ ఎంచుకోండి.',
      dropNow: 'ఇక్కడ వదిలిపెట్టండి',

      printSettings: orientation =>
        'ప్రింట్ విండోలో: <b>A4 ' + orientation + '</b> · మార్జిన్ <b>None</b> · స్కేల్ <b>100%</b> · హెడర్లు <b>off</b>',
      saving: (n, pages) =>
        n === 0 ? '' :
        n > 1 ? n + ' ఫోటోలకు ' + pages + ' పేజీ మాత్రమే — కాగితం ఆదా'
              : 'ఒకే షీట్‌లో అన్నీ'
    },

    en: {
      brand: 'Okepage',
      tagline: 'Photos on one page',
      addPhotos: 'Add photos',
      startOver: 'Start over',
      print: 'PRINT',

      photoCount: n => (n === 0 ? 'No photos yet' : n + ' photos'),
      paperCount: n => n + (n > 1 ? ' A4 sheets' : ' A4 sheet'),

      orientationTitle: 'Paper orientation',
      orientationHint: 'Pick landscape when your photos are wider than they are tall.',
      portrait: 'Portrait',
      landscape: 'Landscape',

      perPageTitle: 'Photos per page',
      perPageHint: 'Auto packs them the tightest way the paper allows.',
      auto: 'Auto',

      cuttingTitle: 'Cutting & spacing',
      fitCover: 'Fill the box',
      fitCoverNote: 'edges get cut',
      fitContain: 'Whole photo',
      fitContainNote: 'nothing cut',

      gap: 'Gap between photos',
      margin: 'Paper edge margin',
      border: 'Cutting line',
      mm: n => n + ' mm',
      borderValue: n => (n === 0 ? 'none' : n + ' px'),

      selectedTitle: 'Selected photo',
      selectedHint: 'Drag the photo on the sheet to move what shows inside its box.',
      zoom: 'Zoom & crop',
      percent: n => n + '%',
      duplicate: 'Add one more copy',
      fillSheet: 'Fill the sheet with this one',
      removePhoto: 'Remove this photo',
      noSelection: 'Click any photo on the sheet to crop, copy or remove it.',

      emptyTitle: 'Drag photos anywhere here',
      emptyBody: 'From WhatsApp, Downloads or a pen drive — drop as many as you like at once. They arrange themselves on the A4 sheet.',
      emptyCta: 'Or click here to choose files.',
      dropNow: 'Let go to add them',

      printSettings: orientation =>
        'Print dialog: <b>A4 ' + orientation + '</b> · margins <b>None</b> · scale <b>100%</b> · headers <b>off</b>',
      saving: (n, pages) =>
        n === 0 ? '' :
        n > 1 ? n + ' photos on ' + pages + (pages > 1 ? ' sheets' : ' sheet') + ' — paper saved'
              : 'All on one sheet'
    }
  };

  let lang = 'te';

  /** Look up a string; entries that are functions get called with `args`. */
  function t(key, ...args) {
    const value = STRINGS[lang][key];
    return typeof value === 'function' ? value(...args) : value;
  }

  /** Switch language and refill every [data-i18n] element in the document. */
  function apply(nextLang) {
    lang = STRINGS[nextLang] ? nextLang : 'te';
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = t(el.dataset.i18n);
    });
  }

  return { LANGS, t, apply, get lang() { return lang; } };
})();
