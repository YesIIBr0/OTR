/* OTR LMS · icon set — geometría LUCIDE v1.30.0 (ISC), 24x24 / trazo 2 / remates
   y uniones redondeados / currentColor / sin relleno. Es el mismo set que usa el
   mockup: cualquier icono nuevo se copia de Lucide tal cual, no se dibuja a ojo.

   NO renombrar claves: components.ts (C.kpi/C.typeIcon) y varias pantallas
   scr-*.ts indexan con clave dinámica (IC[opts.ic], IC[m[type]]) en runtime.
   Al lado de cada clave va el nombre Lucide del que sale, para poder actualizar. */
export const IC: Record<string, string> = (() => {
  const w = (p: string) => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  return {
    /* house */        home: w('<path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
    /* layout-grid */  grid: w('<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>'),
    /* book */         book: w('<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/>'),
    /* circle-play */  play: w('<path d="M9 9.003a1 1 0 0 1 1.517-.859l4.997 2.997a1 1 0 0 1 0 1.718l-4.997 2.997A1 1 0 0 1 9 14.996z"/><circle cx="12" cy="12" r="10"/>'),
    /* file-text */    doc: w('<path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>'),
    /* check */        check: w('<path d="M20 6 9 17l-5-5"/>'),
    /* circle-check */ checkCircle: w('<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>'),
    /* clock */        clock: w('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'),
    /* chart-column */ chart: w('<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>'),
    /* trophy */       trophy: w('<path d="M10 14.66V17a1 1 0 0 1-1 1 2 2 0 0 0-2 2v2"/><path d="M14 14.66V17a1 1 0 0 0 1 1 2 2 0 0 1 2 2v2"/><path d="M17.916 10H19.5A2.5 2.5 0 0 0 22 7.5V5a1 1 0 0 0-1-1h-3"/><path d="M4 22h16"/><path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z"/><path d="M6.084 10H4.5A2.5 2.5 0 0 1 2 7.5V5a1 1 0 0 1 1-1h3"/>'),
    /* medal */        medal: w('<path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15"/><path d="M11 12 5.12 2.2"/><path d="m13 12 5.88-9.8"/><path d="M8 7h8"/><circle cx="12" cy="17" r="5"/><path d="M12 18v-2h-.5"/>'),
    /* users */        users: w('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><path d="M16 3.128a4 4 0 0 1 0 7.744"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/>'),
    /* user */         user: w('<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'),
    /* mic */          mic: w('<path d="M12 19v3"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><rect x="9" y="2" width="6" height="13" rx="3"/>'),
    /* video */        video: w('<path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.87a.5.5 0 0 0-.752-.432L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/>'),
    /* grip-vertical */ grip: w('<circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/>'),
    /* copy */         copy: w('<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>'),
    /* search */       search: w('<path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/>'),
    /* bell */         bell: w('<path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/>'),
    /* menu */         menu: w('<path d="M4 5h16"/><path d="M4 12h16"/><path d="M4 19h16"/>'),
    /* chevron-right */ chevR: w('<path d="m9 18 6-6-6-6"/>'),
    /* chevron-left */ chevL: w('<path d="m15 18-6-6 6-6"/>'),
    /* chevron-down */ chevD: w('<path d="m6 9 6 6 6-6"/>'),
    /* arrow-right */  arrowR: w('<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>'),
    /* plus */         plus: w('<path d="M5 12h14"/><path d="M12 5v14"/>'),
    /* x */            close: w('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'),
    /* settings */     settings: w('<path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/><circle cx="12" cy="12" r="3"/>'),
    /* log-out */      logout: w('<path d="m16 17 5-5-5-5"/><path d="M21 12H9"/><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>'),
    /* flame */        flame: w('<path d="M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4"/>'),
    /* target */       target: w('<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>'),
    /* calendar */     calendar: w('<path d="M8 2v3"/><path d="M16 2v3"/><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/>'),
    /* download */     download: w('<path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/>'),
    /* star */         star: w('<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>'),
    /* eye */          eye: w('<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>'),
    /* pencil */       pencil: w('<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>'),
    /* message-square */ msg: w('<path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"/>'),
    /* flag */         flag: w('<path d="M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528"/>'),
    /* lock */         lock: w('<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'),
    /* chart-no-axes-column */ levels: w('<path d="M5 21v-6"/><path d="M12 21V3"/><path d="M19 21V9"/>'),
    /* settings-2 */   sliders: w('<path d="M14 17H5"/><path d="M19 7h-9"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>'),
    /* file */         file: w('<path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/>'),
    /* headset */      headset: w('<path d="M3 11h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5Zm0 0a9 9 0 1 1 18 0m0 0v5a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3Z"/><path d="M21 16v2a4 4 0 0 1-4 4h-5"/>'),
    /* pause */        pause: w('<rect x="14" y="3" width="5" height="18" rx="1"/><rect x="5" y="3" width="5" height="18" rx="1"/>'),
    /* refresh-cw */   refresh: w('<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>'),
    /* award */        award: w('<path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"/><circle cx="12" cy="8" r="6"/>'),

    /* --- nuevos: los que usa el mockup y no teníamos --- */
    /* zap */          zap: w('<path d="M15.914 4a1.5 1.5 0 0 0-2.474-1.561l-9 9A1.5 1.5 0 0 0 5.5 14h4.002a.5.5 0 0 1 .471.666L8.086 20a1.5 1.5 0 0 0 2.475 1.56l9-9A1.5 1.5 0 0 0 18.5 10h-3.997a.5.5 0 0 1-.472-.667z"/>'),
    /* crown */        crown: w('<path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"/><path d="M5 21h14"/>'),
    /* trending-up */  trendUp: w('<path d="M16 7h6v6"/><path d="m22 7-8.5 8.5-5-5L2 17"/>'),
    /* map-pin */      mapPin: w('<path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>'),
    /* shield */       shield: w('<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>'),

    /* --- [RONDA2 · CLASES] los que usa el mockup del "adentro" de la clase --- */
    /* info */         info: w('<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>'),
    /* list-checks */  listChecks: w('<path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/>'),
    /* presentation */ presentation: w('<path d="M2 3h20"/><path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3"/><path d="m7 21 5-5 5 5"/>'),
    /* message-circle */ msgCircle: w('<path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"/>'),
    /* arrow-left */   arrowL: w('<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>'),
    /* arrow-up-right */ arrowUR: w('<path d="M7 7h10v10"/><path d="M7 17 17 7"/>'),
  };
})();

/* ---------------- ESCUDO OTR · logo de marca (Brand Book V1.0 · 2026) ----------
   REDIBUJADO CON GEOMETRÍA LIMPIA a partir de las medidas del archivo oficial de la
   marca (PNG 320x350 medido píxel a píxel: bbox del escudo 274x288). Antes esto era
   un TRAZADO del bitmap y las curvas salían dentadas a tamaño grande; ahora la O es
   un círculo de verdad, la T y la banda son rectángulos, y el contorno del escudo son
   dos curvas cúbicas. Escala sin escalones a cualquier tamaño.

   Construcción (idéntica al original):
     ┌──────────────┬──────────────┐
     │ TINTA · "O"  │ CALADO · "T" │  · mitad IZQUIERDA maciza, con la O y la R
     │   calada     │  + ribbon    │    CALADAS (dejan ver el fondo)
     ├──────────────┼──────────────┤  · mitad DERECHA calada, con el contorno,
     │ TINTA · "R"  │   CALADO     │    la T y el ribbon en tinta
     └──────────────┴──────────────┘  · banda a media altura: regla calada a la
                                        izquierda, barra maciza a la derecha

   MONOCROMO real: UNA tinta + calados transparentes (se resuelve con <mask>, no con
   parches de color), así el escudo se apoya sobre cualquier superficie.

   - `ink` → color de la marca. Negro #171717 sobre fondo claro; sobre fondo oscuro o
              naranja se pasa "#FFFFFF".
   - `id`  → sufijo ÚNICO por instancia: la máscara se referencia con url(#…).
   - `attrs` → atributos extra del <svg> raíz.
   Proporción 274:288 (0.951), la del archivo oficial. */
export const otrCrest = ({ id = "crest", attrs = "", ink = "#171717" } = {}) => {
  const shield = "M0 0H274v161.3c0 62.7-68 126.7-137 126.7S0 224 0 161.3Z";
  return `<svg viewBox="0 0 274 288" fill="none" aria-hidden="true" ${attrs}>
    <defs><mask id="otr-m-${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="274" height="288">
      <rect width="274" height="288" fill="#000"/>
      <rect width="136" height="288" fill="#fff"/>
      <path d="${shield}" fill="none" stroke="#fff" stroke-width="20"/>
      <rect x="136" y="136" width="138" height="15" fill="#fff"/>
      <path d="M184 151h31v37l-15.5-7L184 188Z" fill="#fff"/>
      <rect x="180" y="49" width="46" height="11" fill="#fff"/>
      <rect x="197" y="49" width="12" height="60" fill="#fff"/>
      <circle cx="68.5" cy="72" r="26" fill="none" stroke="#000" stroke-width="13"/>
      <rect x="11" y="136" width="125" height="15" fill="#000"/>
      <rect x="46" y="175" width="12" height="59" fill="#000"/>
      <path fill-rule="evenodd" d="M58 175h20c10 0 15 8.5 15 19.5S88 214 78 214H58Zm0 11h16c6 0 8.5 3.5 8.5 8.5S80 203 74 203H58Z" fill="#000"/>
      <path d="M70 212h13l12 22H81Z" fill="#000"/>
    </mask></defs>
    <path d="${shield}" fill="${ink}" mask="url(#otr-m-${id})"/>
  </svg>`;
};
