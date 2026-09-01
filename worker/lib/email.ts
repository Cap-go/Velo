import type { Env } from "../types";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export async function sendEmail(env: Env, input: SendEmailInput): Promise<void> {
  const apiKey = env.RESEND_API_KEY;
  const from = env.EMAIL_FROM ?? "Capve <noreply@capve.app>";

  if (!apiKey) {
    console.log(`[email] To: ${input.to} | ${input.subject}\n${input.text}`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Email delivery failed: ${res.status} ${body}`);
  }
}

export function welcomeEmail(name: string | null, appUrl: string) {
  const greeting = name ? `Hi ${name}` : "Hi there";
  return {
    subject: "Welcome to Capve",
    text: `${greeting},\n\nYour Capve account is ready. Open your dashboard: ${appUrl}/app\n\n— Capve`,
    html: `<p>${greeting},</p><p>Your Capve account is ready. <a href="${appUrl}/app">Open your dashboard</a>.</p><p>— Capve</p>`,
  };
}

export function resetPasswordEmail(appUrl: string, token: string) {
  const link = `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;
  return {
    subject: "Reset your Capve password",
    text: `Reset your password: ${link}\n\nThis link expires in 1 hour. If you did not request this, ignore this email.\n\n— Capve`,
    html: `<p><a href="${link}">Reset your password</a></p><p>This link expires in 1 hour. If you did not request this, ignore this email.</p><p>— Capve</p>`,
  };
}
