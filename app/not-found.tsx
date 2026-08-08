// 404 con identidad de marca.
import { otrCrest } from "./lib/icons";

export default function NotFound() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--otr-navy, #171717)", color: "#fff", fontFamily: "var(--font-ui, Inter, sans-serif)", padding: 24 }}>
      <div style={{ textAlign: "center", maxWidth: 420 }}>
        {/* Escudo OTR del brand book (404, fondo negro) — markup canónico en lib/icons (otrCrest) */}
        <span
          aria-hidden="true"
          style={{ display: "block", margin: "0 auto 18px", width: 44, height: 46 }}
          dangerouslySetInnerHTML={{ __html: otrCrest({ attrs: 'width="44" height="46" style="display:block"', ink: "#FFFFFF" }) }}
        />
        <h1 style={{ fontSize: 28, margin: "0 0 8px", fontWeight: 800, letterSpacing: "-0.03em" }}>Página no encontrada</h1>
        <p style={{ color: "rgba(255,255,255,.65)", margin: "0 0 22px", fontSize: 15 }}>
          La página que buscas no existe o fue movida.
        </p>
        {/* Kit mockup: r4, 800, texto NEGRO sobre naranja (--text-on-accent). */}
        <a href="/" style={{ display: "inline-flex", alignItems: "center", background: "var(--otr-sky, #F25623)", color: "#171717", fontWeight: 800, fontSize: 15, letterSpacing: "-0.01em", textDecoration: "none", height: 44, padding: "0 24px", borderRadius: 4 }}>
          Volver al inicio
        </a>
      </div>
    </div>
  );
}
