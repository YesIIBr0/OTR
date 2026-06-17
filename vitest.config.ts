import { defineConfig } from "vitest/config";

// [BE-04] Suite de tests del MVP. Unidades puras de alto valor (escaping contract, búsqueda
// acento-insensible, tiers de Glicko-2). Corre con `npm test`. Node env (sin DOM).
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
