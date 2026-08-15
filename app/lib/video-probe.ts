// OTR LMS · lectura BEST-EFFORT de la duración declarada por un contenedor de vídeo.
//
// Por qué existe: el vídeo del paso 4 de admisión (DPP) debe durar ~30 s y el servidor NO
// puede fiarse del cliente. El tamaño NO acota la duración: 16 MB a 200 kbps son ~10 minutos,
// así que un tope de bytes deja pasar una película larga y mal comprimida. Esto lee la
// duración que el PROPIO contenedor declara en su cabecera — sin decodificar ni ejecutar nada,
// sin ffmpeg y sin dependencias.
//
// CONTRATO (lo importante, y lo que NO promete):
//   · Devuelve segundos SOLO si el contenedor los declara y se pudieron leer con certeza.
//   · Devuelve null cuando no hay dato o el parseo falla → el llamador NO debe rechazar.
//     Es un filtro de "rechaza lo que se sabe demasiado largo", no una garantía de duración.
//   · NUNCA lanza: cualquier byte raro o truncado termina en null.
//
// Cobertura MEDIDA con ficheros reales (no supuesta):
//   · MP4/MOV (isom, qt) → sí: `moov.mvhd` lleva timescale + duration siempre.
//   · WebM/Matroska cerrado por ffmpeg/export → sí: `Segment.Info.Duration` (leído 30,008 s
//     de un fichero de 30 s).
//   · WebM grabado por MediaRecorder de Chrome → SÍ, al contrario de lo que suele decirse:
//     una grabación de 30 s subida de verdad desde el navegador devolvió 30,48 s, idéntico a
//     lo que reporta ffprobe. Chrome deja escrita la Duration al cerrar el fichero.
// Aun así el contrato se queda en "best effort": un navegador puede emitir un WebM en
// streaming sin Duration, y entonces esto devuelve null y la subida NO se rechaza. Se acota
// por tamaño y por el corte automático del grabador — no se promete un límite que no se mide.

/** Segundos declarados por el contenedor, o null si no se pueden leer con certeza. */
export function probeVideoDurationSec(buf: Buffer): number | null {
  try {
    const mp4 = probeMp4(buf);
    if (mp4 !== null) return mp4;
    return probeWebm(buf);
  } catch {
    return null; // contenedor truncado/corrupto → sin dato (nunca revienta la subida)
  }
}

/* ------------------------------- MP4 / MOV (ISO-BMFF) -------------------------------
   Árbol de "boxes": [size:uint32][type:4 chars][payload]. size===1 → el tamaño real es un
   uint64 que va justo detrás del type; size===0 → el box llega hasta el final del fichero.
   Se busca `moov` y, dentro, `mvhd`, que declara timescale (unidades/seg) y duration. */
function probeMp4(buf: Buffer): number | null {
  const moov = findBox(buf, 0, buf.length, "moov");
  if (!moov) return null;
  const mvhd = findBox(buf, moov.start, moov.end, "mvhd");
  if (!mvhd) return null;

  let p = mvhd.start;
  if (p + 4 > mvhd.end) return null;
  const version = buf[p];
  p += 4; // version(1) + flags(3)

  let timescale: number;
  let duration: number;
  if (version === 1) {
    // creation(8) + modification(8) + timescale(4) + duration(8)
    if (p + 28 > mvhd.end) return null;
    timescale = buf.readUInt32BE(p + 16);
    // La duración de 64 bits se lee como Number: exacta hasta 2^53, de sobra para vídeo.
    duration = Number(buf.readBigUInt64BE(p + 20));
  } else {
    // creation(4) + modification(4) + timescale(4) + duration(4)
    if (p + 16 > mvhd.end) return null;
    timescale = buf.readUInt32BE(p + 8);
    duration = buf.readUInt32BE(p + 12);
  }

  if (!timescale || !Number.isFinite(duration)) return null;
  // 0xFFFFFFFF en duration = "desconocida" (fragmentado/streaming) → sin dato.
  if (version === 0 && duration === 0xffffffff) return null;
  const secs = duration / timescale;
  return Number.isFinite(secs) && secs >= 0 ? secs : null;
}

type Box = { start: number; end: number };

/** Busca un box por tipo entre [from,to) recorriendo hermanos; `moov` se busca en la raíz. */
function findBox(buf: Buffer, from: number, to: number, type: string): Box | null {
  let p = from;
  while (p + 8 <= to) {
    const size32 = buf.readUInt32BE(p);
    const boxType = buf.toString("latin1", p + 4, p + 8);
    let header = 8;
    let size = size32;
    if (size32 === 1) {
      if (p + 16 > to) return null;
      size = Number(buf.readBigUInt64BE(p + 8));
      header = 16;
    } else if (size32 === 0) {
      size = to - p; // hasta el final
    }
    if (size < header || p + size > to) return null; // tamaño imposible → contenedor roto
    if (boxType === type) return { start: p + header, end: p + size };
    p += size;
  }
  return null;
}

/* ------------------------------- WebM / Matroska (EBML) -------------------------------
   Árbol de elementos [id][size][data]. El id se guarda TAL CUAL (con sus bits marcadores,
   p. ej. 0x4489 = Duration). El size es un vint: el primer bit a 1 marca la longitud y hay
   que limpiarlo. Ruta buscada: Segment(0x18538067) → Info(0x1549A966) →
   TimecodeScale(0x2AD7B1, ns, default 1_000_000) + Duration(0x4489, float en "ticks"). */
const ID_SEGMENT = 0x18538067;
const ID_INFO = 0x1549a966;
const ID_TIMECODE_SCALE = 0x2ad7b1;
const ID_DURATION = 0x4489;

function probeWebm(buf: Buffer): number | null {
  // Firma EBML; si no está, no es Matroska y no hay nada que leer.
  if (buf.length < 4 || buf.readUInt32BE(0) !== 0x1a45dfa3) return null;

  const seg = findEbml(buf, 0, buf.length, ID_SEGMENT);
  if (!seg) return null;
  const info = findEbml(buf, seg.start, seg.end, ID_INFO);
  if (!info) return null;

  let scaleNs = 1_000_000; // default del spec
  let ticks: number | null = null;

  let p = info.start;
  while (p < info.end) {
    const el = readEbmlElement(buf, p, info.end);
    if (!el) break;
    if (el.id === ID_TIMECODE_SCALE) {
      const v = readUInt(buf, el.start, el.end);
      if (v !== null && v > 0) scaleNs = v;
    } else if (el.id === ID_DURATION) {
      const len = el.end - el.start;
      if (len === 4) ticks = buf.readFloatBE(el.start);
      else if (len === 8) ticks = buf.readDoubleBE(el.start);
    }
    p = el.end;
  }

  if (ticks === null || !Number.isFinite(ticks) || ticks < 0) return null;
  const secs = (ticks * scaleNs) / 1e9;
  return Number.isFinite(secs) && secs >= 0 ? secs : null;
}

type Ebml = { id: number; start: number; end: number };

/** Recorre hermanos en [from,to) hasta encontrar el id pedido. */
function findEbml(buf: Buffer, from: number, to: number, id: number): Ebml | null {
  let p = from;
  while (p < to) {
    const el = readEbmlElement(buf, p, to);
    if (!el) return null;
    if (el.id === id) return el;
    p = el.end;
  }
  return null;
}

/** Lee [id][size] en `p`. Tamaño desconocido (todo unos) → el elemento llega hasta `to`. */
function readEbmlElement(buf: Buffer, p: number, to: number): Ebml | null {
  if (p >= to) return null;
  const idLen = vintLen(buf[p]);
  if (idLen === 0 || p + idLen > to || idLen > 4) return null;
  let id = 0;
  for (let i = 0; i < idLen; i++) id = id * 256 + buf[p + i]; // el id conserva los marcadores
  let q = p + idLen;

  if (q >= to) return null;
  const sizeLen = vintLen(buf[q]);
  if (sizeLen === 0 || q + sizeLen > to || sizeLen > 8) return null;
  let size = buf[q] & (0xff >> sizeLen); // limpia el bit marcador
  let allOnes = size === (0xff >> sizeLen);
  for (let i = 1; i < sizeLen; i++) {
    const b = buf[q + i];
    if (b !== 0xff) allOnes = false;
    size = size * 256 + b;
  }
  q += sizeLen;

  // Tamaño desconocido (el Segment de MediaRecorder en vivo): se asume "hasta el final".
  const end = allOnes ? to : q + size;
  if (end > to || end < q) return null;
  return { id, start: q, end };
}

/** Longitud de un vint por sus ceros a la izquierda (0 si el byte es 0x00 → inválido). */
function vintLen(b: number): number {
  if (b === undefined) return 0;
  for (let i = 0; i < 8; i++) if (b & (0x80 >> i)) return i + 1;
  return 0;
}

/** Entero big-endian de longitud variable (los uint de EBML). */
function readUInt(buf: Buffer, start: number, end: number): number | null {
  const len = end - start;
  if (len <= 0 || len > 8) return null;
  let v = 0;
  for (let i = 0; i < len; i++) v = v * 256 + buf[start + i];
  return Number.isFinite(v) ? v : null;
}
