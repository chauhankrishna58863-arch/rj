import nodemailer from 'nodemailer';

const GMAIL_USER = process.env.SMTP_USER || 'blackmagicai29@gmail.com';
const GMAIL_PASS = process.env.SMTP_PASS || 'bfrouwoukppwbuce'; // Gmail App Password

export const mailTransporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // TLS via STARTTLS
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_PASS.replace(/\s+/g, '') // remove spaces from app password
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000
});

export async function sendOtpEmail(toEmail: string, userName: string, gmailOtp: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const htmlContent = `
      <div style="font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0b0f19; color: #f8fafc; border: 1px solid #1e293b; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
        <div style="background: linear-gradient(135deg, #0ea5e9 0%, #3b82f6 50%, #8b5cf6 100%); padding: 30px 20px; text-align: center;">
          <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: 1px;">⚡ BLACKMAGIC AI</h1>
          <p style="margin: 8px 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Next-Gen Multimodal AI Workstation</p>
        </div>
        
        <div style="padding: 30px 24px;">
          <h2 style="margin-top: 0; font-size: 20px; color: #38bdf8;">🔐 Gmail Security Verification Code</h2>
          <p style="color: #94a3b8; font-size: 15px; line-height: 1.6;">
            Hello <strong style="color: #f1f5f9;">${userName || 'Operative'}</strong>,
          </p>
          <p style="color: #94a3b8; font-size: 15px; line-height: 1.6;">
            We received an authentication request for your Blackmagic AI Terminal account. Use the Gmail security verification code below to authorize your session:
          </p>

          <div style="background: #131d31; border: 1px solid #1e293b; border-radius: 8px; padding: 24px; margin: 24px 0; text-align: center;">
            <div style="font-size: 12px; font-weight: 700; color: #38bdf8; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px;">
              📧 Gmail Verification OTP
            </div>
            <div style="font-family: 'Courier New', monospace; font-size: 38px; font-weight: 800; color: #ffffff; letter-spacing: 6px; margin: 8px 0;">
              ${gmailOtp}
            </div>
            <div style="font-size: 12px; color: #64748b; margin-top: 12px;">
              ⏱️ This code expires in <strong>10 minutes</strong>. Never share this code with anyone.
            </div>
          </div>

          <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
            If you did not initiate this registration or login attempt, you can safely ignore this email. No access will be granted without entering this verification code.
          </p>
        </div>

        <div style="background: #070a12; padding: 16px 24px; text-align: center; border-top: 1px solid #1e293b; font-size: 12px; color: #475569;">
          © 2026 Blackmagic AI Neural Systems. All rights reserved.
        </div>
      </div>
    `;

    const info = await mailTransporter.sendMail({
      from: `"Blackmagic AI Security" <${GMAIL_USER}>`,
      to: toEmail,
      subject: `[${gmailOtp}] Your Blackmagic AI Gmail Security OTP`,
      text: `Hello ${userName || 'Operative'},\n\nYour Gmail Verification Code is: ${gmailOtp}\n\nThis code expires in 10 minutes.\n\nBlackmagic AI Neural Systems`,
      html: htmlContent
    });

    console.log(`✉️ OTP email successfully delivered to ${toEmail}. Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err: any) {
    console.error(`❌ Failed to send OTP email to ${toEmail}:`, err.message || err);
    return { success: false, error: err.message || String(err) };
  }
}
