/**
 * SMS/OTP delivery abstraction. Swap providers via OTP_PROVIDER without
 * touching call sites. "mock" logs to the server console and never makes an
 * outbound call — safe for local development with no credentials.
 */

export interface SmsProvider {
  sendOtp(phone: string, code: string): Promise<void>;
}

class MockSmsProvider implements SmsProvider {
  async sendOtp(phone: string, code: string) {
    console.log(`[mock-sms] OTP for ${phone}: ${code}`);
  }
}

class TwilioSmsProvider implements SmsProvider {
  async sendOtp(phone: string, code: string) {
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_FROM_NUMBER;
    if (!sid || !token || !from) throw new Error("Twilio credentials are not configured");

    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: phone,
        From: from,
        Body: `Your Prerna AI verification code is ${code}. It expires in a few minutes.`,
      }),
    });

    if (!res.ok) throw new Error(`Twilio send failed: ${res.status}`);
  }
}

class Msg91SmsProvider implements SmsProvider {
  async sendOtp(phone: string, code: string) {
    const authKey = process.env.MSG91_AUTH_KEY;
    const templateId = process.env.MSG91_TEMPLATE_ID;
    if (!authKey || !templateId) throw new Error("MSG91 credentials are not configured");

    const res = await fetch("https://control.msg91.com/api/v5/otp", {
      method: "POST",
      headers: { authkey: authKey, "Content-Type": "application/json" },
      body: JSON.stringify({ template_id: templateId, mobile: phone, otp: code }),
    });

    if (!res.ok) throw new Error(`MSG91 send failed: ${res.status}`);
  }
}

export function getSmsProvider(): SmsProvider {
  switch (process.env.OTP_PROVIDER) {
    case "twilio":
      return new TwilioSmsProvider();
    case "msg91":
      return new Msg91SmsProvider();
    default:
      return new MockSmsProvider();
  }
}
