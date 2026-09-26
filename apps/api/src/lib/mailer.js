const CLIENT = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

export async function sendVerificationEmail({ to, token }) {
  const link = `${CLIENT}/verify-email?token=${token}`;
  console.log('\n[mailer] ─────────────────────────────────────');
  console.log(`[mailer] To:   ${to}`);
  console.log(`[mailer] Link: ${link}`);
  console.log('[mailer] ─────────────────────────────────────\n');
}

export async function sendPasswordResetEmail({ to, token }) {
  const link = `${CLIENT}/reset-password?token=${token}`;
  console.log('\n[mailer] ─────────────────────────────────────');
  console.log(`[mailer] Password reset: ${to}`);
  console.log(`[mailer] Link:           ${link}`);
  console.log('[mailer] ─────────────────────────────────────\n');
}