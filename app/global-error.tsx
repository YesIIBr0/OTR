"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="es">
      <body style={{ margin: 0 }}>
        <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0C0C0C", color: "#EAF2FB", fontFamily: "system-ui, sans-serif" }}>
          <div style={{ textAlign: "center", padding: 24 }}>
            <h2 style={{ fontSize: 22, margin: "0 0 8px" }}>Algo salió mal</h2>
            <p style={{ opacity: 0.7, margin: "0 0 22px" }}>Reintenta en un momento.</p>
            <button onClick={() => reset()} style={{ background: "#2CAA20", color: "#062038", border: "none", padding: "12px 24px", borderRadius: 10, fontWeight: 700, cursor: "pointer" }}>
              Reintentar
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
