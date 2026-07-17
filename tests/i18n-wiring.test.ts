import { describe, it, expect, beforeAll } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/* [i18n · F4.1] Cableado de i18n POR PANTALLA.
   Antes: i18n.ts importaba los 23 diccionarios estáticamente y este test listaba SCREEN_DICTS
   a mano → una pantalla nueva escapaba del enforcement. Ahora:
     · Cada scr-*.ts registra SU diccionario (registerDict) al cargar su chunk; i18n.ts solo
       deja estático el CHROME (prefijos err. y apierr., en i18n-keys/chrome.ts).
     · Este test DESCUBRE los diccionarios dinámicamente del directorio i18n-keys/ (readdirSync +
       import.meta.glob) y carga TODOS los builders para disparar sus registros — así una pantalla
       nueva queda auto-inscrita en la simetría, la fusión y el chequeo de registro.
   Mantiene (sin debilitar): simetría ES↔EN por diccionario, fusión al DICT central, t() nunca
   devuelve la clave cruda, no-colisiones y no-pisar el chrome. Añade: cada builder que importa un
   diccionario lo registra, y cada diccionario de pantalla está registrado por algún builder. */

// Stub de `window` ANTES de cargar builders (algunos leen window.* en helpers a nivel de módulo;
// mismo patrón que screens.test.ts). Los builders se cargan en el beforeAll de abajo.
/* eslint-disable @typescript-eslint/no-explicit-any */
(globalThis as any).window = (globalThis as any).window || {};
const win: any = (globalThis as any).window;
win.api = async () => ({});
win.go = () => {};
win.toast = () => {};
win.print = () => {};
win.otrFormModal = () => {};
/* eslint-enable @typescript-eslint/no-explicit-any */

import { t, I18N } from "../app/lib/i18n";

type Dict = { es: Record<string, string>; en: Record<string, string> };

// Augmenta ImportMeta con la macro `glob` de Vite (vitest la provee en runtime; así tsc la
// acepta sin depender de resolver los tipos de "vite/client"). Vite sigue viendo el literal
// `import.meta.glob(` y lo transforma en build/transform.
declare global {
  interface ImportMeta {
    glob(pattern: string, options: { eager: true }): Record<string, unknown>;
    glob(pattern: string, options?: { eager?: boolean }): Record<string, () => Promise<unknown>>;
  }
}

// --- Descubrimiento DINÁMICO de diccionarios (i18n-keys/*.ts) ---------------------------------
const dictModules = import.meta.glob("../app/lib/i18n-keys/*.ts", { eager: true }) as unknown as Record<
  string,
  { dict: Dict }
>;
const baseName = (p: string) => p.replace(/^.*\//, "").replace(/\.ts$/, "");
const ALL_DICTS: Record<string, Dict> = {};
for (const [p, m] of Object.entries(dictModules)) ALL_DICTS[baseName(p)] = m.dict;

// chrome.ts es el ÚNICO diccionario estático (err.*/apierr.* del shell, registrado por i18n.ts).
// El resto son de pantalla: los registra su scr-*.ts.
const CHROME_DICT_NAMES = new Set(["chrome"]);
const SCREEN_DICTS: Record<string, Dict> = Object.fromEntries(
  Object.entries(ALL_DICTS).filter(([n]) => !CHROME_DICT_NAMES.has(n)),
);

// Prefijos del chrome que NINGÚN diccionario de pantalla debe pisar: los inline de i18n.ts
// (group/nav/top/role/soon/aula) + los de chrome.ts (err/apierr).
const CHROME_PREFIXES = ["group.", "nav.", "top.", "role.", "soon.", "aula.", "err.", "apierr."];

// --- Fuentes de los builders (para verificar el cableado de registro sin ejecutarlos) ----------
const LIB_DIR = join(process.cwd(), "app/lib");
const SCR_FILES = readdirSync(LIB_DIR).filter((f) => /^scr-.*\.ts$/.test(f));
const SCR_SRC: Record<string, string> = Object.fromEntries(
  SCR_FILES.map((f) => [f, readFileSync(join(LIB_DIR, f), "utf8")]),
);

// --- Carga TODOS los builders → dispara sus registerDict() de top-level ------------------------
const builderLoaders = import.meta.glob("../app/lib/scr-*.ts");
beforeAll(async () => {
  for (const load of Object.values(builderLoaders)) await load();
});

describe("i18n per-screen wiring (F4.1 · descubrimiento dinámico)", () => {
  it("descubrió los diccionarios del directorio i18n-keys (incluye el chrome)", () => {
    expect(Object.keys(ALL_DICTS).length).toBeGreaterThanOrEqual(20);
    expect(ALL_DICTS.chrome, "chrome.ts existe y es el diccionario estático del shell").toBeTruthy();
    expect(Object.keys(SCREEN_DICTS).length).toBeGreaterThanOrEqual(20);
  });

  it("cada diccionario es simétrico ES↔EN (sin claves sueltas)", () => {
    for (const [name, d] of Object.entries(ALL_DICTS)) {
      const es = Object.keys(d.es).sort();
      const en = Object.keys(d.en).sort();
      expect(en, `${name}: simetría ES↔EN`).toEqual(es);
    }
  });

  it("tras cargar los builders, cada diccionario queda fusionado en el DICT (no quedan crudas)", () => {
    for (const [name, d] of Object.entries(ALL_DICTS)) {
      const k = Object.keys(d.es)[0];
      expect(k, `${name} tiene claves`).toBeTruthy();
      expect(I18N.es[k], `${name}: ${k} en I18N.es`).toBe(d.es[k]);
      expect(I18N.en[k], `${name}: ${k} en I18N.en`).toBe(d.en[k]);
      expect(t(k, "es"), `${name}: t(${k}) resuelve, no cruda`).not.toBe(k);
    }
  });

  it("renderiza una cadena de 'learn' en INGLÉS con lang=en (resolución real de t())", () => {
    const learn = SCREEN_DICTS.learn;
    expect(learn, "existe el diccionario learn").toBeTruthy();
    const entry = Object.keys(learn.es).find((k) => learn.en[k] && learn.en[k] !== learn.es[k]);
    expect(entry, "learn tiene al menos una clave con EN distinto del ES").toBeTruthy();
    expect(t(entry!, "en")).toBe(learn.en[entry!]);
    expect(t(entry!, "en")).not.toBe(learn.es[entry!]);
    expect(t(entry!, "en")).not.toBe(entry);
  });

  it("conserva las claves de nav/chrome inline (no las pisa ningún diccionario)", () => {
    expect(t("nav.dashboard", "es")).toBe("Inicio");
    expect(t("nav.dashboard", "en")).toBe("Dashboard");
    expect(t("group.main", "en")).toBe("Main");
    // err.* / apierr.* ahora viven en chrome.ts pero siguen resolviendo (estáticos, chunk inicial).
    expect(t("err.network", "es")).not.toBe("err.network");
    expect(t("apierr.auth", "en")).not.toBe("apierr.auth");
  });

  it("NO hay colisiones de clave entre diccionarios ni con el chrome inline", () => {
    const seen: Record<string, string> = {};
    const collisions: string[] = [];
    const chromeClashes: string[] = [];
    for (const [name, d] of Object.entries(SCREEN_DICTS)) {
      for (const k of Object.keys(d.es)) {
        if (CHROME_PREFIXES.some((p) => k.startsWith(p))) chromeClashes.push(`${k} (${name})`);
        if (seen[k]) collisions.push(`${k}: ${seen[k]} vs ${name}`);
        else seen[k] = name;
      }
    }
    expect(chromeClashes, "ninguna clave de pantalla usa un prefijo del chrome").toEqual([]);
    expect(collisions, "ninguna clave aparece en dos diccionarios de pantalla").toEqual([]);
  });

  it("t() mantiene el fallback: clave inexistente devuelve la propia clave (último recurso)", () => {
    expect(t("__no_existe__.jamas", "en")).toBe("__no_existe__.jamas");
    expect(t("__no_existe__.jamas", "es")).toBe("__no_existe__.jamas");
  });

  // --- Cableado del registro (lo que reemplaza al import estático de i18n.ts) -------------------
  it("cada builder que importa un diccionario de i18n-keys también lo registra con registerDict", () => {
    const dangling: string[] = [];
    for (const [f, src] of Object.entries(SCR_SRC)) {
      const aliases = [
        ...src.matchAll(/import\s*\{\s*dict as (d_\w+)\s*\}\s*from\s*["']\.\/i18n-keys\/[\w-]+["']/g),
      ].map((m) => m[1]);
      for (const alias of aliases) {
        if (!new RegExp(`registerDict\\(\\s*${alias}\\s*\\)`).test(src)) dangling.push(`${f}: ${alias}`);
      }
    }
    expect(dangling, "todo import de diccionario en un builder va seguido de su registerDict").toEqual([]);
  });

  it("cada diccionario de pantalla está registrado por al menos un builder", () => {
    const orphans: string[] = [];
    for (const name of Object.keys(SCREEN_DICTS)) {
      const registered = Object.values(SCR_SRC).some(
        (src) =>
          new RegExp(`from\\s*["']\\./i18n-keys/${name}["']`).test(src) &&
          new RegExp(`registerDict\\(\\s*d_${name}\\s*\\)`).test(src),
      );
      if (!registered) orphans.push(name);
    }
    expect(orphans, "ningún diccionario de pantalla queda sin builder que lo registre").toEqual([]);
  });
});
