import nodemailer from 'nodemailer';

let transporter = null;
if (process.env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } : undefined,
  });
}

export async function sendMail(to, subject, text) {
  if (!transporter || !to) return; // e-mail optionnel
  try {
    await transporter.sendMail({
      from: `"ComptaOne SARL" <${process.env.MAIL_FROM}>`,
      to,
      subject,
      text
    });
  } catch (e) {
    console.error('mail error', e.message);
  }
}