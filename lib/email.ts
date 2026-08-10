import { Resend } from "resend"
import nodemailer from "nodemailer"
import { getServerEnv, ServerEnv } from "@/lib/env"

type AuthEmail = {
  to: string
  subject: string
  heading: string
  message: string
  actionLabel: string
  actionUrl: string
}

type SystemEmail = {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendAuthEmail(email: AuthEmail) {
  const plainText = `${email.heading}\n\n${email.message}\n\n${email.actionLabel}: ${email.actionUrl}\n\nSe você nao solicitou esta ação, ignore esta mensagem.`

  await sendEmail({
    to: email.to,
    subject: email.subject,
    text: plainText,
    html: `
      <!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${escapeHtml(email.subject)}</title>
        </head>
        <body style="margin:0;background:#f8fafc;padding:24px;font-family:Arial,Helvetica,sans-serif;color:#0f172a">
          <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;padding:28px">
            <p style="margin:0 0 18px;color:#4f46e5;font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase">Vaqen</p>
            <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25;color:#0f172a">${escapeHtml(email.heading)}</h1>
            <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#334155">${escapeHtml(email.message)}</p>
            <a href="${escapeHtml(email.actionUrl)}" style="display:inline-block;padding:12px 18px;background:#4f46e5;color:#ffffff;text-decoration:none;border-radius:999px;font-size:14px;font-weight:700">
              ${escapeHtml(email.actionLabel)}
            </a>
            <p style="margin:22px 0 0;font-size:13px;line-height:1.6;color:#64748b">
              Se o botao nao funcionar, copie e cole este link no navegador:<br />
              <span style="word-break:break-all;color:#475569">${escapeHtml(email.actionUrl)}</span>
            </p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0" />
            <p style="margin:0;color:#64748b;font-size:12px;line-height:1.6">Se você nao solicitou esta ação, ignore esta mensagem.</p>
          </div>
        </body>
      </html>
    `,
  })
}

export async function sendSystemEmail(email: SystemEmail) {
  const env = getServerEnv()

  if (env.GMAIL_SMTP_USER && env.GMAIL_SMTP_APP_PASSWORD) {
    await sendViaGmail(env, email)
    return
  }

  if (env.NODE_ENV === "production") throw new Error("Gmail SMTP nao configurado")
}

async function sendEmail(email: SystemEmail) {
  const env = getServerEnv()

  if (env.GMAIL_SMTP_USER && env.GMAIL_SMTP_APP_PASSWORD) {
    await sendViaGmail(env, email)
    return
  }

  if (env.RESEND_API_KEY) {
    await sendViaResend(env, email)
    return
  }

  if (env.NODE_ENV === "production") throw new Error("Servico de email nao configurado")
}

async function sendViaGmail(env: ServerEnv, email: SystemEmail) {
  const user = env.GMAIL_SMTP_USER
  const password = env.GMAIL_SMTP_APP_PASSWORD
  if (!user || !password) throw new Error("Gmail SMTP nao configurado")

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user,
      pass: password.replace(/\s+/g, ""),
    },
  })

  await transporter.sendMail({
    from: `Vaqen <${user}>`,
    replyTo: user,
    to: email.to,
    subject: email.subject,
    text: email.text ?? stripHtml(email.html),
    html: email.html,
    headers: {
      "X-Mailer": "Vaqen",
      "X-Priority": "3",
    },
  })
}

async function sendViaResend(env: ServerEnv, email: SystemEmail) {
  const resend = new Resend(env.RESEND_API_KEY)
  const from = env.NODE_ENV === "production"
    ? env.EMAIL_FROM
    : "Vaqen <onboarding@resend.dev>"

  const { error } = await resend.emails.send({
    from,
    to: email.to,
    subject: email.subject,
    text: email.text ?? stripHtml(email.html),
    html: email.html,
  })

  if (error) throw new Error("O provedor de email recusou o envio")
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}

function stripHtml(value: string) {
  return value
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}