/**
 * Email delivery abstraction (OTP codes + transactional mail). "mock" logs
 * to the server console — safe for local development with no credentials.
 */

export interface EmailProvider {
  send(to: string, subject: string, text: string): Promise<void>;
}

class MockEmailProvider implements EmailProvider {
  async send(to: string, subject: string, text: string) {
    console.log(`[mock-email] to=${to} subject="${subject}"\n${text}`);
  }
}

class ResendEmailProvider implements EmailProvider {
  async send(to: string, subject: string, text: string) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error("RESEND_API_KEY is not configured");

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM ?? "Jyoti AI <no-reply@jyoti.ai>",
        to,
        subject,
        text,
      }),
    });

    if (!res.ok) throw new Error(`Resend send failed: ${res.status}`);
  }
}

class SmtpEmailProvider implements EmailProvider {
  async send(_to: string, _subject: string, _text: string) {
    // Kept dependency-free: wire up nodemailer here if SMTP is your chosen
    // transport. Left as an explicit not-implemented so misconfiguration
    // fails loudly instead of silently dropping mail.
    throw new Error(
      "SMTP email provider is not wired up yet. Install nodemailer and implement SmtpEmailProvider.send(), " +
        "or set EMAIL_PROVIDER=resend / EMAIL_PROVIDER=mock."
    );
  }
}

export function getEmailProvider(): EmailProvider {
  switch (process.env.EMAIL_PROVIDER) {
    case "resend":
      return new ResendEmailProvider();
    case "smtp":
      return new SmtpEmailProvider();
    default:
      return new MockEmailProvider();
  }
}
