// 404 con identidad de marca.
import { otrCrest } from "./lib/icons";

export default function NotFound() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--otr-navy, #0C0C0C)", color: "#fff", fontFamily: "var(--font-ui, Inter, sans-serif)", padding: 24 }}>
      <div style={{ textAlign: "center", maxWidth: 420 }}>
        {/* Escudo OTR del brand book (404, fondo negro) — markup canónico en lib/icons (otrCrest) */}
        <span
          aria-hidden="true"
          style={{ display: "block", margin: "0 auto 18px", width: 44, height: 50 }}
          dangerouslySetInnerHTML={{ __html: otrCrest({ id: "nf", attrs: 'width="44" height="50" style="display:block"' }) }}
        />
        <h1 style={{ fontSize: 28, margin: "0 0 8px", fontWeight: 800 }}>Página no encontrada</h1>
        <p style={{ color: "rgba(234,242,251,.65)", margin: "0 0 22px", fontSize: 15 }}>
          La página que buscas no existe o fue movida.
        </p>
        <a href="/" style={{ display: "inline-block", background: "var(--otr-sky, #2CAA20)", color: "#04243f", fontWeight: 700, textDecoration: "none", padding: "11px 22px", borderRadius: 12 }}>
          Volver al inicio
        </a>
      </div>
    </div>
  );
}
