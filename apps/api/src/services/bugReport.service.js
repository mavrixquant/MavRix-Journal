import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/error.js';
import { sendBugReportEmail } from '../lib/mailer.js';

const VALID_CATEGORIES = ['bug', 'feature', 'performance', 'other'];
const VALID_SEVERITIES = ['low', 'medium', 'high', 'critical'];

const MAX_TITLE = 200;
const MAX_DESCRIPTION = 5000;
const MAX_PAGE_URL = 1000;
const MAX_USER_AGENT = 500;

// Image limits: 4 MB raw (~5.4 MB after base64). Backend defends against
// larger payloads even though the frontend caps this too.
const MAX_IMAGE_BASE64_LEN = 6 * 1024 * 1024; // ~6 MB base64 string

function trimOrNull(value, max) {
  if (value == null) return null;
  const s = String(value).trim();
  if (!s) return null;
  return s.slice(0, max);
}

function serialize(report) {
  return {
    id: report.id,
    userId: report.userId,
    title: report.title,
    description: report.description,
    category: report.category,
    severity: report.severity,
    status: report.status,
    pageUrl: report.pageUrl,
    userAgent: report.userAgent,
    adminNote: report.adminNote,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
  };
}

export async function createReport(userId, payload, req) {
  const raw = payload || {};

  const title = String(raw.title || '').trim();
  const description = String(raw.description || '').trim();

  if (title.length < 3) {
    throw new HttpError(400, 'Title must be at least 3 characters.');
  }
  if (title.length > MAX_TITLE) {
    throw new HttpError(400, `Title must be ${MAX_TITLE} characters or fewer.`);
  }
  if (description.length < 10) {
    throw new HttpError(400, 'Description must be at least 10 characters.');
  }
  if (description.length > MAX_DESCRIPTION) {
    throw new HttpError(400, `Description must be ${MAX_DESCRIPTION} characters or fewer.`);
  }

  let category = String(raw.category || 'bug').trim().toLowerCase();
  if (!VALID_CATEGORIES.includes(category)) category = 'bug';

  let severity = String(raw.severity || 'medium').trim().toLowerCase();
  if (!VALID_SEVERITIES.includes(severity)) severity = 'medium';

  const pageUrl = trimOrNull(raw.pageUrl, MAX_PAGE_URL);

  const userAgent =
    trimOrNull(req?.headers?.['user-agent'], MAX_USER_AGENT) ||
    trimOrNull(raw.userAgent, MAX_USER_AGENT);

  // Optional image — validated but NEVER persisted (email only).
  let image = null;
  if (raw.image && typeof raw.image === 'object' && raw.image.base64) {
    const b64 = String(raw.image.base64);
    if (b64.length > MAX_IMAGE_BASE64_LEN) {
      throw new HttpError(400, 'Screenshot too large. Please keep it under 4 MB.');
    }
    const name = String(raw.image.name || 'screenshot.png').slice(0, 120);
    if (!/^[a-z0-9_\-. ]+$/i.test(name)) {
      throw new HttpError(400, 'Invalid screenshot filename.');
    }
    image = { base64: b64, name };
  }

  const report = await prisma.bugReport.create({
    data: {
      userId,
      title,
      description,
      category,
      severity,
      status: 'open',
      pageUrl,
      userAgent,
    },
  });

  // Fetch the user for the email envelope
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, firstName: true, lastName: true, role: true },
  });

  // Fire-and-forget the email. Persist the report regardless of email outcome.
  sendBugReportEmail({
    user,
    report,
    image,
    pageUrl,
    userAgent,
  }).catch((err) => {
    console.error('[bug-report] email failed:', err?.message || err);
  });

  return serialize(report);
}