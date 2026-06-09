// Escape de HTML — protege contra XSS al renderizar datos de usuario en strings de HTML.
const MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function esc(s: unknown): string {
  return String(s ?? "").replace(/[&<>"']/g, (c) => MAP[c]);
}
