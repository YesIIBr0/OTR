import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./styles/tokens.css";
import "./styles/app.css";
import "./styles/screens.css";
import "./styles/responsive.css";

// Inter self-hosteada por next/font en build: sin CSS externo bloqueante ni conexiones
// extra a fonts.googleapis/gstatic en visita fría (F4.2). Se expone como variable CSS
// --font-inter y el CSS base (tokens.css) la usa como familia primaria de --font-ui/brand.
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "OTR Debating Academy · Aula",
  description: "El aula de OTR Debating Academy: clases, práctica y torneos para aprender a defender tus ideas.",
};

// En Next 15 themeColor vive en el export `viewport`, no en `metadata` (moverlo a
// metadata dispara el warning "Unsupported metadata themeColor" en cada build).
export const viewport: Viewport = {
  themeColor: "#171717",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={inter.variable} suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
