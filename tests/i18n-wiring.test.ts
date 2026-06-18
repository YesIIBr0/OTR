import { describe, it, expect } from "vitest";
import { t, I18N } from "../app/lib/i18n";

// Todos los diccionarios por pantalla (deben quedar fusionados en el DICT central por i18n.ts).
import { dict as admin } from "../app/lib/i18n-keys/admin";
import { dict as arsenal } from "../app/lib/i18n-keys/arsenal";
import { dict as au } from "../app/lib/i18n-keys/au";
import { dict as cert } from "../app/lib/i18n-keys/cert";
import { dict as comm } from "../app/lib/i18n-keys/comm";
import { dict as core } from "../app/lib/i18n-keys/core";
import { dict as cw } from "../app/lib/i18n-keys/cw";
import { dict as debate } from "../app/lib/i18n-keys/debate";
import { dict as events } from "../app/lib/i18n-keys/events";
import { dict as extra } from "../app/lib/i18n-keys/extra";
import { dict as hub } from "../app/lib/i18n-keys/hub";
import { dict as learn } from "../app/lib/i18n-keys/learn";
import { dict as lifetime } from "../app/lib/i18n-keys/lifetime";
import { dict as mb } from "../app/lib/i18n-keys/mb";
import { dict as mkt } from "../app/lib/i18n-keys/mkt";
import { dict as parent } from "../app/lib/i18n-keys/parent";
import { dict as placement } from "../app/lib/i18n-keys/placement";
import { dict as profile } from "../app/lib/i18n-keys/profile";
import { dict as room } from "../app/lib/i18n-keys/room";
import { dict as settings } from "../app/lib/i18n-keys/settings";
import { dict as teacher } from "../app/lib/i18n-keys/teacher";

const SCREEN_DICTS: Record<string, any> = {
  admin, arsenal, au, cert, comm, core, cw, debate, events, extra, hub,
  learn, lifetime, mb, mkt, parent, placement, profile, room, settings, teacher,
};

// Prefijos del chrome (nav/sidebar/topbar) definidos inline en i18n.ts — no deben ser pisados.
const CHROME_PREFIXES = ["group.", "nav.", "top.", "role.", "soon."];

describe("i18n per-screen wiring (regresión del bug 'clave cruda')", () => {
  it("fusiona las claves de cada pantalla en el DICT central (no quedan crudas)", () => {
    for (const [name, d] of Object.entries(SCREEN_DICTS)) {
      const k = Object.keys(d.es)[0];
      expect(k, `${name} tiene claves`).toBeTruthy();
      // La clave existe ya fusionada en I18N (es + en) y t() la resuelve, no devuelve la clave.
      expect(I18N.es[k], `${name}: ${k} en I18N.es`).toBe(d.es[k]);
      expect(I18N.en[k], `${name}: ${k} en I18N.en`).toBe(d.en[k]);
      expect(t(k, "es"), `${name}: t(${k}) resuelve, no cruda`).not.toBe(k);
    }
  });

  it("renderiza una cadena de 'learn' en INGLÉS con lang=en", () => {
    // Elegimos una clave cuyo EN difiere del ES, para probar que el inglés SÍ aplica.
    const entry = Object.keys(learn.es).find((k) => learn.en[k] && learn.en[k] !== learn.es[k]);
    expect(entry, "learn tiene al menos una clave con EN distinto del ES").toBeTruthy();
    expect(t(entry!, "en")).toBe(learn.en[entry!]);
    expect(t(entry!, "en")).not.toBe(learn.es[entry!]);
    expect(t(entry!, "en")).not.toBe(entry); // no es la clave cruda
  });

  it("conserva las claves de nav/chrome (no las pisa ningún diccionario de pantalla)", () => {
    expect(t("nav.dashboard", "es")).toBe("Inicio");
    expect(t("nav.dashboard", "en")).toBe("Dashboard");
    expect(t("group.main", "en")).toBe("Main");
  });

  it("NO hay colisiones de clave entre pantallas ni con el chrome", () => {
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
    expect(chromeClashes, "ninguna clave de pantalla usa prefijo de chrome").toEqual([]);
    expect(collisions, "ninguna clave aparece en dos pantallas").toEqual([]);
  });

  it("t() mantiene el fallback: clave inexistente devuelve la propia clave (último recurso)", () => {
    expect(t("__no_existe__.jamas", "en")).toBe("__no_existe__.jamas");
    expect(t("__no_existe__.jamas", "es")).toBe("__no_existe__.jamas");
  });

  it("cada diccionario de pantalla es simétrico ES↔EN (sin claves sueltas)", () => {
    for (const [name, d] of Object.entries(SCREEN_DICTS)) {
      const es = Object.keys(d.es).sort();
      const en = Object.keys(d.en).sort();
      expect(en, `${name}: simetría ES↔EN`).toEqual(es);
    }
  });
});
