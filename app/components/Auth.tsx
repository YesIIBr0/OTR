"use client";
import { useEffect, useState } from "react";
import { otrCrest } from "../lib/icons";

const WAVE = Array.from({ length: 60 }, (_, i) => {
  const env = Math.sin((i / 59) * Math.PI);
  const h = Math.min(96, 8 + env * 70 * Math.abs(Math.sin(i * 0.9)) + 6);
  return { h, d: (i * 0.03).toFixed(2) };
});

type Mode = "login" | "register" | "forgot" | "reset";
type Role = "student" | "parent" | "teacher";

export default function Auth() {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("analia.reyes@otr.do");
  const [password, setPassword] = useState("otr1234");
  const [password2, setPassword2] = useState("");
  const [role, setRole] = useState<Role>("student");
  const [birthYear, setBirthYear] = useState("");
  const [childEmail, setChildEmail] = useState("");
  const [headline, setHeadline] = useState("");
  const [formats, setFormats] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Entrada suave de la tarjeta al montar. El estado BASE es visible (mounted parte
  // como false → opacity 1 si reduced-motion); solo añadimos el fade-up cuando se permite.
  const reduceMotion = typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false;
  useEffect(() => { setMounted(true); }, []);
  const cardEnter: React.CSSProperties = reduceMotion ? {} : {
    opacity: mounted ? 1 : 0,
    transform: mounted ? "none" : "translateY(10px)",
    transition: "opacity .4s var(--ease, cubic-bezier(.2,.7,.2,1)), transform .4s var(--ease, cubic-bezier(.2,.7,.2,1))",
  };

  // Detecta ?reset=<token> al montar → modo recuperación de contraseña.
  useEffect(() => {
    try {
      const token = new URLSearchParams(window.location.search).get("reset");
      if (token) {
        setResetToken(token);
        setMode("reset");
        setPassword("");
        setPassword2("");
      }
    } catch {}
  }, []);

  function switchMode(next: Mode) {
    setMode(next);
    setError("");
    setNotice("");
    if (next === "register" || next === "login") {
      setPassword("");
      setPassword2("");
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");

    // --- ¿Olvidaste tu contraseña? ---
    if (mode === "forgot") {
      setLoading(true);
      try {
        await fetch("/api/auth/forgot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        // Respuesta neutra: no revelamos si el correo existe.
        setNotice("Si el correo existe, te enviamos un enlace para restablecer tu contraseña.");
      } catch {
        setNotice("Si el correo existe, te enviamos un enlace para restablecer tu contraseña.");
      } finally {
        setLoading(false);
      }
      return;
    }

    // --- Restablecer contraseña con token ---
    if (mode === "reset") {
      if (password.length < 6) { setError("La contraseña debe tener al menos 6 caracteres"); return; }
      if (password !== password2) { setError("Las contraseñas no coinciden"); return; }
      setLoading(true);
      try {
        const res = await fetch("/api/auth/reset", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: resetToken, password }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          // Limpia el token de la URL y vuelve a login con confirmación.
          try {
            const url = new URL(window.location.href);
            url.searchParams.delete("reset");
            window.history.replaceState({}, "", url.toString());
          } catch {}
          setResetToken("");
          setPassword("");
          setPassword2("");
          setMode("login");
          setError("");
          setNotice("Contraseña actualizada. Inicia sesión con tu nueva contraseña.");
        } else {
          setError(data.error || "El enlace no es válido o ya expiró");
        }
      } catch {
        setError("No pudimos restablecer la contraseña. Inténtalo de nuevo.");
      } finally {
        setLoading(false);
      }
      return;
    }

    // --- Login / Registro ---
    const url = mode === "login" ? "/api/auth/login" : "/api/auth/register";
    let body: Record<string, unknown>;
    if (mode === "login") {
      body = { email, password };
    } else {
      // Age-gate: el estudiante declara su año de nacimiento antes de continuar.
      if (role === "student") {
        const yr = parseInt(birthYear, 10);
        const currentYear = new Date().getFullYear();
        if (!Number.isFinite(yr) || yr < currentYear - 100 || yr > currentYear - 5) {
          setError("Indica un año de nacimiento válido");
          return;
        }
      }
      body = { name, email, password, role };
      if (role === "student") body.birthYear = parseInt(birthYear, 10);
      if (role === "teacher") {
        if (headline.trim()) body.headline = headline.trim();
        if (formats.trim()) body.formats = formats.trim();
      }
    }
    setLoading(true);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        if (mode === "register") {
          try { sessionStorage.setItem("otr_onboard", "1"); } catch {}
          // Tras registrar a un padre/madre, si indicó el correo de su hijo/a,
          // intentamos vincularlo (best-effort: un fallo no bloquea el alta).
          if (role === "parent" && childEmail.trim()) {
            try {
              await fetch("/api/guardianship", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: childEmail.trim().toLowerCase() }),
              });
            } catch {}
          }
        }
        window.location.reload();
      } else {
        setError(data.error || "Algo salió mal");
        setLoading(false);
      }
    } catch {
      setError("No pudimos conectar. Inténtalo de nuevo.");
      setLoading(false);
    }
  }

  const heading =
    mode === "login" ? "Inicia sesión" :
    mode === "register" ? "Crea tu cuenta" :
    mode === "forgot" ? "Recupera tu contraseña" :
    "Nueva contraseña";

  const subheading =
    mode === "login" ? "De vuelta al entrenamiento — la sala te espera." :
    mode === "register" ? "Bienvenido al cuartel general de tu formación. By Students, For Students." :
    mode === "forgot" ? "Te enviaremos un enlace para volver al entrenamiento." :
    "Elige una contraseña nueva para tu cuenta.";

  const submitLabel =
    mode === "login" ? "Entrar al aula" :
    mode === "register" ? "Crear cuenta" :
    mode === "forgot" ? "Enviar enlace" :
    "Guardar contraseña";

  return (
    <div className="login">
      <div className="login-brand">
        <div className="lb-top">
          {/* Escudo OTR del brand book (login, panel oscuro) — markup canónico en lib/icons (otrCrest) */}
          <span
            aria-hidden="true"
            style={{ display: "flex", flex: "none" }}
            dangerouslySetInnerHTML={{ __html: otrCrest({ id: "auth", attrs: 'class="crest" style="width:34px;height:39px"' }) }}
          />
          <span className="brand-font" style={{ color: "#fff", fontSize: 16 }}>OTR <span style={{ opacity: 0.5, fontWeight: 600 }}>Aula</span></span>
        </div>
        <div className="lb-mid">
          <p className="eyebrow" style={{ color: "var(--otr-sky-hi)" }}>Academia #1 del circuito dominicano</p>
          <h1 className="brand-font">Domina la sala.<br />Empieza por entrenar.</h1>
          <p className="lb-sub">Tu aula de debate y oratoria: cursos, grabaciones, niveles y resultados — en un solo lugar.</p>
        </div>
        <div className="lb-foot">
          <div className="lb-wave">{WAVE.map((w, i) => <i key={i} style={{ height: `${w.h}%`, animationDelay: `${w.d}s` }} />)}</div>
          <span>10 campeonatos · 55 clasificaciones · Harvard '26</span>
        </div>
      </div>
      <div className="login-form">
        <div className="lf-card" style={cardEnter}>
          <h2>{heading}</h2>
          <p className="muted" style={{ marginBottom: 22 }}>{subheading}</p>

          {notice && (
            <p style={{
              color: "var(--otr-sky-hi, #2CAA20)", background: "rgba(44,170,32,0.10)",
              border: "1px solid rgba(44,170,32,0.30)", borderRadius: 10,
              fontSize: 13, padding: "10px 12px", marginBottom: 14, lineHeight: 1.45,
            }}>{notice}</p>
          )}

          <form onSubmit={submit}>
            {mode === "register" && (
              <>
                {/* Elección de rol: perfiles separados */}
                <div className="field" style={{ marginBottom: 14 }}>
                  <label className="label">¿Cómo quieres unirte?</label>
                  {/* Coaches NO se auto-registran (PRD §7.4/§7.6: Fase 1 = solo
                      coaches OTR verificados, creados por el equipo). */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <RoleCard
                      active={role === "student"}
                      onClick={() => setRole("student")}
                      title="Estudiante"
                      desc="Aprende a dominar la sala"
                    />
                    <RoleCard
                      active={role === "parent"}
                      onClick={() => setRole("parent")}
                      title="Padre/Madre"
                      desc="Sigue su progreso con pruebas reales"
                    />
                  </div>
                </div>

                <div className="field" style={{ marginBottom: 14 }}>
                  <label className="label">Nombre completo</label>
                  <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" />
                </div>

                {/* Age-gate (PRD §11.3): el estudiante declara su año de nacimiento. */}
                {role === "student" && (
                  <div className="field" style={{ marginBottom: 14 }}>
                    <label className="label">Año de nacimiento</label>
                    <input
                      className="input"
                      type="number"
                      inputMode="numeric"
                      value={birthYear}
                      onChange={(e) => setBirthYear(e.target.value)}
                      placeholder="Ej: 2008"
                      min={new Date().getFullYear() - 100}
                      max={new Date().getFullYear() - 5}
                    />
                    <span className="faint" style={{ fontSize: 11.5, marginTop: 2 }}>Si eres menor de 18, tu cuenta se configura para uso con tutor.</span>
                  </div>
                )}

                {/* Padre/madre: vínculo opcional con el correo del hijo/a. */}
                {role === "parent" && (
                  <div className="field" style={{ marginBottom: 14 }}>
                    <label className="label">Correo de tu hijo/a <span className="muted" style={{ fontWeight: 500 }}>(opcional)</span></label>
                    <input
                      className="input"
                      type="email"
                      value={childEmail}
                      onChange={(e) => setChildEmail(e.target.value)}
                      placeholder="estudiante@correo.com"
                    />
                    <span className="faint" style={{ fontSize: 11.5, marginTop: 2 }}>Vincula su cuenta ahora o más tarde desde el Portal de Familias.</span>
                  </div>
                )}

                {role === "teacher" && (
                  <>
                    <div className="field" style={{ marginBottom: 14 }}>
                      <label className="label">Titular <span className="muted" style={{ fontWeight: 500 }}>(opcional)</span></label>
                      <input className="input" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Head Coach · Public Forum" />
                    </div>
                    <div className="field" style={{ marginBottom: 14 }}>
                      <label className="label">¿Qué enseñas? <span className="muted" style={{ fontWeight: 500 }}>(opcional)</span></label>
                      <input className="input" value={formats} onChange={(e) => setFormats(e.target.value)} placeholder="Public Forum, Lincoln-Douglas, Oratoria" />
                      <span className="faint" style={{ fontSize: 11.5, marginTop: 2 }}>Separa los formatos con comas.</span>
                    </div>
                  </>
                )}
              </>
            )}

            {/* Correo: en login, registro y recuperación */}
            {mode !== "reset" && (
              <div className="field" style={{ marginBottom: 14 }}>
                <label className="label">Correo</label>
                <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" />
              </div>
            )}

            {/* Contraseña: login y registro */}
            {(mode === "login" || mode === "register") && (
              <div className="field" style={{ marginBottom: 14 }}>
                <label className="label">Contraseña</label>
                <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              </div>
            )}

            {/* Restablecer: nueva contraseña + confirmación */}
            {mode === "reset" && (
              <>
                <div className="field" style={{ marginBottom: 14 }}>
                  <label className="label">Nueva contraseña</label>
                  <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
                </div>
                <div className="field" style={{ marginBottom: 14 }}>
                  <label className="label">Confirmar contraseña</label>
                  <input className="input" type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} placeholder="Repite la contraseña" />
                </div>
              </>
            )}

            {error && <p style={{ color: "var(--danger)", fontSize: 13, marginBottom: 12 }}>{error}</p>}

            <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={loading}>
              {loading ? "…" : submitLabel}
            </button>
          </form>

          {/* ¿Olvidaste tu contraseña? — solo en login */}
          {mode === "login" && (
            <p style={{ textAlign: "center", marginTop: 14, fontSize: 12.5 }}>
              <button type="button" onClick={() => switchMode("forgot")}
                style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--otr-sky-hi, #2CAA20)", fontWeight: 600 }}>
                ¿Olvidaste tu contraseña?
              </button>
            </p>
          )}

          {/* Alternar login / registro */}
          {(mode === "login" || mode === "register") && (
            <>
              <div className="lf-or"><span>o</span></div>
              <button className="btn btn-ghost btn-block" type="button" onClick={() => switchMode(mode === "login" ? "register" : "login")}>
                {mode === "login" ? "Crear una cuenta nueva" : "Ya tengo cuenta — iniciar sesión"}
              </button>
            </>
          )}

          {/* Volver a login desde forgot / reset */}
          {(mode === "forgot" || mode === "reset") && (
            <button className="btn btn-ghost btn-block" type="button" style={{ marginTop: 16, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={() => switchMode("login")}>
              <ChevL />
              Volver a iniciar sesión
            </button>
          )}

          {mode === "login" && (
            <p className="faint" style={{ textAlign: "center", marginTop: 18, fontSize: 12 }}>
              Demo: <b>analia.reyes@otr.do</b> (alumna) · <b>saul@otr.do</b> (profesor) — contraseña <b>otr1234</b>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Chevron izquierda — mismo trazo que IC.chevL del set de iconos del Aula.
function ChevL() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

function RoleCard({ active, onClick, title, desc }: { active: boolean; onClick: () => void; title: string; desc: string }) {
  const [hover, setHover] = useState(false);
  const [focus, setFocus] = useState(false);
  // El anillo de foco accesible se ve incluso cuando la tarjeta está seleccionada.
  const ring = "0 0 0 3px rgba(44,170,32,0.30)";
  const boxShadow = focus ? ring : active ? "0 0 0 3px rgba(44,170,32,0.18)" : hover ? "var(--sh-2, 0 4px 12px rgba(12,12,12,0.10))" : "none";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
      style={{
        textAlign: "left",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        padding: "12px 13px",
        borderRadius: 12,
        cursor: "pointer",
        outline: "none",
        border: `1.5px solid ${active || hover || focus ? "var(--otr-sky, #2CAA20)" : "var(--border-strong, rgba(0,0,0,0.12))"}`,
        background: active ? "rgba(44,170,32,0.10)" : "var(--otr-white, #fff)",
        boxShadow,
        transition: "border-color .18s var(--ease, cubic-bezier(.2,.7,.2,1)), background .18s var(--ease, cubic-bezier(.2,.7,.2,1)), box-shadow .18s var(--ease, cubic-bezier(.2,.7,.2,1))",
      }}
    >
      <span style={{ fontWeight: 700, fontSize: 13.5, color: "var(--text, #111)" }}>{title}</span>
      <span className="faint" style={{ fontSize: 11.5, lineHeight: 1.35 }}>{desc}</span>
    </button>
  );
}
