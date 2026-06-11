// @ts-nocheck
/* OTR LMS · icon set (Lucide-style stroke icons) — portado del prototipo */
export const IC = (() => {
  const w = (p) => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  return {
    home: w('<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9.5 21v-6h5v6"/>'),
    grid: w('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'),
    book: w('<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 5.5V20.5"/>'),
    play: w('<circle cx="12" cy="12" r="9"/><path d="M10 8.5l5 3.5-5 3.5z" fill="currentColor" stroke="none"/>'),
    doc: w('<path d="M6 2.5h7l5 5V21a.5.5 0 0 1-.5.5H6A.5.5 0 0 1 5.5 21V3A.5.5 0 0 1 6 2.5z"/><path d="M13 2.5V8h5"/><path d="M8.5 13h7M8.5 16.5h7"/>'),
    check: w('<path d="M4 12.5l5 5L20 6"/>'),
    checkCircle: w('<circle cx="12" cy="12" r="9"/><path d="M8.5 12l2.5 2.5 4.5-5"/>'),
    clock: w('<circle cx="12" cy="12" r="9"/><path d="M12 7.5V12l3 2"/>'),
    chart: w('<path d="M4 20V4"/><path d="M4 20h16"/><rect x="7" y="12" width="3" height="5"/><rect x="12" y="8" width="3" height="9"/><rect x="17" y="5" width="3" height="12"/>'),
    trophy: w('<path d="M7 4h10v3a5 5 0 0 1-10 0V4z"/><path d="M7 5H4v1a3 3 0 0 0 3 3M17 5h3v1a3 3 0 0 1-3 3"/><path d="M9 13v3h6v-3M8 20h8M12 16v4"/>'),
    medal: w('<circle cx="12" cy="14" r="6"/><path d="M9 8.5 7 3M15 8.5 17 3M12 11.5l1 2 2 .2-1.5 1.4.4 2-1.9-1-1.9 1 .4-2L9.5 13.7l2-.2z"/>'),
    users: w('<circle cx="9" cy="8" r="3.2"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><path d="M16 5.2a3.2 3.2 0 0 1 0 6M17.5 14.2A5.5 5.5 0 0 1 20.5 19"/>'),
    user: w('<circle cx="12" cy="8" r="3.6"/><path d="M5 20a7 7 0 0 1 14 0"/>'),
    mic: w('<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6"/>'),
    video: w('<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3z"/>'),
    search: w('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>'),
    bell: w('<path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6z"/><path d="M10 19a2 2 0 0 0 4 0"/>'),
    menu: w('<path d="M4 7h16M4 12h16M4 17h16"/>'),
    chevR: w('<path d="M9 6l6 6-6 6"/>'),
    chevL: w('<path d="M15 6l-6 6 6 6"/>'),
    chevD: w('<path d="M6 9l6 6 6-6"/>'),
    arrowR: w('<path d="M5 12h14M13 6l6 6-6 6"/>'),
    plus: w('<path d="M12 5v14M5 12h14"/>'),
    close: w('<path d="M6 6l12 12M18 6 6 18"/>'),
    settings: w('<circle cx="12" cy="12" r="3"/><path d="M12 2.5v2M12 19.5v2M4.5 12h-2M21.5 12h-2M6 6l-1.4-1.4M19.4 19.4 18 18M18 6l1.4-1.4M4.6 19.4 6 18"/>'),
    logout: w('<path d="M15 4h3.5a.5.5 0 0 1 .5.5v15a.5.5 0 0 1-.5.5H15"/><path d="M10 12h9M16 8l3 4-3 4"/>'),
    flame: w('<path d="M12 3c1 3.5 5 4.5 5 9a5 5 0 0 1-10 0c0-1.8.7-2.8 1.5-3.7C9 10 9.5 8 8.5 6.5 11 7 12 5 12 3z"/>'),
    target: w('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>'),
    calendar: w('<rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>'),
    download: w('<path d="M12 4v11M8 11l4 4 4-4"/><path d="M5 20h14"/>'),
    star: w('<path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 17l-5.3 2.7 1-5.8L3.5 9.7l5.9-.9z"/>'),
    eye: w('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>'),
    pencil: w('<path d="M14.5 5.5l4 4M4 20l1-4 11-11 4 4L9 20z"/>'),
    msg: w('<path d="M4 5.5h16v11H9l-4 3.5V16.5H4z"/>'),
    flag: w('<path d="M5 21V4M5 4h11l-1.5 3.5L16 11H5"/>'),
    lock: w('<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>'),
    levels: w('<path d="M4 20V14h4v6M10 20V9h4v11M16 20V5h4v15"/>'),
    sliders: w('<path d="M4 8h10M18 8h2M4 16h2M10 16h10"/><circle cx="16" cy="8" r="2.2"/><circle cx="8" cy="16" r="2.2"/>'),
    file: w('<path d="M13 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V8z"/><path d="M13 3v5h5"/>'),
    headset: w('<path d="M5 13a7 7 0 0 1 14 0"/><rect x="3.5" y="13" width="3.5" height="6" rx="1.5"/><rect x="17" y="13" width="3.5" height="6" rx="1.5"/><path d="M19 19a3 3 0 0 1-3 3h-2"/>'),
    pause: w('<rect x="8" y="6" width="3" height="12" rx="1" fill="currentColor" stroke="none"/><rect x="13" y="6" width="3" height="12" rx="1" fill="currentColor" stroke="none"/>'),
    refresh: w('<path d="M20 11a8 8 0 0 0-14-4.5L4 8M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14 4.5L20 16M20 20v-4h-4"/>'),
    award: w('<circle cx="12" cy="9" r="5.5"/><path d="M8.5 13.5L7 21l5-2.5L17 21l-1.5-7.5"/>'),
  };
})();

/* ---------------- ESCUDO OTR · logo de marca (OTRBRANDBOOK 2026) ----------------
   Shield con tapa plana y punta inferior redondeada, dividido en una grilla 2x2
   de cuadrantes que alternan crema/negro (recortados con clipPath):

     ┌──────────────┬──────────────┐
     │ CREMA · "O"  │ NEGRO · "T"  │  · la O (negra) lleva un trazo horizontal
     │  O cruzada   │  + ribbon    │    que la cruza por debajo
     ├──────────────┼──────────────┤  · bajo la T cuelga un ribbon/marcador de
     │ NEGRO · "R"  │ CREMA vacío  │    libro crema (muesca triangular inferior)
     └──────────────┴──────────────┘  · inferior-derecho: crema, sin letra

   Letras O/T/R en Inter 800. Colores fijos de marca: crema #F7F7ED y negro
   #0C0C0C. Pensado para fondos OSCUROS (contorno crema por defecto); sobre
   fondos claros pásese `outline` negro.

   - `id`    → sufijo ÚNICO por documento (el clipPath se referencia con url(#…);
               dos instancias simultáneas no deben compartir id).
   - `attrs` → atributos extra inyectados en el <svg> raíz (class, style,
               width/height, o x/y si se anida dentro de otro svg).
   viewBox "0 0 26 30" — mismas proporciones que el crest anterior para no
   romper los layouts existentes. */
export const otrCrest = ({ id = "crest", attrs = "", outline = "#F7F7ED" } = {}) => {
  const CREAM = "#F7F7ED", BLACK = "#0C0C0C";
  // Contorno del shield: M tapa (y=2) → lados rectos hasta y=15.5 → curvas que
  // convergen en la punta inferior, suavizada con un pequeño arco (redondeada).
  const shield = "M3 2 H23 V15.5 C23 21.5 19.8 25.8 14.2 28.6 C13.45 28.97 12.55 28.97 11.8 28.6 C6.2 25.8 3 21.5 3 15.5 Z";
  return `<svg viewBox="0 0 26 30" fill="none" aria-hidden="true" ${attrs}>
    <defs><clipPath id="otr-shield-${id}"><path d="${shield}"/></clipPath></defs>
    <g clip-path="url(#otr-shield-${id})">
      <rect x="3" y="2" width="10" height="13.5" fill="${CREAM}"/>
      <rect x="13" y="2" width="10" height="13.5" fill="${BLACK}"/>
      <rect x="3" y="15.5" width="10" height="13.6" fill="${BLACK}"/>
      <rect x="13" y="15.5" width="10" height="13.6" fill="${CREAM}"/>
      <text x="8" y="11.8" font-family="Inter" font-weight="800" font-size="9" fill="${BLACK}" text-anchor="middle">O</text>
      <path d="M4.2 10.6 H11.8" stroke="${BLACK}" stroke-width="1.1"/>
      <text x="18" y="10" font-family="Inter" font-weight="800" font-size="9" fill="${CREAM}" text-anchor="middle">T</text>
      <path d="M16.7 11 H19.3 V14.6 L18 13.3 L16.7 14.6 Z" fill="${CREAM}"/>
      <text x="8.4" y="22.6" font-family="Inter" font-weight="800" font-size="9" fill="${CREAM}" text-anchor="middle">R</text>
    </g>
    <path d="${shield}" stroke="${outline}" stroke-width="1.1"/>
  </svg>`;
};
