// Formato de dinero compartido: centavos → "$X" (entero) o "$X.XX" (con decimales).
// Fuente única — antes estaba duplicado byte-por-byte en scr-marketplace, scr-coachwork
// y scr-parent. Mantener aquí cualquier cambio de formato de precio del Aula.
export const money = (cents: unknown): string => {
  const v = (Number(cents) || 0) / 100;
  return `$${v % 1 ? v.toFixed(2) : v.toFixed(0)}`;
};
