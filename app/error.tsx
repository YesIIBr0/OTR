"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#0C2340", color: "#EAF2FB", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ textAlign: "center", maxWidth: 420, padding: 24 }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>⚠️</div>
        <h2 style={{ fontSize: 22, margin: "0 0 8px" }}>Algo salió mal</h2>
        <p style={{ opacity: 0.7, margin: "0 0 22px", fontSize: 15 }}>Tuvimos un problema cargando tu aula. Reintenta en un momento.</p>
        <button
          onClick={() => reset()}
          style={{ background: "#4FA9E8", color: "#062038", border: "none", padding: "12px 24px", borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: "pointer" }}
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
