import { defineConfig } from "vitest/config";

// [BE-04] Suite de tests del MVP. Unidades puras de alto valor (escaping contract, búsqueda
// acento-insensible, tiers de Glicko-2). Corre con `npm test`. Node env (sin DOM).
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // [BE-TEST] Los tests de rutas importan app/lib/auth-crypto, que lanza al importar si
    // AUTH_SECRET no está (>=16 chars). Fijamos un secreto de prueba (nunca es el real) +
    // DATABASE_URL dummy para que prisma-client no proteste al cargar. La DB va mockeada.
    env: {
      AUTH_SECRET: "test-only-secret-do-not-use-in-prod-1234",
      DATABASE_URL: "file:./dev.db",
    },
  },
});
