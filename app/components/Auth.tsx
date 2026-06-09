"use client";
import { useState } from "react";

const WAVE = Array.from({ length: 60 }, (_, i) => {
  const env = Math.sin((i / 59) * Math.PI);
  const h = Math.min(96, 8 + env * 70 * Math.abs(Math.sin(i * 0.9)) + 6);
  return { h, d: (i * 0.03).toFixed(2) };
});

export default function Auth() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("analia.reyes@otr.do");
  const [password, setPassword] = useState("otr1234");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const url = mode === "login" ? "/api/auth/login" : "/api/auth/register";
    const body = mode === "login" ? { email, password } : { name, email, password };
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (res.ok) window.location.reload();
    else { setError(data.error || "Algo salió mal"); setLoading(false); }
  }

  return (
    <div className="login">
      <div className="login-brand">
        <div className="lb-top">
          <svg className="crest" style={{ width: 34, height: 39 }} viewBox="0 0 26 30" fill="none">
            <path d="M13 1 L24 5.5 V16 C24 23 19 27.5 13 29.5 C7 27.5 2 23 2 16 V5.5 Z" fill="#fff" />
            <text x="13" y="18.5" fontFamily="Archivo Expanded" fontWeight={900} fontSize={8} fill="#0C2340" textAnchor="middle">OTR</text>
          </svg>
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
        <div className="lf-card">
          <h2>{mode === "login" ? "Inicia sesión" : "Crea tu cuenta"}</h2>
          <p className="muted" style={{ marginBottom: 22 }}>{mode === "login" ? "Bienvenido de vuelta a OTR." : "Únete a OTR Aula."}</p>
          <form onSubmit={submit}>
            {mode === "register" && (
              <div className="field" style={{ marginBottom: 14 }}>
                <label className="label">Nombre completo</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" />
              </div>
            )}
            <div className="field" style={{ marginBottom: 14 }}>
              <label className="label">Correo</label>
              <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="field" style={{ marginBottom: 14 }}>
              <label className="label">Contraseña</label>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {error && <p style={{ color: "var(--danger)", fontSize: 13, marginBottom: 12 }}>{error}</p>}
            <button className="btn btn-primary btn-lg btn-block" type="submit" disabled={loading}>
              {loading ? "…" : mode === "login" ? "Entrar al aula" : "Crear cuenta"}
            </button>
          </form>
          <div className="lf-or"><span>o</span></div>
          <button className="btn btn-ghost btn-block" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
            {mode === "login" ? "Crear una cuenta nueva" : "Ya tengo cuenta — iniciar sesión"}
          </button>
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
