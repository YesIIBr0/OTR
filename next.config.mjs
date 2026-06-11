/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== "production";

// La arquitectura usa onclick inline + estilos inline (innerHTML), por eso 'unsafe-inline'.
// El contenido de usuario ya se escapa en servidor (esc()), así que el riesgo XSS está mitigado.
// En dev se añade 'unsafe-eval' + ws: para que funcione el Fast Refresh/HMR.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  // audio/video: subidos (mismo origen /uploads) + preview de grabación en vivo (blob:)
  "media-src 'self' blob: data:",
  `connect-src 'self' blob:${isDev ? " ws:" : ""}`,
  // iframes de video permitidos (YouTube + Cloudflare Stream)
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://*.cloudflarestream.com https://iframe.videodelivery.net https://videodelivery.net",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
];
if (!isDev) {
  securityHeaders.push({ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" });
}

const nextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // La página principal "/" sirve la landing estática (public/site/); el LMS vive en /aula.
  async rewrites() {
    return { beforeFiles: [{ source: "/", destination: "/site/index.html" }] };
  },
};

export default nextConfig;
