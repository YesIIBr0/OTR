// OTR Hub · Admin — export CSV (F6.4). GET ?entity=users|enrollments|bookings, solo ADMIN.
// Descarga los datos operativos como CSV para Excel/Sheets (contabilidad, seguimiento,
// respaldo manual) — antes no existía NINGÚN export en la app.
//
// CONTRATO DE ESCAPE (distinto al de HTML, a propósito): los datos de usuario van CRUDOS
// al CSV — esc() de HTML aquí produciría `&amp;` en Excel. La protección correcta para CSV es:
//   1. Quoting RFC 4180: toda celda con coma/comilla/salto de línea va entre comillas, con
//      las comillas internas dobladas.
//   2. Defensa contra CSV/formula injection: una celda que empiece con = + - @ TAB o CR se
//      prefija con comilla simple — si no, un usuario llamado "=HYPERLINK(...)" ejecutaría
//      una fórmula en el Excel del admin.
// BOM UTF-8 al inicio para que Excel detecte la codificación (tildes/ñ correctas).
import { db } from "../../../lib/db";
import { getSessionUser } from "../../../lib/auth";
import { bad } from "../../../lib/api";
import { requireRole } from "../../../lib/authz";

// Tope sano: el export trae "todo" pero acotado — un dataset mayor pide paginar por fecha,
// no un response infinito. Si se truncó, el header X-Total lleva el total real.
const EXPORT_CAP = 10000;

// Una celda CSV segura (RFC 4180 + anti formula injection). null/undefined → celda vacía.
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s = value instanceof Date ? value.toISOString() : String(value);
  // Formula injection: prefijo con comilla simple si empieza con caracter ejecutable.
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  // Quoting: comillas dobladas y celda entrecomillada si contiene separadores.
  if (/[",\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function toCsv(header: string[], rows: unknown[][]): string {
  const lines = [header.map(csvCell).join(",")];
  for (const row of rows) lines.push(row.map(csvCell).join(","));
  // BOM para Excel + CRLF (RFC 4180). \uFEFF con escape explícito: un literal invisible se pierde en ediciones.
  return "\uFEFF" + lines.join("\r\n") + "\r\n";
}

function csvResponse(csv: string, entity: string, total: number, truncated: boolean): Response {
  const date = new Date().toISOString().slice(0, 10);
  const headers: Record<string, string> = {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="otr-${entity}-${date}.csv"`,
  };
  if (truncated) headers["X-Total"] = String(total);
  return new Response(csv, { status: 200, headers });
}

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return bad("No autenticado", 401);
  if (!requireRole(user, "ADMIN")) return bad("Solo administradores", 403);

  const entity = new URL(req.url).searchParams.get("entity") || "";

  if (entity === "users") {
    const [rows, total] = await Promise.all([
      db.user.findMany({
        orderBy: { createdAt: "asc" },
        take: EXPORT_CAP,
        select: { id: true, name: true, email: true, role: true, level: true, xp: true, suspended: true, createdAt: true },
      }),
      db.user.count(),
    ]);
    const csv = toCsv(
      ["id", "nombre", "email", "rol", "nivel", "xp", "suspendido", "creadoEn"],
      rows.map((u) => [u.id, u.name, u.email, u.role, u.level, u.xp, u.suspended ? "sí" : "no", u.createdAt]),
    );
    return csvResponse(csv, "users", total, total > rows.length);
  }

  if (entity === "enrollments") {
    const [rows, total] = await Promise.all([
      db.enrollment.findMany({
        take: EXPORT_CAP,
        select: {
          id: true, status: true, source: true, progress: true,
          user: { select: { name: true, email: true } },
          course: { select: { code: true, name: true } },
        },
      }),
      db.enrollment.count(),
    ]);
    const csv = toCsv(
      ["id", "alumno", "email", "cursoCodigo", "cursoNombre", "progresoPct", "estado", "fuente"],
      rows.map((e) => [e.id, e.user?.name, e.user?.email, e.course?.code, e.course?.name, e.progress, e.status, e.source]),
    );
    return csvResponse(csv, "enrollments", total, total > rows.length);
  }

  if (entity === "bookings") {
    const [rows, total] = await Promise.all([
      db.booking.findMany({
        orderBy: { slotAt: "desc" },
        take: EXPORT_CAP,
        select: {
          id: true, slotAt: true, status: true, priceCents: true, packageId: true,
          student: { select: { name: true, email: true } },
          coach: { select: { name: true } },
          escrow: { select: { status: true, amountCents: true } },
        },
      }),
      db.booking.count(),
    ]);
    const csv = toCsv(
      ["id", "alumno", "emailAlumno", "coach", "sesion", "estado", "paqueteId", "montoCents", "estadoEscrow"],
      rows.map((b) => [
        b.id, b.student?.name, b.student?.email, b.coach?.name, b.slotAt, b.status,
        b.packageId, b.escrow?.amountCents ?? b.priceCents, b.escrow?.status ?? "",
      ]),
    );
    return csvResponse(csv, "bookings", total, total > rows.length);
  }

  return bad("Entidad inválida: usa users, enrollments o bookings", 400);
}
