const { Resend } = require('resend');
const config = require('../config');
const logger = require('../utils/logger');

const resend = config.RESEND_API_KEY ? new Resend(config.RESEND_API_KEY) : null;

async function sendVerificationEmail(email, name, token) {
  if (!resend) {
    logger.warn('Resend not configured — skipping verification email');
    return;
  }

  const verifyUrl = `${config.APP_URL}/auth/verify-email?token=${token}`;

  await resend.emails.send({
    from: config.FROM_EMAIL,
    to: email,
    subject: 'Verify your Scrave account',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
        <h2 style="color:#7c3aed;">Welcome to Scrave, ${name}!</h2>
        <p>Click the button below to verify your email and activate your account.</p>
        <a href="${verifyUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#7c3aed,#06b6d4);color:#fff;text-decoration:none;border-radius:10px;font-weight:600;margin:20px 0;">Verify Email</a>
        <p style="color:#666;font-size:14px;">Or copy this link: ${verifyUrl}</p>
        <p style="color:#999;font-size:12px;margin-top:32px;">If you didn't create an account, ignore this email.</p>
      </div>
    `,
  });

  logger.info(`Verification email sent to ${email}`);
}

async function sendPasswordResetEmail(email, name, token) {
  if (!resend) {
    logger.warn('Resend not configured — skipping reset email');
    return;
  }

  const resetUrl = `${config.APP_URL}/reset-password.html?token=${token}`;

  await resend.emails.send({
    from: config.FROM_EMAIL,
    to: email,
    subject: 'Reset your Scrave password',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;">
        <h2 style="color:#7c3aed;">Password Reset</h2>
        <p>Hi ${name || 'there'}, we received a request to reset your password.</p>
        <a href="${resetUrl}" style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#7c3aed,#06b6d4);color:#fff;text-decoration:none;border-radius:10px;font-weight:600;margin:20px 0;">Reset Password</a>
        <p style="color:#666;font-size:14px;">Or copy this link: ${resetUrl}</p>
        <p style="color:#666;font-size:14px;">This link expires in 1 hour.</p>
        <p style="color:#999;font-size:12px;margin-top:32px;">If you didn't request this, ignore this email. Your password won't change.</p>
      </div>
    `,
  });

  logger.info(`Password reset email sent to ${email}`);
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
