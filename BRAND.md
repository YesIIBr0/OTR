# OTR Debating Academy — Brand Book V1.0 (2026)

> Resumen operativo del Brand Book V1.0. Fuente de verdad de los **valores** en código:
> `app/styles/tokens.css`. Enforcement: `tests/brand-palette.test.ts` (falla si aparece
> la paleta pre-rebrand). Convenciones de aplicación: `docs/CONVENTIONS.md`.
> Dudas de marca o uso del escudo: **brand@otracademy.com**.

## Esencia

- **Nombre visible:** **OTR Debating Academy** (nunca abreviado en primera mención). OTR = *Own The Room*.
- **Idea central:** **"Convierte la presión en confianza."**
- **Qué somos:** una academia que **compite y gana** — no un colegio. Entrenamos debatientes para rendir bajo presión y ganar rondas.
- **Estética:** prestigio, alto rendimiento, sobriedad. **No escolar**, no infantil, no "startup colorida".

## Paleta

Estricta: negro, blanco, grises fríos y **un solo acento naranja**.

| Rol | Hex | Uso |
|---|---|---|
| Negro (ink-900) | `#171717` | Autoridad, texto, registro "arena", **botón primario** |
| Blanco | `#FFFFFF` | Canvas de página, tarjetas |
| Naranja (acento) | `#F25623` | **Único acento**: CTA estrella, énfasis, foco, datos |
| Naranja oscuro | `#C8401A` | Hover del acento, links, `danger` |
| Naranja suave | `#F8987A` | Acento sobre fondo oscuro (texto pequeño) |
| Tinte naranja | `#FDE7DE` | Fondos de énfasis, chips, hover suave |
| Texto sobre tinte | `#9E3211` | Texto AA (≥4.5:1) sobre `#FDE7DE` |
| Dark gray | `#4D4D4D` | Texto secundario, `info` |
| Light gray | `#DEDEDE` | Bordes fuertes, separadores |

Rampa fría completa: `#FCFCFC` `#F7F7F7` `#EFEFEF` `#E7E7E7` `#DEDEDE` `#BDBDBD` `#8C8C8C` `#6B6B6B` `#4D4D4D` `#333333` `#262626` `#171717`.

**Reglas de uso**

- **Moderación del acento:** una sola pieza en naranja por vista. Si dos elementos pelean por el naranja, uno pasa a negro o gris.
- **El botón primario es NEGRO.** El naranja se reserva para el CTA estrella de la pantalla.
- **Sin verde, sin oro, sin azul, sin ámbar.** Tampoco degradados multicolor.
- **Estados dentro de la paleta:** ok `#171717`/`#EFEFEF` · warn `#F25623`/`#FDE7DE` · danger `#C8401A`/`#FBDDD2` · info `#4D4D4D`/`#EFEFEF`.
- **Niveles:** novato `#BDBDBD` → JV `#8C8C8C` → Varsity `#4D4D4D` → Strategist `#171717` → Elite `#F25623`.

## Escudo

Escudo de cuatro cuadrantes con las letras O · T · R (`otrCrest()` en `app/lib/icons.ts`).

- **Monocromo siempre:** un solo color según el fondo. Negro `#171717` sobre fondo claro; blanco `#FFFFFF` sobre fondo oscuro o naranja.
- **Área de protección:** margen libre a los cuatro lados igual a **x = la mitad del ancho del escudo**. Nada (texto, borde, foto) entra en esa zona.
- **Tamaños mínimos:** **24 px** en digital, **96 px** (equivalente) en impreso o aplicaciones grandes.

**NUNCA**

- Nunca a color sobre fondo de color.
- Nunca sombras, degradados, brillos ni relieves sobre el escudo.
- Nunca deformarlo, rotarlo ni recortarlo.
- Nunca cambiar las proporciones internas ni sustituir la tipografía de las letras.
- Nunca colocarlo sobre fotos con poco contraste ni dentro del área de protección de otro elemento.

## Tipografía

- **Inter, única familia** de todo el sistema: producto, marca, landing y emails. (Se retiró *Archivo Expanded*.)
- **Titulares:** peso **800** (extrabold), tracking **-0.03em**; en display grande, **-0.035em**.
- **Cuerpo:** 15–16 px, peso 400/500. **Base UI:** 14 px.
- **Sentence case** en titulares y botones. Mayúsculas solo en *eyebrows*, con tracking positivo.
- **Énfasis de marca:** **bold italic en naranja** `#F25623` dentro de un titular — un fragmento corto, una vez por titular.

## Iconografía

- Familia **Lucide-style**: trazo **2 px**, extremos redondeados, `currentColor` (heredan el color del texto).
- Set del producto en `app/lib/icons.ts`. No mezclar con iconos rellenos ni de otra familia.
- **Sin emoji** en UI, copy, emails ni documentación de producto.

## Voz y tono

- **Español LATAM con registro dominicano (RD)**; el inglés queda para los términos del circuito (Public Forum, Varsity, break).
- **Tuteo aspiracional:** le hablamos de tú al estudiante, con respeto y ambición. Directo, sin paternalismo ni jerga motivacional vacía.
- **Sentence case** en todo el copy. Frases cortas, verbos de acción, cero relleno.
- **CTA estrella:** **"Inscríbete ahora"**.
- Nombramos resultados concretos (torneos, rondas, premios) antes que adjetivos.

## Radios

Escala corta: **0 · 4 · 8 · 12 · pill (999)**.

- **Controles** (botones, inputs, chips): **8 px**.
- **Tarjetas y contenedores**: **12 px**.
- **Pill (999)**: solo para badges y toggles redondeados.
- Nada por encima de 12 px en tarjetas; nada de radios intermedios (9, 10, 14…).

---

## Apéndice — contenido real del sitio (scrape jun 2026)

> Se conserva como fuente de copys y seed. Los **colores y la tipografía** de este apéndice
> quedaron derogados por el Brand Book V1.0 de arriba; el **contenido** sigue vigente.

- **Lema histórico:** "Own the Room. Master the Art of Speaking." · "By Students, For Students."
- **Promesa:** "Train with the academy redefining how to speak in a room."
- **Booking real:** https://otr-academy.com/book-your-consultation/

### Stats (reales)
- **100%** — Confidence Improvement Rate
- **50+** — Students Trained in 2025
- **<30 días** — Instant results in the way you speak
- **15+** — International Tournaments

### Logros de torneos (carrusel real)
- Harvard Forensics & Debate Tournament — **Junior Varsity Champions**
- Tournament of Champions — **Gold Varsity Semifinalist**
- Florida Blue Key Debate Tournament — **Varsity Doubles, Octofinals, Best Speakers**
- New Horizons Forensics & Debate Tournament — **Varsity Champions**
- St. Michael's Tournament — **Co-Champions**

### Testimonios (reales, verbatim resumido)
1. **Isabella & Aaron** — Nunca habían roto en torneo oficial. Tras 2 meses: 14 rondas consecutivas ganadas, Campeones de New Horizons, Co-Campeones de St. Michael's, y rompieron en Florida Blue Key con el mejor récord Novice de un equipo dominicano. "360° en menos de 3 meses."
2. **Jose & Sigmund** — Batallaban con discursos de 4 min y nunca habían roto. Tras OTR rompieron en Florida Blue Key y Sigmund ganó Novice Speaking Award.
3. **Analía & Silvana** — Nunca habían llegado a una final. Tras OTR: mejor equipo Varsity del circuito dominicano, finales consecutivas, ganaron New Horizons y Co-Campeonas de St. Michael's (Varsity).

### "Why Most Students Struggle" (4)
- Nervous when it's time to speak
- Ideas lack structure and clarity
- Trouble finding credible evidence
- Few opportunities to practice in real debates

### "Our Solution" (4)
- Overcome stage anxiety through progressive, confidence-building drills.
- Learn world-class strategies that have won international tournaments.
- Master argument structure and critical thinking like elite debaters.
- Join weekly simulations with personalized feedback from judges and coaches.

### FAQ (7 preguntas reales)
1. How soon will I see results?
2. Do I need prior experience?
3. How much time commitment is required?
4. What makes OTR different from school debate programs?
5. Is there ongoing support after enrollment?
6. Do you offer support after completing the program?
7. What age groups do you work with?

### Formatos de debate (programas)
- **Public Forum (PF)** · **Lincoln-Douglas (LD)** · **Parliamentary (Parli)** · **Policy Debate** · Oratoria / Speaking (transversal)

### Datos de programa
- Edades **10+**; colocación por habilidad, no solo edad.
- Compromiso **2–4 h/semana**.
- Consulta gratis + roadmap personalizado al inscribirse.
- Soporte continuo post-programa + red de por vida.

### CTAs
- **"Inscríbete ahora"** (CTA estrella; único elemento naranja de la vista)
- "Join a Free Session" / "Book a Free Consultation" (secundarios, botón negro o texto)
