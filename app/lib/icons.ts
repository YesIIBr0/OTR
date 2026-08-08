/* OTR LMS · icon set (Lucide-style stroke icons) — portado del prototipo.
   Tipado como Record<string,string> (no un literal de claves fijas): components.ts
   (C.kpi/C.typeIcon) y varias pantallas scr-*.ts lo indexan con una clave dinámica
   (IC[opts.ic], IC[m[type]]) resuelta en runtime, no solo por nombre literal. */
export const IC: Record<string, string> = (() => {
  const w = (p: string) => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
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
    grip: w('<circle cx="9" cy="6" r="1.2" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="9" cy="18" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="6" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="15" cy="18" r="1.2" fill="currentColor" stroke="none"/>'),
    copy: w('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4.5A.5.5 0 0 1 4 14.5V4.5A.5.5 0 0 1 4.5 4h10a.5.5 0 0 1 .5.5V5"/>'),
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
