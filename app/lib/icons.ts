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
  };
})();

/* ---------------- ESCUDO OTR · logo de marca (Brand Book V1.0 · 2026) ----------
   VECTORIZADO DEL LOGO OFICIAL que entregó la marca (PNG 320x350 → contornos
   trazados sobre el canal alfa, viewBox 0 0 274 288). No es una reconstrucción:
   es el archivo de marca, punto por punto.

   Construcción del escudo (así es el original):
     ┌──────────────┬──────────────┐
     │ TINTA · "O"  │ HUECO · "T"  │  · mitad izquierda maciza en tinta, con la O
     │  calada      │  en tinta    │    y la R CALADAS (dejan ver el fondo)
     ├──────────────┼──────────────┤  · mitad derecha hueca, con el contorno, la T
     │ TINTA · "R"  │ HUECO        │    y el ribbon en tinta
     └──────────────┴──────────────┘  · banda horizontal a media altura: regla
                                        calada a la izquierda, barra maciza a la derecha

   MONOCROMO de verdad: UNA sola tinta + calados transparentes (fill-rule evenodd).
   El fondo se ve a través de los calados, así que el escudo se apoya sobre
   cualquier superficie sin recortes ni parches de color.

   - `ink`   → color de la marca. Negro #171717 sobre fondo claro; sobre fondo
                oscuro o naranja se pasa "#FFFFFF" y el logo queda en blanco.
   - `attrs` → atributos extra del <svg> raíz (class, style, width/height, o x/y
                si se anida dentro de otro svg).
   Proporción 274:288 (0.951) — la del logo oficial. */
export const otrCrest = ({ attrs = "", ink = "#171717" } = {}) =>
  `<svg viewBox="0 0 274 288" fill="none" aria-hidden="true" ${attrs}><path fill-rule="evenodd" clip-rule="evenodd" fill="${ink}" d="M0 0L274 0L274 166L273 166L273 173L272 173L270 187L269 187L266 199L264 201L264 204L263 204L263 206L261 208L261 211L259 212L256 220L254 221L253 225L248 230L248 232L245 234L245 236L240 240L240 242L227 255L225 255L221 260L219 260L217 263L215 263L214 265L212 265L208 269L202 271L201 273L199 273L199 274L197 274L193 277L190 277L188 279L185 279L183 281L180 281L180 282L176 282L176 283L165 285L165 286L152 287L152 288L123 288L123 287L116 287L116 286L101 284L101 283L86 279L86 278L84 278L80 275L77 275L77 274L71 272L70 270L66 269L65 267L61 266L60 264L58 264L51 257L49 257L42 249L40 249L40 247L31 239L31 237L25 231L25 229L23 228L23 226L19 222L17 216L15 215L15 213L12 209L12 206L9 202L9 199L8 199L8 196L7 196L7 193L6 193L6 190L5 190L5 186L4 186L4 182L3 182L3 178L2 178L2 172L1 172L1 164L0 164ZM138 11L137 12L137 136L11 136L11 152L137 152L137 136L263 136L263 11ZM67 41L67 42L60 42L60 43L57 43L57 44L51 46L50 48L48 48L42 54L42 56L40 57L40 59L38 61L38 64L37 64L36 76L37 76L37 81L38 81L38 84L39 84L41 90L43 91L43 93L47 97L49 97L53 101L61 103L61 104L77 104L77 103L80 103L80 102L83 102L83 101L87 100L88 98L90 98L96 92L96 90L98 89L98 87L100 85L100 82L101 82L102 68L101 68L101 64L100 64L100 61L99 61L98 57L96 56L96 54L89 47L87 47L87 46L85 46L85 45L83 45L81 43L78 43L78 42L70 42L70 41ZM180 49L227 49L227 61L210 61L210 110L198 110L197 109L197 61L180 61ZM63 54L78 55L87 64L88 79L87 79L85 85L81 89L79 89L77 91L74 91L74 92L61 91L58 88L56 88L54 86L54 84L52 83L52 81L51 81L50 67L51 67L53 61L57 57L59 57L60 55L63 55ZM137 152L137 276L138 277L141 277L141 276L154 276L154 275L160 275L160 274L173 272L173 271L182 269L184 267L187 267L187 266L199 261L200 259L204 258L205 256L207 256L209 253L211 253L213 250L215 250L219 245L221 245L231 235L231 233L237 228L237 226L239 225L239 223L242 221L245 214L247 213L247 211L248 211L248 209L249 209L249 207L250 207L250 205L251 205L251 203L254 199L255 193L257 191L258 184L259 184L260 177L261 177L261 171L262 171L263 152L216 152L216 189L214 189L214 188L212 188L212 187L210 187L210 186L208 186L208 185L206 185L202 182L198 182L197 184L194 184L191 187L189 187L187 189L184 189L184 152ZM47 175L46 176L46 235L59 235L59 216L60 215L70 215L70 216L72 216L82 235L96 235L96 233L94 232L92 226L90 225L87 217L84 214L85 212L87 212L91 208L91 206L94 202L94 189L93 189L92 184L89 182L89 180L87 180L86 178L84 178L82 176L78 176L78 175ZM60 187L76 187L76 188L78 188L81 192L80 200L77 203L59 203L59 188L60 188Z"/></svg>`;
