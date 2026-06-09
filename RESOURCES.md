# 📦 Recursos para construir el sitio de OTR Academy

Suelta aquí los archivos y con eso montamos el sitio **localmente** (Next.js, en tu paleta de marca).
Las **originales** van en `assets/` (fuente de verdad); yo las optimizo y las copio al proyecto.

## 📁 Dónde va cada cosa

| Carpeta | Qué poner | Formato ideal |
|---|---|---|
| `assets/01-logo` | Escudo OTR — versión clara y oscura, favicon | **SVG** (vector) + PNG transparente |
| `assets/02-fonts` | Tipografías de marca (si tienen licencia propia) | `.woff2` / `.otf` / `.ttf` |
| `assets/03-fotos` | Fotos reales: escenario, trofeos, eventos, coaches | JPG/PNG alta resolución (≥2000px) |
| `assets/04-casos` | Antes/después de casos (Analia & María, Saúl & Agustín…) | JPG + nombre del caso |
| `assets/05-video` | B-roll / clips para fondos (opcional) | MP4 |
| `assets/06-copy` | Textos reales: testimonios, stats, programas, FAQ, contacto, redes | `.txt` / `.md` / `.docx` |
| `assets/07-marca` | Manual de marca / hex exactos (si lo tienen) | PDF / imagen |

## ✅ Checklist

### Imprescindible para arrancar (mínimo viable)
- [ ] Logo/escudo OTR en **SVG o PNG** (fondo transparente)
- [ ] **Hex exactos** de azul claro y marino (si los tienen; si no, uso los que fijamos: `#4FA9E8` / `#0C2340`)
- [ ] **5–8 fotos** buenas (escenario, trofeos, alumnos, coaches)
- [ ] Contacto: **WhatsApp, email, @otrdebateacademy**
- [ ] **Stats reales** confirmados (campeonatos, clasificaciones, Harvard '26, etc.)

### Para que quede completo
- [ ] Casos de éxito con **foto + resultado + tiempo**
- [ ] **Bios cortas** de coaches
- [ ] Descripción de cada **programa** (PF, LD, Parliamentary, Oratoria, Summer Camp)
- [ ] Respuestas de **FAQ**
- [ ] Tipografías de marca (o confirmamos **Clash Display + Inter**)
- [ ] Video **b-roll** (opcional, para el hero)

## 📐 Specs rápidas
- **Fotos:** cuanta más resolución mejor; incluye horizontales **y** verticales.
- **Logo:** vector (SVG) es lo ideal; si no, PNG a 1000px+ con transparencia.
- **Copy:** en español, con las frases firma en inglés ("Own the Room.").

## ▶️ Siguiente paso
Cuando tengas al menos lo **imprescindible**, escríbeme **"listo"** y yo:
1. Monto el proyecto **Next.js + Tailwind** (+ el orbe 3D del hero).
2. Conecto tus **assets reales**.
3. Lo levanto local → lo ves en **http://localhost:3000**.
