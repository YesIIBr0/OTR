// [CIERRE · GOAL 2026-08] Los defectos NO-XSS de la última revisión de rama (los XSS viven
// en tests/cierre-xss.test.ts). Tres familias, cada una probada donde de verdad vive:
//
//   · copy/marca e i18n → se interroga el diccionario REAL con t(clave, idioma);
//   · CSS (contraste, foco, movimiento, guionado) → se lee la hoja, igual que ui-goal-f3;
//   · handlers de cliente (recarga tras borrado GDPR, consumo de /api/membership,
//     interpolación de nombres, skip-link) → viven dentro de mount(root) y necesitan DOM,
//     que esta suite no tiene (environment:"node"): se blinda el contrato en el fuente,
//     que es exactamente lo que se rompió y lo que un refactor podría volver a romper.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { t } from "../app/lib/i18n";
import { dict as d_comm } from "../app/lib/i18n-keys/comm";
import { dict as d_profile } from "../app/lib/i18n-keys/profile";
import { dict as d_parent } from "../app/lib/i18n-keys/parent";
import { registerDict } from "../app/lib/i18n";

registerDict(d_comm);
registerDict(d_profile);
registerDict(d_parent);

const read = (rel: string) => readFileSync(join(process.cwd(), rel), "utf8");
const screens = () => read("app/styles/screens.css");
const app = () => read("app/styles/app.css");

/* ================= O8 · copy y marca ================= */
describe("O8 · el copy habla como la marca", () => {
  it("«toca», no «pulsa» (español RD) en el vacío de Mensajes", () => {
    const es = t("comm.msg.emptyBody", "es");
    expect(es).toContain("toca «Enviar mensaje»");
    expect(es).not.toContain("pulsa");
  });

  it("«tu hijo/a», consistente con las otras claves del portal de familia", () => {
    expect(t("profile.noChildrenBody", "es")).toContain("tu hijo/a");
    expect(t("profile.noChildrenBody", "es")).not.toMatch(/tu hijo(?!\/a)/);
  });

  it("el umbral de confianza total usa «$», la ÚNICA moneda del producto (no «US$»)", () => {
    for (const lang of ["es", "en"]) {
      const s = t("parent.confirmFullConsent", lang);
      expect(s).toContain("$9,999");
      expect(s).not.toContain("US$");
    }
  });

  it("los mensajes sembrados de Diego ya no llevan emoji", () => {
    const seed = read("prisma/seed.ts");
    expect(seed).not.toContain("Gracias coach 🙌");
    expect(seed).toContain('lastLabel: "Gracias coach"');
    expect(seed).toContain('body: "Gracias coach"');
  });
});

/* ================= C3 · contraste sobre card negra ================= */
describe("C3 · el texto secundario de la card NEGRA pasa AA", () => {
  it("--ink-400 sigue siendo el gris de superficie CLARA (no se toca el token)", () => {
    expect(read("app/styles/tokens.css")).toContain("--ink-400:#6B6B6B");
  });

  it(".card--dark sube esos seis textos a --n-400 (#8C8C8C = 5,33:1 sobre #171717)", () => {
    const css = screens();
    const bloque = css.slice(css.indexOf("A11Y · CIERRE GOAL 2026-08"));
    for (const sel of [
      ".card--dark .ring .ring-cap",
      ".card--dark .form-d",
      ".card--dark .lbrow .lb-r",
      ".card--dark .lbrow .lb-t",
      ".card--dark.dash-lb .dlb-meta",
      ".card--dark.dash-lb .lb-pos",
    ]) {
      expect(bloque, `falta el override de ${sel}`).toContain(sel);
    }
    expect(bloque).toMatch(/\.card--dark\.dash-lb \.lb-pos\{color:var\(--n-400\)\}/);
    expect(read("app/styles/tokens.css")).toContain("--n-400:#8C8C8C");
  });

  it("el override va DESPUÉS de las reglas que corrige (gana por orden de origen)", () => {
    const css = screens();
    expect(css.indexOf(".card--dark .ring .ring-cap")).toBeGreaterThan(css.indexOf(".ring .ring-cap{"));
    expect(css.indexOf(".card--dark .form-d")).toBeGreaterThan(css.indexOf(".form-d{"));
  });
});

/* ================= O2 · el punto actual ≠ el punto con foco ================= */
describe("O2 · anillos de foco que no se pisan", () => {
  it(".q-dot.cur ya no usa el anillo de foco EN REPOSO", () => {
    const regla = screens().match(/\.q-dot\.cur\{[^}]*\}/);
    expect(regla).not.toBeNull();
    expect(regla![0]).not.toContain("var(--ring)");
    // Y conserva marca propia de "actual" (borde + tinte naranja).
    expect(regla![0]).toContain("var(--action)");
    expect(regla![0]).toContain("var(--action-soft)");
    // Sin `box-shadow:none`: si lo declarara, se comería el anillo de :focus-visible.
    expect(regla![0]).not.toContain("box-shadow");
  });

  it(".lst-row y .lst-offer dejan UN solo anillo (el de la casa, no outline + ring)", () => {
    const css = screens();
    for (const sel of [".lst-row:focus-visible", ".lst-offer:focus-visible"]) {
      const regla = css.match(new RegExp(`\\${sel.replace(":", ":")}\\{[^}]*\\}`));
      expect(regla, `falta ${sel}`).not.toBeNull();
      expect(regla![0]).toContain("box-shadow:var(--ring)");
      expect(regla![0]).not.toContain("outline:2px");
    }
  });
});

/* ================= O3 · K-01 en cards/tiles clicables ================= */
describe("O3 · las tarjetas con role=button vuelven a mostrar el foco", () => {
  it("la hoja restaura el anillo combinándolo con la sombra propia de .tile/.card", () => {
    const css = screens();
    expect(css).toContain(".tile:focus-visible{box-shadow:var(--sh-1),var(--ring)}");
    expect(css).toContain(".tile.click:hover:focus-visible{box-shadow:var(--sh-2),var(--ring)}");
    expect(css).toContain(".card[role]:focus-visible{box-shadow:var(--sh-1),var(--ring)}");
  });

  it("las tres superficies del hallazgo siguen siendo role=button + tabindex (o el fix no aplica)", () => {
    expect(read("app/lib/scr-marketplace.ts")).toContain('class="tile click fade-up" data-coach=');
    expect(read("app/lib/scr-debate.ts")).toContain('role="button" tabindex="0"');
    expect(read("app/lib/scr-profile.ts")).toContain('class="card card-pad lift" role="button" tabindex="0"');
  });
});

/* ================= O4 · prefers-reduced-motion ================= */
describe("O4 · la preferencia de menos movimiento alcanza a TODOS los botones", () => {
  it("el bloque apaga el scale(.97) en la raíz (.btn:active) y el hover del tile", () => {
    const css = app();
    const bloque = css.slice(css.indexOf("6) Respeto a prefers-reduced-motion"));
    const cierre = bloque.indexOf("\n}");
    const dentro = bloque.slice(0, cierre);
    expect(dentro).toContain(".btn:active{transform:none}");
    expect(dentro).toContain(".tile.click:hover{transform:none}");
  });

  it("la regla que causa el movimiento sigue existiendo (si no, el test no prueba nada)", () => {
    expect(app()).toContain(".btn:active{transform:scale(.97)}");
    expect(app()).toContain(".tile.click:hover{box-shadow:var(--sh-2);transform:translateY(-2px)");
  });
});

/* ================= O10 · guionado en Safari/iOS ================= */
describe("O10 · el nombre de la insignia también parte en iPhone", () => {
  it(".badge-tile .bt-n lleva -webkit-hyphens ANTES del estándar", () => {
    // Hay DOS reglas .badge-tile .bt-n (la del kit y la del fix F3); la del guionado es la
    // que declara hyphens, no la del line-clamp.
    const regla = (screens().match(/\.badge-tile \.bt-n\{[^}]*\}/g) || []).find((r) => r.includes("hyphens"));
    expect(regla, "no hay ninguna regla .badge-tile .bt-n con hyphens").toBeTruthy();
    expect(regla!).toContain("-webkit-hyphens:auto");
    expect(regla!.indexOf("-webkit-hyphens")).toBeLessThan(regla!.indexOf(";hyphens:auto"));
  });
});

/* ================= Handlers de cliente ================= */
describe("O1 · el borrado GDPR exitoso recarga en vez de caer al catch", () => {
  it("scr-admin-users llama a load(), la función que EXISTE (no loadUsers)", () => {
    const src = read("app/lib/scr-admin-users.ts");
    // Sin comentarios: la única mención que queda a loadUsers es el porqué del arreglo.
    const codigo = src.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(codigo).not.toContain("loadUsers(");
    expect(src).toContain("load(); // recarga: el usuario aparece anonimizado y suspendido");
    // La función local se sigue llamando `load` (si se renombrara, este test avisa).
    expect(src).toContain("const load = (opts) => {");
  });
});

describe("O6 · Membresía se refresca sin F5", () => {
  it("scr-lifetime consume el cuerpo PLANO que devuelve /api/membership", () => {
    const src = read("app/lib/scr-lifetime.ts");
    expect(src).toContain('if (resp && typeof resp.tier === "string") DB.membership.tier = resp.tier;');
    expect(src).toContain('if (resp && "sinceLabel" in resp) DB.membership.sinceLabel = resp.sinceLabel;');
    const codigo = src.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(codigo).not.toContain("resp.membership");
  });

  it("y la ruta sigue respondiendo plano (el contrato que el cliente asume)", () => {
    const ruta = read("app/api/membership/route.ts");
    expect(ruta).toContain("return ok({ tier, sinceLabel:");
    expect(ruta).not.toContain("ok({ membership:");
  });
});

describe("O9 · los nombres se interpolan con split/join, no con replace", () => {
  it("los tres call-sites del barrido usan split/join", () => {
    expect(read("app/lib/scr-community.ts")).toContain('.split("{author}").join(t.author)');
    expect(read("app/lib/scr-teacher.ts")).toContain('.split("{name}").join(s.n)');
    expect(read("app/lib/scr-mybookings.ts")).toContain('.split("{name}").join(coachName)');
  });

  it("y ninguno de ellos vuelve a la forma con replace", () => {
    expect(read("app/lib/scr-community.ts")).not.toContain('.replace("{author}"');
    expect(read("app/lib/scr-teacher.ts")).not.toContain('.replace("{name}", s.n)');
    expect(read("app/lib/scr-mybookings.ts")).not.toContain('.replace("{name}", coachName)');
  });
});

describe("O11 · la fecha de entrega respeta el idioma", () => {
  it("fmtDue usa el formatter compartido y ya no fija el locale 'es'", () => {
    const src = read("app/lib/scr-extra.ts");
    expect(src).toContain("return fmtDayMonth(iso, getLang());");
    expect(src).not.toContain('toLocaleDateString("es"');
    expect(src).toContain('import { t, registerDict, getLang, fmtDayMonth } from "./i18n";');
  });
});

describe("O12 · el skip-link no se lleva por delante el deep-link", () => {
  it("Aula intercepta el clic, enfoca #content y NO reescribe el hash", () => {
    const src = read("app/components/Aula.tsx");
    expect(src).toContain('const skip = t.closest("a.skip-link") as HTMLElement | null;');
    expect(src).toContain('const main = document.getElementById("content");');
    expect(src).toContain("if (main) main.focus();");
  });

  it("el destino sigue siendo enfocable (tabindex=-1) — si no, el salto no llegaría", () => {
    expect(read("app/lib/shell.ts")).toContain('id="content" tabindex="-1"');
    expect(read("app/lib/shell.ts")).toContain('<a href="#content" class="skip-link">');
  });
});
