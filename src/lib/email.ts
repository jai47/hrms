import nodemailer from "nodemailer"

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

function isEmailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM)
}

function getTransporter() {
  const port = parseInt(process.env.SMTP_PORT || "587", 10)
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASSWORD
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          }
        : undefined,
  })
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  if (!isEmailConfigured()) {
    console.warn("Email not configured (SMTP_HOST / SMTP_FROM missing). Skipping send.")
    return false
  }

  try {
    const transporter = getTransporter()
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    })
    return true
  } catch (error) {
    console.error("Failed to send email:", error)
    return false
  }
}

export function getAppUrl(): string {
  return process.env.NEXTAUTH_URL || process.env.APP_URL || "http://localhost:3000"
}
