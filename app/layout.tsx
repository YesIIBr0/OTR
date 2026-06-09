import type { Metadata } from "next";
import "./styles/tokens.css";
import "./styles/app.css";
import "./styles/screens.css";
import "./styles/responsive.css";

export const metadata: Metadata = {
  title: "OTR Aula",
  description: "LMS de OTR Debate Academy",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo+Expanded:wght@600;700;800;900&family=Inter:wght@400;450;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
