// OTR Academy · Email helper. Usa nodemailer si SMTP_URL está definido; si no,
// hace fallback a console.log (desarrollo real). Nunca lanza: cualquier fallo se
// loguea y se traga para no romper el flujo de la API que lo invoca.
import { createHash } from "crypto";
import nodemailer from "nodemailer";

export interface MailInput {
  to: string;
  subject: string;
  html: string;
}

/** Envía un correo. Si no hay SMTP_URL configurado, loguea en consola (dev). Nunca lanza. */
export async function sendMail({ to, subject, html }: MailInput): Promise<void> {
  try {
    const smtpUrl = process.env.SMTP_URL;
    if (!smtpUrl) {
      console.log("[mail]", to, subject, html);
      return;
    }
    const transport = nodemailer.createTransport(smtpUrl);
    const from = process.env.MAIL_FROM || "OTR Academy <no-reply@otr-academy.com>";
    await transport.sendMail({ from, to, subject, html });
  } catch (err) {
    console.error("[mail] error al enviar:", err);
  }
}

/** sha256 hex de un token (para guardar el reset hasheado, nunca en claro). */
export function hashToken(t: string): string {
  return createHash("sha256").update(String(t)).digest("hex");
}

/** Correo de recuperación de contraseña con branding OTR (negro / ámbar). Nunca lanza. */
export async function sendPasswordReset(email: string, link: string): Promise<void> {
  const safeLink = String(link);
  const html = `<!doctype html>
<html lang="es">
<body style="margin:0;padding:0;background:#0A0A0B;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0B;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#101012;border:1px solid #1f1f22;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:32px 32px 8px;">
          <div style="font-size:22px;font-weight:800;letter-spacing:-0.5px;background:linear-gradient(90deg,#F5A623,#FF9D2E);-webkit-background-clip:text;background-clip:text;color:#F5A623;">OTR Academy</div>
          <div style="font-size:12px;color:#A1A1AA;margin-top:2px;">By Students, For Students.</div>
        </td></tr>
        <tr><td style="padding:16px 32px 0;">
          <h1 style="margin:0 0 12px;font-size:20px;font-weight:800;color:#FFFFFF;letter-spacing:-0.3px;">Restablece tu contraseña</h1>
          <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#A1A1AA;">Recibimos una solicitud para restablecer la contraseña de tu cuenta. Haz clic en el botón para crear una nueva. Este enlace caduca en 1 hora.</p>
          <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:10px;background:linear-gradient(90deg,#F5A623,#FF9D2E);">
            <a href="${safeLink}" style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:700;color:#0A0A0B;text-decoration:none;border-radius:10px;">Restablecer contraseña</a>
          </td></tr></table>
          <p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:#71717A;">Si no solicitaste esto, puedes ignorar este correo de forma segura. Tu contraseña no cambiará.</p>
          <p style="margin:14px 0 0;font-size:11px;line-height:1.5;color:#52525B;word-break:break-all;">O copia y pega este enlace en tu navegador:<br><span style="color:#A1A1AA;">${safeLink}</span></p>
        </td></tr>
        <tr><td style="padding:24px 32px 28px;border-top:1px solid #1f1f22;margin-top:8px;">
          <div style="font-size:11px;color:#52525B;">© OTR Academy · Own the Room.</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  await sendMail({ to: email, subject: "Restablece tu contraseña · OTR Academy", html });
}
