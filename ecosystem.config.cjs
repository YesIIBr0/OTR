// ============================================================
//  OTR Academy · PM2 (despliegue directo en VPS, sin Docker)
//  Arranca Next en modo producción. Antes de `pm2 start`:
//    npm ci
//    cp prisma/schema.postgres.prisma prisma/schema.prisma
//    npx prisma generate && npx prisma migrate deploy
//    npm run db:seed       # (solo la primera vez)
//    npm run build
//  Luego:
//    pm2 start ecosystem.config.cjs
//    pm2 save && pm2 startup     # arranque en boot
//  Las variables sensibles viven en .env.production (no en este archivo).
// ============================================================
module.exports = {
  apps: [
    {
      name: "otr",
      // Ejecuta el binario de Next directamente (no via npm) para que PM2
      // gestione la señal del proceso correctamente.
      script: "node_modules/.bin/next",
      args: "start -p 3000",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
        // El resto de variables (DATABASE_URL, AUTH_SECRET, SMTP_URL, etc.)
        // se cargan desde el entorno del shell / .env.production. Cárgalas con:
        //   set -a && . ./.env.production && set +a && pm2 start ecosystem.config.cjs
        // o define un archivo de entorno en el servicio del sistema.
      },
      out_file: "./logs/otr-out.log",
      error_file: "./logs/otr-error.log",
      merge_logs: true,
      time: true,
    },
  ],
};
