"use client";
import { useEffect, useState } from "react";
import { otrCrest } from "../lib/icons";

const WAVE = Array.from({ length: 60 }, (_, i) => {
  const env = Math.sin((i / 59) * Math.PI);
  // Redondeamos a 2 decimales: así `${h}%` serializa idéntico en SSR y cliente y no
  // dispara el aviso de hydration-mismatch (el float crudo daba 16 decimales vs 4).
  const h = Math.round((Math.min(96, 8 + env * 70 * Math.abs(Math.sin(i * 0.9)) + 6)) * 100) / 100;
  return { h, d: (i * 0.03).toFixed(2) };
});

// Tabla de strings bilingüe (es/en). El login es la primera pantalla y debe
// hablar el idioma del visitante igual que el resto del Aula (cookie otr_lang).
const STR = {
  es: {
    // Brand (panel oscuro)
    brandEyebrow: "Academia #1 del circuito dominicano",
    brandH1a: "Domina la sala.",
    brandH1b: "Empieza por entrenar.",
    brandSub: "Tu aula de debate y oratoria: cursos, grabaciones, niveles y resultados — en un solo lugar.",
    brandFoot: "10 campeonatos · 55 clasificaciones · Harvard '26",
    // Encabezados por modo
    headingLogin: "Inicia sesión",
    headingRegister: "Crea tu cuenta",
    headingForgot: "Recupera tu contraseña",
    headingReset: "Nueva contraseña",
    subLogin: "De vuelta al entrenamiento — la sala te espera.",
    subRegister: "Bienvenido al cuartel general de tu formación. By Students, For Students.",
    subForgot: "Te enviaremos un enlace para volver al entrenamiento.",
    subReset: "Elige una contraseña nueva para tu cuenta.",
    submitLogin: "Entrar al aula",
    submitRegister: "Crear cuenta",
    submitForgot: "Enviar enlace",
    submitReset: "Guardar contraseña",
    // Rol
    roleQ: "¿Cómo quieres unirte?",
    roleCoach: "Coach",
    roleCoachDesc: "Enseña y cobra por tus clases",
    coachGateTitle: "El acceso de coach es por invitación",
    coachGateBody: "OTR entrena a menores, así que verificamos identidad y antecedentes antes de dejar a nadie dar clases. Escríbenos y te abrimos el paso.",
    coachGateCta: "Escribir al equipo",
    roleStudent: "Estudiante",
    roleStudentDesc: "Aprende a dominar la sala",
    roleParent: "Padre/Madre",
    roleParentDesc: "Sigue su progreso con pruebas reales",
    // Campos
    reqTag: "(requerido)",
    optTag: "(opcional)",
    nameLabel: "Nombre completo",
    namePh: "Tu nombre",
    birthYearLabel: "Año de nacimiento",
    birthYearPh: "Ej: 2008",
    birthYearHint: "Si eres menor de 18, tu cuenta se configura para uso con tutor.",
    childEmailLabel: "Correo de tu hijo/a",
    childEmailPh: "estudiante@correo.com",
    childEmailHint: "Vincula su cuenta ahora o más tarde desde el Portal de Familias.",
    headlineLabel: "Titular",
    headlinePh: "Head Coach · Public Forum",
    teachLabel: "¿Qué enseñas?",
    teachPh: "Public Forum, Lincoln-Douglas, Oratoria",
    teachHint: "Separa los formatos con comas.",
    emailLabel: "Correo",
    emailPh: "tu@correo.com",
    passwordLabel: "Contraseña",
    newPwdLabel: "Nueva contraseña",
    newPwdPh: "Mínimo 8 caracteres",
    totpLabel: "Código de verificación (2FA)",
    totpPrompt: "Esta cuenta tiene verificación en dos pasos: escribe el código de tu app autenticadora.",
    confirmPwdLabel: "Confirmar contraseña",
    confirmPwdPh: "Repite la contraseña",
    // Pies
    forgotLink: "¿Olvidaste tu contraseña?",
    orSep: "o",
    toRegister: "Crear una cuenta nueva",
    toLogin: "Ya tengo cuenta — iniciar sesión",
    backToLogin: "Volver a iniciar sesión",
    langLabel: "Idioma",
    audienceLabel: "¿Quién eres?",
    audStudent: "Estudiante",
    audCoach: "Coach",
    subLoginCoach: "Entra a tu espacio de coach — tus clases y tus reservas.",
    // Mensajes (handlers)
    forgotNotice: "Si el correo existe, te enviamos un enlace para restablecer tu contraseña.",
    errPwdShort: "La contraseña debe tener al menos 8 caracteres",
    errPwdMismatch: "Las contraseñas no coinciden",
    resetDone: "Contraseña actualizada. Inicia sesión con tu nueva contraseña.",
    errBadLink: "El enlace no es válido o ya expiró",
    errResetFail: "No pudimos restablecer la contraseña. Inténtalo de nuevo.",
    errBirthYear: "Indica un año de nacimiento válido",
    errGeneric: "Algo salió mal",
    errConnect: "No pudimos conectar. Inténtalo de nuevo.",
  },
  en: {
    brandEyebrow: "#1 academy on the Dominican circuit",
    brandH1a: "Own the room.",
    brandH1b: "Start by training.",
    brandSub: "Your debate and public-speaking academy: courses, recordings, levels and results — all in one place.",
    brandFoot: "10 championships · 55 qualifications · Harvard '26",
    headingLogin: "Sign in",
    headingRegister: "Create your account",
    headingForgot: "Reset your password",
    headingReset: "New password",
    subLogin: "Back to training — the room is waiting.",
    subRegister: "Welcome to your training HQ. By Students, For Students.",
    subForgot: "We'll send you a link to get back to training.",
    subReset: "Choose a new password for your account.",
    submitLogin: "Enter the academy",
    submitRegister: "Create account",
    submitForgot: "Send link",
    submitReset: "Save password",
    roleQ: "How do you want to join?",
    roleCoach: "Coach",
    roleCoachDesc: "Teach and charge for your classes",
    coachGateTitle: "Coach access is by invitation",
    coachGateBody: "OTR trains minors, so we verify identity and background before letting anyone teach. Write to us and we'll open the door.",
    coachGateCta: "Write to the team",
    roleStudent: "Student",
    roleStudentDesc: "Learn to own the room",
    roleParent: "Parent",
    roleParentDesc: "Track their progress with real proof",
    reqTag: "(required)",
    optTag: "(optional)",
    nameLabel: "Full name",
    namePh: "Your name",
    birthYearLabel: "Birth year",
    birthYearPh: "e.g. 2008",
    birthYearHint: "If you're under 18, your account is set up for use with a guardian.",
    childEmailLabel: "Your child's email",
    childEmailPh: "student@email.com",
    childEmailHint: "Link their account now or later from the Family Portal.",
    headlineLabel: "Headline",
    headlinePh: "Head Coach · Public Forum",
    teachLabel: "What do you teach?",
    teachPh: "Public Forum, Lincoln-Douglas, Speech",
    teachHint: "Separate formats with commas.",
    emailLabel: "Email",
    emailPh: "you@email.com",
    passwordLabel: "Password",
    newPwdLabel: "New password",
    newPwdPh: "At least 8 characters",
    totpLabel: "Verification code (2FA)",
    totpPrompt: "This account uses two-step verification: enter the code from your authenticator app.",
    confirmPwdLabel: "Confirm password",
    confirmPwdPh: "Repeat the password",
    forgotLink: "Forgot your password?",
    orSep: "or",
    toRegister: "Create a new account",
    toLogin: "I already have an account — sign in",
    backToLogin: "Back to sign in",
    langLabel: "Language",
    audienceLabel: "Who are you?",
    audStudent: "Student",
    audCoach: "Coach",
    subLoginCoach: "Enter your coach space — your classes and your bookings.",
    forgotNotice: "If the email exists, we've sent you a link to reset your password.",
    errPwdShort: "Your password must be at least 8 characters",
    errPwdMismatch: "Passwords don't match",
    resetDone: "Password updated. Sign in with your new password.",
    errBadLink: "This link is invalid or has expired",
    errResetFail: "We couldn't reset your password. Please try again.",
    errBirthYear: "Enter a valid birth year",
    errGeneric: "Something went wrong",
    errConnect: "We couldn't connect. Please try again.",
  },
} as const;
type Lang = keyof typeof STR;

type Mode = "login" | "register" | "forgot" | "reset";
type Role = "student" | "parent" | "teacher";

// Espejo de TEACHER_SIGNUP_ENABLED (app/api/auth/register/route.ts). Vive aquí para que el
// formulario no prometa lo que el servidor rechaza; el servidor SIGUE siendo la autoridad
// (esta constante no abre nada por sí sola). Decisión de vetting: spec §3.2 — plataforma
// con menores.
const COACH_SIGNUP_ENABLED = false;

export default function Auth() {
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [role, setRole] = useState<Role>("student");
  const [birthYear, setBirthYear] = useState("");
  const [childEmail, setChildEmail] = useState("");
  const [headline, setHeadline] = useState("");
  const [formats, setFormats] = useState("");
  const [resetToken, setResetToken] = useState("");
  // [R5] 2FA TOTP: el server responde code "totpRequired" → se muestra el campo del código.
  const [totp, setTotp] = useState("");
  const [totpNeeded, setTotpNeeded] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [lang, setLang] = useState<Lang>("es");
  const T = STR[lang];

  // Idioma: arranca en 'es' (default SSR) y lee la cookie otr_lang tras montar,
  // evitando desajuste de hidratación. El toggle cambia el idioma SIN recargar
  // (re-render de React) y persiste la cookie para que el Aula herede la elección.
  useEffect(() => {
    try {
      const m = document.cookie.match(/(?:^|;\s*)otr_lang=(es|en)/);
      if (m) setLang(m[1] as Lang);
    } catch {}
  }, []);
  function pickLang(next: Lang) {
    setLang(next);
    try { document.cookie = `otr_lang=${next};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`; } catch {}
  }

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
        setNotice(T.forgotNotice);
      } catch {
        setNotice(T.forgotNotice);
      } finally {
        setLoading(false);
      }
      return;
    }

    // --- Restablecer contraseña con token ---
    if (mode === "reset") {
      if (password.length < 8) { setError(T.errPwdShort); return; } // [R2] espejo del server (lib/password-policy); la lista de comunes la valida el server
      if (password !== password2) { setError(T.errPwdMismatch); return; }
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
          setNotice(T.resetDone);
        } else {
          setError(data.error || T.errBadLink);
        }
      } catch {
        setError(T.errResetFail);
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
      if (totpNeeded && totp.trim()) body.totp = totp.trim(); // [R5]
    } else {
      // Age-gate: el estudiante declara su año de nacimiento antes de continuar.
      if (role === "student") {
        const yr = parseInt(birthYear, 10);
        const currentYear = new Date().getFullYear();
        if (!Number.isFinite(yr) || yr < currentYear - 100 || yr > currentYear - 5) {
          setError(T.errBirthYear);
          return;
        }
      }
      // El camino de coach no envía mientras el vetting esté cerrado: el servidor lo
      // rechaza con 403 y es peor dejar que el usuario llene todo y choque. Cuando se
      // abra, basta encender la constante de abajo Y TEACHER_SIGNUP_ENABLED en el
      // servidor — el envío ya está escrito.
      if (role === "teacher" && !COACH_SIGNUP_ENABLED) { setError(T.coachGateTitle); return; }
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
        // [R5] La cuenta tiene 2FA: desplegar el campo del código (primer intento sin código
        // no es un "error" del usuario — es el paso 2 del login).
        if (data.code === "totpRequired") {
          setTotpNeeded(true);
          setError(totp ? data.error || T.errGeneric : T.totpPrompt);
        } else {
          setError(data.error || T.errGeneric);
        }
        setLoading(false);
      }
    } catch {
      setError(T.errConnect);
      setLoading(false);
    }
  }

  const heading =
    mode === "login" ? T.headingLogin :
    mode === "register" ? T.headingRegister :
    mode === "forgot" ? T.headingForgot :
    T.headingReset;

  const subheading =
    mode === "login" ? (role === "teacher" ? T.subLoginCoach : T.subLogin) :
    mode === "register" ? T.subRegister :
    mode === "forgot" ? T.subForgot :
    T.subReset;

  const submitLabel =
    mode === "login" ? T.submitLogin :
    mode === "register" ? T.submitRegister :
    mode === "forgot" ? T.submitForgot :
    T.submitReset;

  return (
    <div className="login">
      <div className="login-brand">
        <div className="lb-top">
          {/* Escudo OTR del brand book (login, panel oscuro) — markup canónico en lib/icons (otrCrest) */}
          <span
            aria-hidden="true"
            style={{ display: "flex", flex: "none" }}
            dangerouslySetInnerHTML={{ __html: otrCrest({ id: "auth", attrs: 'class="crest" style="width:34px;height:39px"', ink: "#FFFFFF", paper: "#171717" }) }}
          />
          <span className="brand-font" style={{ color: "#fff", fontSize: 16 }}>OTR <span style={{ opacity: 0.5, fontWeight: 600 }}>Aula</span></span>
        </div>
        <div className="lb-mid">
          <p className="eyebrow" style={{ color: "var(--otr-sky-hi)" }}>{T.brandEyebrow}</p>
          <h1 className="brand-font">{T.brandH1a}<br />{T.brandH1b}</h1>
          <p className="lb-sub">{T.brandSub}</p>
        </div>
        <div className="lb-foot">
          <div className="lb-wave">{WAVE.map((w, i) => <i key={i} style={{ height: `${w.h}%`, animationDelay: `${w.d}s` }} />)}</div>
          <span>{T.brandFoot}</span>
        </div>
      </div>
      <div className="login-form">
        <div className="lf-card" style={cardEnter}>
          <div role="group" aria-label={T.langLabel} style={{ display: "flex", justifyContent: "flex-end", gap: 2, marginBottom: 10 }}>
            {(["es", "en"] as Lang[]).map((lg) => (
              <button
                key={lg}
                type="button"
                onClick={() => pickLang(lg)}
                aria-pressed={lang === lg}
                /* [MOCKUP 2026-08] Radio del sistema (--r-sm, 4px): el kit no tiene pills. */
                style={{
                  border: "1px solid var(--border, rgba(0,0,0,0.12))",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  fontWeight: 700,
                  fontSize: 11.5,
                  padding: "4px 10px",
                  borderRadius: "var(--r-sm, 4px)",
                  transition: ".2s",
                  background: lang === lg ? "var(--otr-navy, #171717)" : "transparent",
                  color: lang === lg ? "#fff" : "var(--text-2, #4D4D4D)",
                }}
              >
                {lg.toUpperCase()}
              </button>
            ))}
          </div>
          {/* [AUTH-ROL] Toggle COACH | ESTUDIANTE, mismo registro visual que el de idioma.
              Es la primera pregunta de la tarjeta porque decide todo lo que viene: en el
              registro fija el rol; al entrar solo adapta el texto — la sesión la resuelve
              SIEMPRE el rol real de la cuenta, así que elegir "mal" aquí no bloquea a
              nadie ni cambia a qué tiene acceso. */}
          {(mode === "login" || mode === "register") && (
            <div role="group" aria-label={T.audienceLabel} className="aud-toggle">
              {([
                { k: "student" as Role, l: T.audStudent },
                { k: "teacher" as Role, l: T.audCoach },
              ]).map((o) => (
                <button
                  key={o.k}
                  type="button"
                  onClick={() => { setRole(o.k); setError(""); }}
                  aria-pressed={role === o.k}
                  className={role === o.k ? "on" : ""}
                >
                  {o.l}
                </button>
              ))}
            </div>
          )}
          <h2>{heading}</h2>
          <p className="muted" style={{ marginBottom: 22 }}>{subheading}</p>

          {notice && (
            <p style={{
              color: "var(--otr-green-text, #9E3211)", background: "var(--ok-soft, #EFEFEF)",
              border: "1px solid color-mix(in srgb, var(--otr-green) 30%, transparent)", borderRadius: "var(--r-sm, 4px)",
              fontSize: 13, padding: "10px 12px", marginBottom: 14, lineHeight: 1.45,
            }}>{notice}</p>
          )}

          <form onSubmit={submit}>
            {mode === "register" && (
              <>
                {/* [AUTH-ROL] El rol principal lo fija el toggle de arriba (Estudiante |
                    Coach). Padre/Madre queda como tercera vía en un enlace: es un rol real
                    (tiene portal propio) pero minoritario en el alta, y meterlo en el toggle
                    obligaría a tres pastillas donde la decisión es binaria para casi todos. */}
                {role === "teacher" && (
                  <div className="alert info" style={{ marginBottom: 14 }}>
                    <span className="ai">{"\u2139"}</span>
                    <div>
                      <div className="at">{T.coachGateTitle}</div>
                      <p style={{ margin: "4px 0 8px", fontSize: 13, lineHeight: 1.5 }}>{T.coachGateBody}</p>
                      <a className="btn btn-outline btn--sm" href="mailto:hola@otracademy.do?subject=Quiero%20dar%20clases%20en%20OTR">{T.coachGateCta}</a>
                    </div>
                  </div>
                )}
                {role !== "teacher" && (
                  <p className="faint" style={{ fontSize: 12.5, marginBottom: 14 }}>
                    <button
                      type="button"
                      onClick={() => setRole(role === "parent" ? "student" : "parent")}
                      style={{ background: "none", border: 0, padding: 0, font: "inherit", color: "var(--link, #C8401A)", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}
                    >
                      {role === "parent" ? T.roleStudent : T.roleParent}
                    </button>
                    {" — "}{role === "parent" ? T.roleStudentDesc : T.roleParentDesc}
                  </p>
                )}

                <div className="field" style={{ marginBottom: 14 }}>
                  <label className="label" htmlFor="auth-name">{T.nameLabel} <span className="faint" style={{ fontWeight: 500 }}>{T.reqTag}</span></label>
                  <input id="auth-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder={T.namePh} required aria-required="true" />
                </div>

                {/* Age-gate (PRD §11.3): el estudiante declara su año de nacimiento. */}
                {role === "student" && (
                  <div className="field" style={{ marginBottom: 14 }}>
                    <label className="label" htmlFor="auth-birthyear">{T.birthYearLabel} <span className="faint" style={{ fontWeight: 500 }}>{T.reqTag}</span></label>
                    <input
                      id="auth-birthyear"
                      className="input"
                      type="number"
                      inputMode="numeric"
                      value={birthYear}
                      onChange={(e) => setBirthYear(e.target.value)}
                      placeholder={T.birthYearPh}
                      min={new Date().getFullYear() - 100}
                      max={new Date().getFullYear() - 5}
                      required
                      aria-required="true"
                      aria-invalid={error ? true : undefined}
                      aria-describedby="auth-birthyear-hint"
                    />
                    <span id="auth-birthyear-hint" className="faint" style={{ fontSize: 11.5, marginTop: 2 }}>{T.birthYearHint}</span>
                  </div>
                )}

                {/* Padre/madre: vínculo opcional con el correo del hijo/a. */}
                {role === "parent" && (
                  <div className="field" style={{ marginBottom: 14 }}>
                    <label className="label" htmlFor="auth-child-email">{T.childEmailLabel} <span className="muted" style={{ fontWeight: 500 }}>{T.optTag}</span></label>
                    <input
                      id="auth-child-email"
                      className="input"
                      type="email"
                      value={childEmail}
                      onChange={(e) => setChildEmail(e.target.value)}
                      placeholder={T.childEmailPh}
                      aria-describedby="auth-child-email-hint"
                    />
                    <span id="auth-child-email-hint" className="faint" style={{ fontSize: 11.5, marginTop: 2 }}>{T.childEmailHint}</span>
                  </div>
                )}

                {role === "teacher" && (
                  <>
                    <div className="field" style={{ marginBottom: 14 }}>
                      <label className="label" htmlFor="auth-headline">{T.headlineLabel} <span className="muted" style={{ fontWeight: 500 }}>{T.optTag}</span></label>
                      <input id="auth-headline" className="input" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder={T.headlinePh} />
                    </div>
                    <div className="field" style={{ marginBottom: 14 }}>
                      <label className="label" htmlFor="auth-formats">{T.teachLabel} <span className="muted" style={{ fontWeight: 500 }}>{T.optTag}</span></label>
                      <input id="auth-formats" className="input" value={formats} onChange={(e) => setFormats(e.target.value)} placeholder={T.teachPh} aria-describedby="auth-formats-hint" />
                      <span id="auth-formats-hint" className="faint" style={{ fontSize: 11.5, marginTop: 2 }}>{T.teachHint}</span>
                    </div>
                  </>
                )}
              </>
            )}

            {/* Correo: en login, registro y recuperación */}
            {mode !== "reset" && (
              <div className="field" style={{ marginBottom: 14 }}>
                <label className="label" htmlFor="auth-email">{T.emailLabel}{mode === "register" && <span className="faint" style={{ fontWeight: 500 }}>{" "}{T.reqTag}</span>}</label>
                <input id="auth-email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={T.emailPh} required aria-required="true" />
              </div>
            )}

            {/* Contraseña: login y registro */}
            {(mode === "login" || mode === "register") && (
              <div className="field" style={{ marginBottom: 14 }}>
                <label className="label" htmlFor="auth-password">{T.passwordLabel}{mode === "register" && <span className="faint" style={{ fontWeight: 500 }}>{" "}{T.reqTag}</span>}</label>
                <input id="auth-password" className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required aria-required="true" />
              </div>
            )}

            {/* [R5] 2FA: código de la app autenticadora (solo si el server lo pidió) */}
            {mode === "login" && totpNeeded && (
              <div className="field" style={{ marginBottom: 14 }}>
                <label className="label" htmlFor="auth-totp">{T.totpLabel}</label>
                <input id="auth-totp" className="input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={totp} onChange={(e) => setTotp(e.target.value)} placeholder="123456" autoFocus aria-required="true" />
              </div>
            )}

            {/* Restablecer: nueva contraseña + confirmación */}
            {mode === "reset" && (
              <>
                <div className="field" style={{ marginBottom: 14 }}>
                  <label className="label" htmlFor="auth-new-password">{T.newPwdLabel}</label>
                  <input id="auth-new-password" className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={T.newPwdPh} required aria-required="true" aria-invalid={error ? true : undefined} />
                </div>
                <div className="field" style={{ marginBottom: 14 }}>
                  <label className="label" htmlFor="auth-confirm-password">{T.confirmPwdLabel}</label>
                  <input id="auth-confirm-password" className="input" type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} placeholder={T.confirmPwdPh} required aria-required="true" aria-invalid={error ? true : undefined} />
                </div>
              </>
            )}

            {error && <p id="auth-error" role="alert" style={{ color: "var(--danger)", fontSize: 13, marginBottom: 12 }}>{error}</p>}

            {/* [MOCKUP 2026-08] Altura de control del kit (44px), no el 50 del CTA de hero. */}
            <button className="btn btn-primary btn-block" type="submit" disabled={loading || (mode === "register" && role === "teacher" && !COACH_SIGNUP_ENABLED)}>
              {loading ? "…" : submitLabel}
            </button>
          </form>

          {/* ¿Olvidaste tu contraseña? — solo en login */}
          {mode === "login" && (
            <p style={{ textAlign: "center", marginTop: 14, fontSize: 12.5 }}>
              <button type="button" onClick={() => switchMode("forgot")}
                style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--otr-green-text, #9E3211)", fontWeight: 600 }}>
                {T.forgotLink}
              </button>
            </p>
          )}

          {/* Alternar login / registro */}
          {(mode === "login" || mode === "register") && (
            <>
              <div className="lf-or"><span>{T.orSep}</span></div>
              <button className="btn btn-outline btn-block" type="button" onClick={() => switchMode(mode === "login" ? "register" : "login")}>
                {mode === "login" ? T.toRegister : T.toLogin}
              </button>
            </>
          )}

          {/* Volver a login desde forgot / reset */}
          {(mode === "forgot" || mode === "reset") && (
            <button className="btn btn-outline btn-block" type="button" style={{ marginTop: 16, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={() => switchMode("login")}>
              <ChevL />
              {T.backToLogin}
            </button>
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

