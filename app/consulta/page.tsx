// /consulta — APAGADA (PRD-estricto, decisión 10 jun 2026): el funnel de
// captación no está en el PDF (§18.5: el top-of-funnel vive fuera de la
// plataforma). El flujo completo queda intacto en booking-flow.tsx —
// reactivar: CONSULTA_ENABLED = true.
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import BookingFlow from "./booking-flow";
import "./consulta.css";

const CONSULTA_ENABLED = false;

export const metadata: Metadata = {
  title: "Reserva tu consulta · OTR Academy",
  description:
    "Reserva tu sesión de estrategia gratuita de 30 minutos con un coach campeón de OTR Academy. Assessment personalizado, roadmap a tu medida y Q&A en vivo.",
};

export default function ConsultaPage() {
  if (!CONSULTA_ENABLED) redirect("/");
  return <BookingFlow />;
}
