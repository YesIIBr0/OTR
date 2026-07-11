// [COPPA · retención] Purga de ActivityEvent con más de RETENTION_DAYS días (365 por defecto).
// El "spine" de actividad es telemetría de producto — los agregados que importan (XP, rating,
// progreso, certificados) viven en User/Enrollment/etc. y NO se tocan. Menores incluidos:
// sus eventos no se acumulan sin límite.
// Uso (cron semanal del VPS):
//   docker compose exec -T web node scripts/purge-activity.js
const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();
const RETENTION_DAYS = Number(process.env.ACTIVITY_RETENTION_DAYS || 365);
(async () => {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 86400000);
  const res = await db.activityEvent.deleteMany({ where: { createdAt: { lt: cutoff } } });
  console.log(`[purge-activity] ${new Date().toISOString()} — borrados ${res.count} eventos anteriores a ${cutoff.toISOString().slice(0, 10)} (retención ${RETENTION_DAYS}d)`);
  await db.$disconnect();
})().catch((e) => { console.error("[purge-activity] ERROR", e.message); process.exit(1); });
