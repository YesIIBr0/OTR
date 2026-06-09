// 404 con identidad de marca.
export default function NotFound() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "var(--otr-navy, #0C2340)", color: "#fff", fontFamily: "var(--font-ui, Inter, sans-serif)", padding: 24 }}>
      <div style={{ textAlign: "center", maxWidth: 420 }}>
        <svg viewBox="0 0 26 30" fill="none" style={{ width: 44, height: 50, margin: "0 auto 18px", display: "block" }}>
          <path d="M13 1 L24 5.5 V16 C24 23 19 27.5 13 29.5 C7 27.5 2 23 2 16 V5.5 Z" fill="#fff" />
          <text x="13" y="18.5" fontFamily="Archivo Expanded" fontWeight="900" fontSize="8" fill="#0C2340" textAnchor="middle">OTR</text>
        </svg>
        <h1 style={{ fontSize: 28, margin: "0 0 8px", fontWeight: 800 }}>Página no encontrada</h1>
        <p style={{ color: "rgba(234,242,251,.65)", margin: "0 0 22px", fontSize: 15 }}>
          La página que buscas no existe o fue movida.
        </p>
        <a href="/" style={{ display: "inline-block", background: "var(--otr-sky, #4FA9E8)", color: "#04243f", fontWeight: 700, textDecoration: "none", padding: "11px 22px", borderRadius: 12 }}>
          Volver al inicio
        </a>
      </div>
    </div>
  );
}
