import { Env } from '../types';

interface MagicLinkEmailParams {
  email: string;
  token: string;
  expiresInMinutes: number;
}

/**
 * Send magic link email
 * Environment-aware: console log in dev, email service in production
 */
export async function sendMagicLinkEmail(
  params: MagicLinkEmailParams,
  env: Env
): Promise<void> {
  const { email, token, expiresInMinutes } = params;

  // Construct magic link URL
  const magicLinkUrl = `${env.FRONTEND_URL}/auth/verify?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`;

  // Development: Log to console
  if (env.ENVIRONMENT === 'development') {
    console.log('🔐 Magic Link Email:');
    console.log(`   To: ${email}`);
    console.log(`   URL: ${magicLinkUrl}`);
    console.log(`   Expires in: ${expiresInMinutes} minutes`);
    return;
  }

  // Production: Send via Resend (or other email service)
  if (!env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY not configured for production');
  }

  const emailBody = generateEmailHTML(magicLinkUrl, expiresInMinutes);

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.FROM_EMAIL || 'noreply@dealinsights.ai',
      to: email,
      subject: 'Your login link for DealInsights',
      html: emailBody,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Email send failed:', error);
    throw new Error('Failed to send email');
  }
}

/**
 * Generate HTML email template
 */
function generateEmailHTML(magicLinkUrl: string, expiresInMinutes: number): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">DealInsights.ai</h1>
  </div>

  <div style="background: #ffffff; padding: 40px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
    <h2 style="color: #333; margin-top: 0;">Your Login Link</h2>

    <p>Click the button below to securely log in to your account:</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${magicLinkUrl}"
         style="background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">
        Log In to DealInsights
      </a>
    </div>

    <p style="color: #666; font-size: 14px;">
      This link will expire in <strong>${expiresInMinutes} minutes</strong> and can only be used once.
    </p>

    <p style="color: #666; font-size: 14px;">
      If you didn't request this login link, you can safely ignore this email.
    </p>

    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

    <p style="color: #999; font-size: 12px; text-align: center;">
      DealInsights.ai - AI-Powered Deal Analysis
    </p>
  </div>
</body>
</html>
  `.trim();
}
