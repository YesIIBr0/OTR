/* [ADMIN · AJUSTES] La consola de ajustes de plataforma.
 *
 * Nace de un hueco de fondo: el enlace del grupo de WhatsApp del paso 3 vivía SOLO en una
 * variable de entorno, así que cambiarlo exigía SSH al servidor y un redespliegue. El sitio
 * no se podía administrar sin un desarrollador.
 *
 * Lo que se blinda aquí es lo que puede hacer daño:
 *   ① solo ADMIN — es una pantalla que cambia lo que ve un menor de edad (el enlace);
 *   ② lista blanca de claves — sin ella la tabla se vuelve un basurero sin dueño;
 *   ③ solo http(s) — un `javascript:` acabaría en un href que abre un alumno;
 *   ④ la variable de entorno sigue de RESPALDO — desplegar esto no puede apagar lo que ya
 *     funcionaba en el servidor;
 *   ⑤ el cambio queda auditado: quién y cuándo.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

describe("[ADMIN] ajustes de plataforma", () => {
  const route = () => read("app/api/admin/settings/route.ts");

  it("① la API es solo para ADMIN, en GET y en PATCH", () => {
    const r = route();
    expect((r.match(/requireRole\(user, "ADMIN"\)/g) || []).length).toBe(2);
    expect((r.match(/No autenticado", 401/g) || []).length).toBe(2);
  });

  it("② solo se aceptan claves de la lista blanca", () => {
    const r = route();
    expect(r).toContain("const BY_KEY = new Map");
    expect(r).toMatch(/if \(!def\) return bad\("Ajuste desconocido", 400\)/);
  });

  it("③ un enlace que no sea http(s) se rechaza — nunca llega a un href del alumno", () => {
    const r = route();
    expect(r).toMatch(/kind === "url" && !\/\^https\?:/);
  });

  it("④ la variable de entorno queda de respaldo: desplegar esto no apaga lo que ya funcionaba", () => {
    const r = route();
    expect(r).toContain("process.env[def.env]");
    // Y el paso 3 lo consume por el ajuste, no por el entorno directo.
    const adm = read("app/api/admission/route.ts");
    expect(adm).toContain('settingValue("admission.communityUrl")');
  });

  it("⑤ cada cambio queda auditado con quién y el antes→después", () => {
    const r = route();
    expect(r).toContain('action: "setting.update"');
    expect(r).toMatch(/detail: `\$\{def\.label\}/);
    expect(r).toContain("before?.value");
  });

  it("la pantalla está registrada y es role-scoped a admin", () => {
    const screens = read("app/lib/screens.ts");
    expect(screens).toContain('adminSettings: () => import("./scr-admin-settings")');
    expect(screens).toMatch(/'admin-settings':[^\n]*role:'admin'/);
  });

  it("la pantalla distingue de DÓNDE sale el valor en vigor", () => {
    // Sin esto, el admin no sabe si lo que ve lo puso él o venía del despliegue.
    const scr = read("app/lib/scr-admin-settings.ts");
    expect(scr).toContain("aset.srcDb");
    expect(scr).toContain("aset.srcEnv");
    expect(scr).toContain("aset.srcUnset");
  });

  it("el modelo existe en los DOS schemas y tiene su migración", () => {
    expect(read("prisma/schema.prisma")).toContain("model PlatformSetting");
    expect(read("prisma/schema.postgres.prisma")).toContain("model PlatformSetting");
    expect(read("prisma/migrations/20260820000000_add_platform_setting/migration.sql")).toContain('CREATE TABLE "PlatformSetting"');
  });
});
