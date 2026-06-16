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

/** Correo de recuperación de contraseña con branding OTR (claro · negro/verde de marca,
    espejo del Aula). Los emails no soportan CSS vars: hex literal = la paleta OTRBRANDBOOK
    (crema #F7F7ED · negro #0C0C0C · verde #2CAA20). Nunca lanza. */
export async function sendPasswordReset(email: string, link: string): Promise<void> {
  const safeLink = String(link);
  const html = `<!doctype html>
<html lang="es">
<body style="margin:0;padding:0;background:#F7F7ED;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F7ED;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#FFFFFF;border:1px solid #E4E4D9;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:28px 32px;background:#0C0C0C;">
          <div style="font-size:22px;font-weight:800;letter-spacing:-0.5px;color:#FFFFFF;">OTR Academy</div>
          <div style="font-size:12px;color:#54C247;margin-top:2px;">By Students, For Students.</div>
        </td></tr>
        <tr><td style="padding:24px 32px 0;">
          <h1 style="margin:0 0 12px;font-size:20px;font-weight:800;color:#0C0C0C;letter-spacing:-0.3px;">Restablece tu contraseña</h1>
          <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#44443D;">Recibimos una solicitud para restablecer la contraseña de tu cuenta. Haz clic en el botón para crear una nueva. Este enlace caduca en 1 hora.</p>
          <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:10px;background:#1E8C16;">
            <a href="${safeLink}" style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:10px;">Restablecer contraseña</a>
          </td></tr></table>
          <p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:#5F5F56;">Si no solicitaste esto, puedes ignorar este correo de forma segura. Tu contraseña no cambiará.</p>
          <p style="margin:14px 0 0;font-size:11px;line-height:1.5;color:#89897D;word-break:break-all;">O copia y pega este enlace en tu navegador:<br><span style="color:#44443D;">${safeLink}</span></p>
        </td></tr>
        <tr><td style="padding:24px 32px 28px;border-top:1px solid #E4E4D9;margin-top:8px;">
          <div style="font-size:11px;color:#89897D;">© OTR Academy · Own the Room.</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  await sendMail({ to: email, subject: "Restablece tu contraseña · OTR Academy", html });
}
