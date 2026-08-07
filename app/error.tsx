"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#171717", color: "#FFFFFF", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ textAlign: "center", maxWidth: 420, padding: 24 }}>
        <h2 style={{ fontSize: 22, margin: "0 0 8px", fontWeight: 800, letterSpacing: "-0.03em" }}>Algo salió mal</h2>
        <p style={{ opacity: 0.7, margin: "0 0 22px", fontSize: 15 }}>Tuvimos un problema cargando tu aula. Reintenta en un momento.</p>
        <button
          onClick={() => reset()}
          style={{ background: "#F25623", color: "#171717", border: "none", padding: "12px 24px", borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: "pointer" }}
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
