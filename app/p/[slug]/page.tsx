// Perfil público OTR (PRD §8.4) — página server-rendered, SIN auth, fuera del SPA.
// El Lifetime Progress Profile compartible ("LinkedIn para jóvenes"): solo se
// sirve si User.publicProfile === true. NUNCA expone email, birthYear ni datos
// de contacto. Diseño claro premium: navy #0C2340 + sky #4FA9E8, Inter.
import { notFound } from "next/navigation";
import { db } from "../../lib/db";

export const dynamic = "force-dynamic";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const MESES_FULL = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function mesAnio(d: Date): string {
  return `${MESES[d.getMonth()]} ${d.getFullYear()}`;
}
function mesAnioFull(d: Date): string {
  return `${MESES_FULL[d.getMonth()]} ${d.getFullYear()}`;
}
function fechaCorta(d: Date): string {
  return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await db.user.findUnique({
    where: { publicSlug: slug },
    select: { name: true, publicProfile: true },
  });
  if (!user || !user.publicProfile) return { title: "Perfil · OTR Academy" };
  return {
    title: `${user.name} · OTR Academy`,
    description: `Perfil verificado de ${user.name} en OTR Academy: habilidades, credenciales y trayectoria de debate.`,
  };
}

export default async function PublicProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  // Next 15: params es Promise.
  const { slug } = await params;

  const user = await db.user.findUnique({ where: { publicSlug: slug } });
  if (!user || !user.publicProfile) notFound();

  // Carga en paralelo: skill graph, credenciales, historia de rating,
  // récord competitivo, ledger (timeline) y cursos.
  const [skills, certs, ratingHistory, debateCount, winCount, events, courseCount] =
    await Promise.all([
      db.studentSkill.findMany({ where: { userId: user.id }, orderBy: { score: "desc" } }),
      db.certificate.findMany({ where: { userId: user.id }, orderBy: { issuedAt: "desc" } }),
      db.ratingUpdate.findMany({
        where: { debate: { userId: user.id } },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
      db.debateRecord.count({ where: { userId: user.id } }),
      db.debateRecord.count({ where: { userId: user.id, result: "WIN" } }),
      db.activityEvent.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "asc" },
        take: 20,
      }),
      db.enrollment.count({ where: { userId: user.id } }),
    ]);

  // Cronológico para mostrar la evolución del rating de izquierda a derecha.
  const ratingChips = [...ratingHistory].reverse();
  // "Miembro desde": primer evento del ledger (o el alta de membresía como fallback).
  const memberSince: Date | null = events[0]?.createdAt ?? user.membershipSince ?? null;

  const stats = [
    { n: debateCount, l: "Debates" },
    { n: winCount, l: "Victorias" },
    { n: courseCount, l: "Cursos" },
    { n: certs.length, l: "Certificaciones" },
  ];

  return (
    <div className="pp-page">
      <style>{`
        .pp-page{min-height:100vh;background:#F2F6FB;color:#0C2340;font-family:'Inter',system-ui,-apple-system,'Segoe UI',sans-serif;-webkit-font-smoothing:antialiased;padding-bottom:56px}
        .pp-wrap{max-width:780px;margin:0 auto;padding:0 20px}
        .pp-hero{background:radial-gradient(640px 280px at 85% -10%,rgba(79,169,232,.30),transparent 60%),linear-gradient(140deg,#0C2340 0%,#0F2D52 55%,#143A66 100%);padding:56px 0 78px;color:#fff}
        .pp-avatar{width:88px;height:88px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:28px;letter-spacing:1px;color:#fff;background:rgba(79,169,232,.20);border:2px solid rgba(79,169,232,.55);margin-bottom:18px}
        .pp-name{margin:0;font-size:32px;font-weight:800;letter-spacing:-.02em;color:#fff}
        .pp-sub{margin:6px 0 18px;color:#9EC9EC;font-weight:600;font-size:15px}
        .pp-hero-meta{display:flex;flex-wrap:wrap;gap:10px}
        .pp-pill{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16);color:#DCEAF8;border-radius:999px;padding:7px 14px;font-size:13px;font-weight:600}
        .pp-pill strong{color:#fff;font-weight:800;margin-right:6px}
        .pp-pill-pro{background:rgba(79,169,232,.24);border-color:rgba(79,169,232,.55);color:#fff}
        .pp-main{margin-top:-34px}
        .pp-card{background:#fff;border:1px solid #E1EAF4;border-radius:18px;padding:24px 26px;margin-bottom:22px;box-shadow:0 10px 30px rgba(12,35,64,.05)}
        .pp-h2{margin:0 0 16px;font-size:13px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#5B7794}
        .pp-skills{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:16px 26px}
        .pp-skill-top{display:flex;justify-content:space-between;font-size:14px;font-weight:600;margin-bottom:7px}
        .pp-skill-n{color:#2E8BD0;font-weight:800}
        .pp-bar{height:8px;border-radius:999px;background:#E8F0F9;overflow:hidden}
        .pp-bar-fill{height:100%;border-radius:999px;background:linear-gradient(90deg,#4FA9E8,#2E8BD0)}
        .pp-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px}
        .pp-stat{background:#F6FAFE;border:1px solid #E1EAF4;border-radius:14px;padding:16px 12px;text-align:center}
        .pp-stat-n{font-size:26px;font-weight:800;color:#0C2340}
        .pp-stat-l{font-size:12px;font-weight:600;color:#5B7794;margin-top:2px}
        .pp-rating-row{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}
        .pp-rating-chip{font-size:12px;font-weight:600;color:#205E96;background:#EAF4FC;border:1px solid #CCE3F6;border-radius:999px;padding:5px 11px}
        .pp-cred{display:flex;justify-content:space-between;align-items:baseline;gap:14px;padding:13px 0;border-bottom:1px solid #EDF3FA}
        .pp-cred:last-child{border-bottom:0}
        .pp-cred-t{font-size:15px;font-weight:700}
        .pp-cred-d{font-size:13px;color:#5B7794;font-weight:500;white-space:nowrap}
        .pp-timeline{list-style:none;margin:0;padding:0;position:relative}
        .pp-timeline:before{content:"";position:absolute;left:5px;top:6px;bottom:6px;width:2px;background:#D7E5F2;border-radius:2px}
        .pp-tl-item{position:relative;padding:0 0 22px 26px}
        .pp-tl-item:last-child{padding-bottom:0}
        .pp-tl-dot{position:absolute;left:0;top:4px;width:12px;height:12px;border-radius:50%;background:#4FA9E8;border:2px solid #fff;box-shadow:0 0 0 2px #BFDDF4}
        .pp-tl-date{font-size:12px;font-weight:700;color:#2E8BD0;text-transform:uppercase;letter-spacing:.06em}
        .pp-tl-title{margin:2px 0 0;font-size:15px;font-weight:700;color:#0C2340}
        .pp-tl-detail{margin:2px 0 0;font-size:13.5px;color:#5B7794;line-height:1.5}
        .pp-empty{margin:0;font-size:14px;color:#5B7794}
        .pp-footer{margin-top:8px;text-align:center;font-size:13px;font-weight:600;color:#5B7794}
        @media (max-width:560px){.pp-name{font-size:26px}.pp-hero{padding:44px 0 70px}.pp-card{padding:20px 18px}}
      `}</style>

      <header className="pp-hero">
        <div className="pp-wrap">
          <div className="pp-avatar">{user.initials}</div>
          <h1 className="pp-name">{user.name}</h1>
          <p className="pp-sub">Debatiente OTR · Tier {user.debateTier}</p>
          <div className="pp-hero-meta">
            <span className="pp-pill">
              <strong>{Math.round(user.debateRating)}</strong>Rating
            </span>
            {memberSince && <span className="pp-pill">Miembro desde {mesAnioFull(memberSince)}</span>}
            {user.membership !== "free" && (
              <span className="pp-pill pp-pill-pro">OTR {user.membership === "pro" ? "Pro" : "Elite"}</span>
            )}
          </div>
        </div>
      </header>

      <main className="pp-wrap pp-main">
        <section className="pp-card">
          <h2 className="pp-h2">Habilidades</h2>
          {skills.length === 0 ? (
            <p className="pp-empty">Aún no hay habilidades registradas.</p>
          ) : (
            <div className="pp-skills">
              {skills.map((s) => (
                <div key={s.id}>
                  <div className="pp-skill-top">
                    <span>{s.skill}</span>
                    <span className="pp-skill-n">{s.score}</span>
                  </div>
                  <div className="pp-bar">
                    <div
                      className="pp-bar-fill"
                      style={{ width: `${Math.max(0, Math.min(100, s.score))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="pp-card">
          <h2 className="pp-h2">Rendimiento competitivo</h2>
          <div className="pp-stats">
            {stats.map((s) => (
              <div className="pp-stat" key={s.l}>
                <div className="pp-stat-n">{s.n}</div>
                <div className="pp-stat-l">{s.l}</div>
              </div>
            ))}
          </div>
          {ratingChips.length > 0 && (
            <div className="pp-rating-row">
              {ratingChips.map((r) => (
                <span className="pp-rating-chip" key={r.id}>
                  {Math.round(r.ratingAfter)} · {r.tierAfter} · {mesAnio(r.createdAt)}
                </span>
              ))}
            </div>
          )}
        </section>

        <section className="pp-card">
          <h2 className="pp-h2">Credenciales</h2>
          {certs.length === 0 ? (
            <p className="pp-empty">Aún no hay certificaciones emitidas.</p>
          ) : (
            <div>
              {certs.map((c) => (
                <div className="pp-cred" key={c.id}>
                  <span className="pp-cred-t">{c.title}</span>
                  <span className="pp-cred-d">Emitido el {fechaCorta(c.issuedAt)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="pp-card">
          <h2 className="pp-h2">Trayectoria</h2>
          {events.length === 0 ? (
            <p className="pp-empty">La historia de este perfil está por escribirse.</p>
          ) : (
            <ol className="pp-timeline">
              {events.map((ev) => (
                <li className="pp-tl-item" key={ev.id}>
                  <span className="pp-tl-dot" />
                  <span className="pp-tl-date">{mesAnio(ev.createdAt)}</span>
                  <p className="pp-tl-title">{ev.title}</p>
                  {ev.detail && <p className="pp-tl-detail">{ev.detail}</p>}
                </li>
              ))}
            </ol>
          )}
        </section>

        <footer className="pp-footer">Perfil verificado por OTR Academy · otr-academy.com</footer>
      </main>
    </div>
  );
}
