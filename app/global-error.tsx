"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="es">
      <body style={{ margin: 0 }}>
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#171717", color: "#FFFFFF", fontFamily: "system-ui, sans-serif" }}>
          <div style={{ textAlign: "center", padding: 24 }}>
            <h2 style={{ fontSize: 22, margin: "0 0 8px", fontWeight: 800, letterSpacing: "-0.03em" }}>Algo salió mal</h2>
            <p style={{ opacity: 0.7, margin: "0 0 22px" }}>Reintenta en un momento.</p>
            {/* Kit mockup: r4, 800, texto NEGRO sobre naranja (--text-on-accent). */}
            <button onClick={() => reset()} style={{ background: "#F25623", color: "#171717", border: "none", height: 44, padding: "0 24px", borderRadius: 4, fontWeight: 800, fontSize: 15, cursor: "pointer" }}>
              Reintentar
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
