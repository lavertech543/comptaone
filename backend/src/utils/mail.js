import nodemailer from 'nodemailer';

let transporter = null;
if (process.env.SMTP_HOST) {
  const port = Number(process.env.SMTP_PORT || 587);
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 8000,
    tls: {
      // En production : vérification stricte du certificat TLS du serveur SMTP (prévient les attaques MITM)
      // En développement : on tolère les certificats auto-signés
      rejectUnauthorized: process.env.NODE_ENV === 'production',
    }
  });
}

export async function sendMail(to, subject, text) {
  if (!transporter || !to) {
    console.warn('⚠️ SMTP non configuré ou destinataire manquant pour l’envoi de mail.');
    return false;
  }
  try {
    const fromAddress = process.env.MAIL_FROM || process.env.SMTP_USER || 'no-reply@nk-avicole.com';
    const info = await transporter.sendMail({
      from: `"ComptaOne SARL" <${fromAddress}>`,
      to,
      subject,
      text
    });

  } catch (e) {
    console.error(`❌ Échec d’envoi d'e-mail à ${to}:`, e.message);
    return false;
  }
}

/**
 * Déclenche l'envoi de mail en tâche de fond non-bloquante (Fire-and-Forget)
 */
export function sendMailBackground(to, subject, text) {
  setImmediate(async () => {
    try {
      await sendMail(to, subject, text);
    } catch (err) {
      console.error('❌ Erreur en arrière-plan lors de l’envoi d’email:', err.message);
    }
  });
}