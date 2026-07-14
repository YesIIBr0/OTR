// Config plano de ESLint (flat config; ver https://eslint.org/docs/latest/use/configure/configuration-files).
// Arranque minimo y no bloqueante: reglas recomendadas de @eslint/js + typescript-eslint SIN
// chequeo de tipos (mas rapido para arrancar; se puede subir a "recommended-type-checked" mas
// adelante si se quiere mas rigor). Objetivo del audit: tener alguna regla automatica corriendo
// en CI, ya que hoy "next lint" ni siquiera tiene eslint instalado.
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "prisma/migrations/**",
      "public/**",
      "site/**",
      "**/*.config.*",
      "next-env.d.ts",
      // Prototipo estático pre-Next.js (raíz del repo): superado por app/ (Next.js App
      // Router), no se compila ni se sirve (next.config.mjs reescribe "/" a
      // public/site/index.html). Confirmado "dead"/fuera de alcance en
      // docs/review/analysis-workflow.js ("the root-level legacy *.js/*.css prototype
      // (dead). Do NOT propose work on those").
      "app.js",
      "components.js",
      "data.js",
      "icons.js",
      "screens-community.js",
      "screens-core.js",
      "screens-kit.js",
      "screens-learn.js",
      "screens-profile.js",
      "screens-teacher.js",
      // Documentación/tooling interno (workflows de review en DSL propio: agent/parallel/log),
      // no es código de la app.
      "docs/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // El repo ya usa "@ts-nocheck" en 30 archivos de app/lib/*.ts (los 22 builders
      // scr-*.ts + 8 más: data/components/screens/i18n/text/shell/drills-data/icons) —
      // es un patrón existente y conocido (hallazgo previo del audit de Fase 0), no algo
      // que este lint deba forzar a revertir (quitarlo puede destapar errores de tipos
      // ocultos y romper "tsc --noEmit"). El resto de la regla queda activo: si alguien
      // agrega "@ts-ignore" o "@ts-expect-error" sin descripción, sigue marcándose.
      "@typescript-eslint/ban-ts-comment": ["error", { "ts-nocheck": false }],
      // Los `catch {}` / `catch (e) {}` vacíos del código son intencionales (best-effort:
      // localStorage, reload, fetch a APIs externas degradando con gracia), no bugs
      // escondidos. "allowEmptyCatch" es la opción oficial de la regla para este caso.
      "no-empty": ["error", { allowEmptyCatch: true }],
      // Patrón extendido en el codebase: `cond && fn()` / `cond ? a() : b()` para efectos
      // secundarios (muy común en los builders de pantallas y en los listeners inline).
      // No es código muerto: se permite explícitamente el short-circuit y el ternario.
      "@typescript-eslint/no-unused-expressions": ["error", { allowShortCircuit: true, allowTernary: true }],
    },
  },
  {
    // Los 22 builders app/lib/scr-*.ts son plantillas de HTML con "@ts-nocheck" (no código
    // de negocio tipado): relajamos unused-vars/explicit-any a warning. El resto de reglas
    // recomendadas se mantiene activo también aquí.
    files: ["app/lib/scr-*.ts"],
    rules: {
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    // `any` es sistémico (no un descuido puntual) en estos puntos: el motor SPA
    // (Aula.tsx) lee formas dinámicas que cambian por rol/pantalla; queries.ts (capa
    // Prisma) las produce; db-types.ts (M8 — fundación tipada de DB, fusionada de
    // refactor/audit-m8-typed-db) es DELIBERADAMENTE incremental — su propio header
    // documenta el índice `[key: string]: any` como válvula de escape para lo aún no
    // nombrado, y varios campos anidados usan `any` a propósito para no bloquear el
    // pilotaje mientras se tipa el resto del árbol. Tiparlos de verdad al 100% es un
    // refactor grande, fuera de alcance de este lint mínimo no bloqueante. Las pruebas
    // (tests/**) también tipan sus mocks/harnesses sueltos a propósito. Se dejan en warning
    // (quedan para después, como pide el audit) en vez de forzar un `any` real a "unknown" a
    // ciegas en 250+ sitios.
    files: ["app/components/Aula.tsx", "app/lib/queries.ts", "app/lib/data.ts", "app/lib/db-types.ts", "tests/**"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    // Scripts Node CJS reales (cron del VPS), ejecutados directo con `node scripts/x.js`,
    // fuera del build de Next/TS — necesitan los globals de Node y su `require()` es
    // intencional (no hay bundler/transpile de por medio).
    files: ["scripts/**/*.js"],
    languageOptions: {
      globals: {
        require: "readonly",
        module: "readonly",
        exports: "readonly",
        process: "readonly",
        console: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
);
