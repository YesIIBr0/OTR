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

// Descripción única para <meta name="description">, Open Graph y Twitter: un solo texto
// evita que las tarjetas de WhatsApp/Slack/X muestren un copy distinto al del buscador.
const SITE_NAME = "OTR Debating Academy";
const SITE_DESCRIPTION =
  "El aula de OTR Debating Academy: clases, práctica y torneos para aprender a defender tus ideas.";

// metadataBase resuelve las rutas relativas de openGraph.images a URLs absolutas (las
// tarjetas sociales no aceptan rutas relativas). En prod la da APP_URL; en dev, localhost.
const SITE_URL = process.env.APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "es_DO",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: "/",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Escudo de OTR Debating Academy sobre fondo negro con el lema «Convierte la presión en confianza.»",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: ["/og.png"],
  },
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
