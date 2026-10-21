# =============================================================================
# MAVRIX: ADD USERNAME SYSTEM + HIDE EMAILS IN CHAT
# Pure ASCII script. Run from repo root (C:\MavRixProjects\mavrix-journal).
# =============================================================================
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$U8 = New-Object System.Text.UTF8Encoding($false)

function WF([string]$path, [string]$content) {
    $full = [System.IO.Path]::Combine((Get-Location).Path, $path)
    $dir  = [System.IO.Path]::GetDirectoryName($full)
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    [System.IO.File]::WriteAllText($full, $content, $U8)
    Write-Host "  W $path" -ForegroundColor Green
}

function AF([string]$path, [string]$content) {
    $full = [System.IO.Path]::Combine((Get-Location).Path, $path)
    if (-not (Test-Path $full)) { throw "Missing: $path" }
    $existing = [System.IO.File]::ReadAllText($full, $U8)
    if ($existing.Contains($content.TrimEnd())) {
        Write-Host "  SKIP (already present): $path" -ForegroundColor Yellow
        return
    }
    $sep = if ($existing.EndsWith("`n")) { "" } else { "`n" }
    [System.IO.File]::AppendAllText($full, $sep + $content, $U8)
    Write-Host "  A $path" -ForegroundColor Green
}

function RF([string]$path, [string]$old, [string]$new) {
    $full = [System.IO.Path]::Combine((Get-Location).Path, $path)
    if (-not (Test-Path $full)) { throw "Missing file: $path" }
    $c = [System.IO.File]::ReadAllText($full, $U8)
    if (-not $c.Contains($old)) {
        Write-Host "  SKIP (pattern not found): $path" -ForegroundColor Yellow
        return
    }
    $c = $c.Replace($old, $new)
    [System.IO.File]::WriteAllText($full, $c, $U8)
    Write-Host "  R $path" -ForegroundColor Green
}

function Step([string]$msg) { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }

# =============================================================================
# PHASE 1 - Prisma schema + migration
# =============================================================================
Step "PHASE 1 - Prisma schema + migration"

$old = @'
  isAi Boolean @default(false)
'@
$new = @'
  isAi Boolean @default(false)

  username String? @unique
'@
RF "apps/api/prisma/schema.prisma" $old $new

$sql = @'
/* Add nullable unique username to users. */
ALTER TABLE "users" ADD COLUMN "username" TEXT;
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
'@
WF "apps/api/prisma/migrations/20261202120000_add_username/migration.sql" $sql

# =============================================================================
# PHASE 2 - Shared validators + constants
# =============================================================================
Step "PHASE 2 - Shared validators + constants"

$old = @'
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(128),
});
'@
$new = @'
export const loginSchema = z.object({
  identifier: z.string().trim().min(3).max(320),
  password: z.string().min(1).max(128),
});

export const setUsernameSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be 30 characters or fewer')
    .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, digits, and underscores')
    .transform(function (s) { return s.toLowerCase(); }),
});

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,30}$/, 'Username must be 3-30 chars: a-z, 0-9, _');
'@
RF "packages/shared/src/validators.js" $old $new

$old = @'
export const MAX_LAYOUTS = 3;
'@
$new = @'
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 30;
export const USERNAME_REGEX = /^[a-z0-9_]{3,30}$/;
export const MAX_LAYOUTS = 3;
'@
RF "packages/shared/src/constants.js" $old $new

# =============================================================================
# PHASE 3 - Backend auth (service / controller / route)
# =============================================================================
Step "PHASE 3 - Backend auth"

$old = @'
const publicUser = (u) => ({
  id: u.id,
  email: u.email,
'@
$new = @'
const publicUser = (u) => ({
  id: u.id,
  email: u.email,
  username: u.username ?? null,
'@
RF "apps/api/src/services/auth.service.js" $old $new

$old = @'
export async function login({ email, password }) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    throw new HttpError(401, 'Invalid email or password');
  }
'@
$new = @'
export async function login({ identifier, password }) {
  const id = String(identifier || '').trim().toLowerCase();
  if (!id) throw new HttpError(400, 'Email or username is required');
  const user = id.includes('@')
    ? await prisma.user.findUnique({ where: { email: id } })
    : await prisma.user.findUnique({ where: { username: id } });
  if (!user || !user.passwordHash) {
    throw new HttpError(401, 'Invalid credentials');
  }
'@
RF "apps/api/src/services/auth.service.js" $old $new

$old = @'
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) throw new HttpError(401, 'Invalid email or password');
'@
$new = @'
  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) throw new HttpError(401, 'Invalid credentials');
'@
RF "apps/api/src/services/auth.service.js" $old $new

$append = @'

export async function setUsername(userId, username) {
  const clean = String(username || '').trim().toLowerCase();
  if (!/^[a-z0-9_]{3,30}$/.test(clean)) {
    throw new HttpError(
      400,
      'Username must be 3-30 characters and contain only lowercase letters, digits, or underscores'
    );
  }
  const clash = await prisma.user.findUnique({ where: { username: clean } });
  if (clash && clash.id !== userId) {
    throw new HttpError(409, 'That username is already taken');
  }
  const user = await prisma.user.update({
    where: { id: userId },
    data: { username: clean },
  });
  return publicUser(user);
}
'@
AF "apps/api/src/services/auth.service.js" $append

$append = @'

export async function setUsername(req, res, next) {
  try {
    const { username } = req.body;
    const user = await authService.setUsername(req.userId, username);
    res.json({ user });
  } catch (e) { next(e); }
}
'@
AF "apps/api/src/controllers/auth.controller.js" $append

$old = @'
import { signupSchema, loginSchema } from '@mavrix/shared/validators';
'@
$new = @'
import { signupSchema, loginSchema, setUsernameSchema } from '@mavrix/shared/validators';
'@
RF "apps/api/src/routes/auth.routes.js" $old $new

$old = @'
authRoutes.post('/login', validate(loginSchema), authController.login);
'@
$new = @'
authRoutes.post('/login', validate(loginSchema), authController.login);
authRoutes.post('/set-username', requireAuth, validate(setUsernameSchema), authController.setUsername);
'@
RF "apps/api/src/routes/auth.routes.js" $old $new

# =============================================================================
# PHASE 4 - Backend chat/friends (hide emails, use username)
# =============================================================================
Step "PHASE 4 - Backend chat/friends"

$old = @'
const PUBLIC_USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  photoUrl: true,
  isAi: true,
};
'@
$new = @'
const PUBLIC_USER_SELECT = {
  id: true,
  username: true,
  firstName: true,
  lastName: true,
  photoUrl: true,
  isAi: true,
};
'@
RF "apps/api/src/services/chat.service.js" $old $new

$old = @'
  return {
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    photoUrl: u.photoUrl,
    isAi: !!u.isAi,
  };
'@
$new = @'
  return {
    id: u.id,
    username: u.username,
    firstName: u.firstName,
    lastName: u.lastName,
    photoUrl: u.photoUrl,
    isAi: !!u.isAi,
  };
'@
RF "apps/api/src/services/chat.service.js" $old $new

$old = @'
  return friends
    .filter((f) => {
      const name = `${f.firstName || ''} ${f.lastName || ''}`.trim().toLowerCase();
      const email = (f.email || '').toLowerCase();
      return email.includes(q2) || (name && name.includes(q2));
    })
    .slice(0, 20);
'@
$new = @'
  return friends
    .filter((f) => {
      const name = `${f.firstName || ''} ${f.lastName || ''}`.trim().toLowerCase();
      const uname = (f.username || '').toLowerCase();
      return uname.includes(q2) || (name && name.includes(q2));
    })
    .slice(0, 20);
'@
RF "apps/api/src/services/chat.service.js" $old $new

$old = @'
const PUBLIC_USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  photoUrl: true,
};
'@
$new = @'
const PUBLIC_USER_SELECT = {
  id: true,
  username: true,
  firstName: true,
  lastName: true,
  photoUrl: true,
};
'@
RF "apps/api/src/services/friends.service.js" $old $new

$old = @'
  return {
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    photoUrl: u.photoUrl,
  };
'@
$new = @'
  return {
    id: u.id,
    username: u.username,
    firstName: u.firstName,
    lastName: u.lastName,
    photoUrl: u.photoUrl,
  };
'@
RF "apps/api/src/services/friends.service.js" $old $new

$old = @'
export async function sendFriendRequest(userId, { toUserId, email, message }) {
  let targetId = toUserId || null;
  if (!targetId && email) {
    const byEmail = await prisma.user.findUnique({
      where: { email: String(email).trim().toLowerCase() },
      select: { id: true },
    });
    if (!byEmail) throw new HttpError(404, 'No user found with that email address');
    targetId = byEmail.id;
  }
  if (!targetId) throw new HttpError(400, 'toUserId or email is required');
'@
$new = @'
export async function sendFriendRequest(userId, { toUserId, username, message }) {
  let targetId = toUserId || null;
  if (!targetId && username) {
    const byUsername = await prisma.user.findUnique({
      where: { username: String(username).trim().toLowerCase() },
      select: { id: true },
    });
    if (!byUsername) throw new HttpError(404, 'No user found with that username');
    targetId = byUsername.id;
  }
  if (!targetId) throw new HttpError(400, 'toUserId or username is required');
'@
RF "apps/api/src/services/friends.service.js" $old $new

$old = @'
const sendRequestSchema = z
  .object({
    toUserId: z.string().min(1).max(64).optional(),
    email: z.string().trim().toLowerCase().email().max(320).optional(),
    message: z.string().trim().max(500).optional(),
  })
  .refine((d) => !!(d.toUserId || d.email), {
    message: 'Either toUserId or email is required',
  })
  .refine((d) => !(d.toUserId && d.email), {
    message: 'Provide either toUserId or email, not both',
  });
'@
$new = @'
const sendRequestSchema = z
  .object({
    toUserId: z.string().min(1).max(64).optional(),
    username: z.string().trim().toLowerCase().min(3).max(30).optional(),
    message: z.string().trim().max(500).optional(),
  })
  .refine((d) => !!(d.toUserId || d.username), {
    message: 'Either toUserId or username is required',
  })
  .refine((d) => !(d.toUserId && d.username), {
    message: 'Provide either toUserId or username, not both',
  });
'@
RF "apps/api/src/routes/friends.routes.js" $old $new

# =============================================================================
# PHASE 5 - Backend admin
# =============================================================================
Step "PHASE 5 - Backend admin"

$old = @'
  id: u.id,
  email: u.email,
  firstName: u.firstName,
'@
$new = @'
  id: u.id,
  email: u.email,
  username: u.username,
  firstName: u.firstName,
'@
RF "apps/api/src/services/admin.service.js" $old $new

$old = @'
  if (q) {
    where.OR = [
      { email: { contains: q, mode: 'insensitive' } },
      { firstName: { contains: q, mode: 'insensitive' } },
      { lastName: { contains: q, mode: 'insensitive' } },
    ];
  }
'@
$new = @'
  if (q) {
    where.OR = [
      { email: { contains: q, mode: 'insensitive' } },
      { username: { contains: q, mode: 'insensitive' } },
      { firstName: { contains: q, mode: 'insensitive' } },
      { lastName: { contains: q, mode: 'insensitive' } },
    ];
  }
'@
RF "apps/api/src/services/admin.service.js" $old $new

$old = @'
  if (patch.firstName !== undefined) data.firstName = String(patch.firstName).trim();
'@
$new = @'
  if (patch.username !== undefined) {
    const next = String(patch.username).trim().toLowerCase();
    if (!/^[a-z0-9_]{3,30}$/.test(next)) {
      throw new HttpError(400, 'Username must be 3-30 chars: a-z, 0-9, _');
    }
    if (next !== target.username) {
      const clash = await prisma.user.findUnique({ where: { username: next } });
      if (clash && clash.id !== targetId) throw new HttpError(409, 'Username already taken');
      data.username = next;
    }
  }

  if (patch.firstName !== undefined) data.firstName = String(patch.firstName).trim();
'@
RF "apps/api/src/services/admin.service.js" $old $new

$old = @'
function serializePublicUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    firstName: u.firstName,
    lastName: u.lastName,
    photoUrl: u.photoUrl,
  };
}
'@
$new = @'
function serializePublicUser(u) {
  if (!u) return null;
  return {
    id: u.id,
    email: u.email,
    username: u.username,
    firstName: u.firstName,
    lastName: u.lastName,
    photoUrl: u.photoUrl,
  };
}
'@
RF "apps/api/src/services/adminGroups.service.js" $old $new

$old = @'
const userUpdateSchema = z.object({
  firstName: z.string().trim().max(60).optional(),
  lastName: z.string().trim().max(60).optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  role: z.enum(['user', 'admin', 'superadmin']).optional(),
});
'@
$new = @'
const userUpdateSchema = z.object({
  firstName: z.string().trim().max(60).optional(),
  lastName: z.string().trim().max(60).optional(),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_]+$/)
    .optional(),
  email: z.string().trim().toLowerCase().email().optional(),
  role: z.enum(['user', 'admin', 'superadmin']).optional(),
});
'@
RF "apps/api/src/routes/admin.routes.js" $old $new

$old = @'
async function ensureOnePersona(meta) {
'@
$new = @'
const AI_USERNAMES = {
  guide: 'mave_guide',
  trainer: 'mave_trainer',
  chat: 'mave_ai',
};

async function ensureOnePersona(meta) {
'@
RF "apps/api/src/services/maveAiBootstrap.js" $old $new

$old = @'
        isAi: true,
        role: 'ai',
        emailVerified: true,
'@
$new = @'
        isAi: true,
        role: 'ai',
        emailVerified: true,
        username: AI_USERNAMES[meta.id] || null,
'@
RF "apps/api/src/services/maveAiBootstrap.js" $old $new

$old = @'
  if (user.lastName !== meta.lastName) patch.lastName = meta.lastName;
'@
$new = @'
  if (user.lastName !== meta.lastName) patch.lastName = meta.lastName;
  if (!user.username) patch.username = AI_USERNAMES[meta.id] || null;
'@
RF "apps/api/src/services/maveAiBootstrap.js" $old $new

# =============================================================================
# PHASE 6 - Frontend auth
# =============================================================================
Step "PHASE 6 - Frontend auth"

$old = @'
  const displayName =
    [u.firstName, u.lastName].filter(Boolean).join(' ').trim() ||
    u.email ||
    'User';
'@
$new = @'
  const displayName =
    [u.firstName, u.lastName].filter(Boolean).join(' ').trim() ||
    u.username ||
    u.email ||
    'User';
'@
RF "apps/web/src/features/auth/api.js" $old $new

$old = @'
    email: u.email,
    firstName: u.firstName,
'@
$new = @'
    email: u.email,
    username: u.username ?? null,
    hasUsername: !!u.username,
    firstName: u.firstName,
'@
RF "apps/web/src/features/auth/api.js" $old $new

$old = @'
export async function login({ email, password }) {
  const data = await apiJson('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setAccessToken(data.accessToken);
  return { user: normalizeUser(data.user) };
}
'@
$new = @'
export async function login({ identifier, password }) {
  const data = await apiJson('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
  });
  setAccessToken(data.accessToken);
  return { user: normalizeUser(data.user) };
}
'@
RF "apps/web/src/features/auth/api.js" $old $new

$append = @'

export async function setUsername(username) {
  const data = await apiJson('/api/auth/set-username', {
    method: 'POST',
    body: JSON.stringify({ username }),
  });
  return normalizeUser(data.user);
}
'@
AF "apps/web/src/features/auth/api.js" $append

$old = @'
export function RequireVerified({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <BootLoader label="Authenticating" />;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.emailVerified) return <Navigate to="/verify-email" replace />;

  return children;
}
'@
$new = @'
export function RequireVerified({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <BootLoader label="Authenticating" />;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.emailVerified) return <Navigate to="/verify-email" replace />;
  if (!user.username) return <Navigate to="/set-username" replace />;

  return children;
}
'@
RF "apps/web/src/app/router/guards.jsx" $old $new

$old = @'
  if (!user.emailVerified) {
    if (import.meta.env.PROD) {
      // eslint-disable-next-line no-console
      console.warn('[admin-guard] email not verified -> /verify-email');
    }
    return <Navigate to="/verify-email" replace />;
  }

  if (!ADMIN_ROLES.has(user.role)) {
'@
$new = @'
  if (!user.emailVerified) {
    if (import.meta.env.PROD) {
      // eslint-disable-next-line no-console
      console.warn('[admin-guard] email not verified -> /verify-email');
    }
    return <Navigate to="/verify-email" replace />;
  }

  if (!user.username) {
    if (import.meta.env.PROD) {
      // eslint-disable-next-line no-console
      console.warn('[admin-guard] no username -> /set-username');
    }
    return <Navigate to="/set-username" replace />;
  }

  if (!ADMIN_ROLES.has(user.role)) {
'@
RF "apps/web/src/features/admin/guards.jsx" $old $new

$old = @'
  if (!user.emailVerified) {
    if (import.meta.env.PROD) {
      // eslint-disable-next-line no-console
      console.warn('[superadmin-guard] email not verified -> /verify-email');
    }
    return <Navigate to="/verify-email" replace />;
  }

  if (user.role !== 'superadmin') {
'@
$new = @'
  if (!user.emailVerified) {
    if (import.meta.env.PROD) {
      // eslint-disable-next-line no-console
      console.warn('[superadmin-guard] email not verified -> /verify-email');
    }
    return <Navigate to="/verify-email" replace />;
  }

  if (!user.username) {
    if (import.meta.env.PROD) {
      // eslint-disable-next-line no-console
      console.warn('[superadmin-guard] no username -> /set-username');
    }
    return <Navigate to="/set-username" replace />;
  }

  if (user.role !== 'superadmin') {
'@
RF "apps/web/src/features/admin/guards.jsx" $old $new

$old = @'
const VerifyEmail = lazy(() => import('@/features/auth/pages/VerifyEmailPage'));
'@
$new = @'
const VerifyEmail = lazy(() => import('@/features/auth/pages/VerifyEmailPage'));
const SetUsername = lazy(() => import('@/features/auth/pages/SetUsernamePage'));
'@
RF "apps/web/src/app/router/routes.jsx" $old $new

$old = @'
  if (!user.emailVerified) return <Navigate to="/verify-email" replace />;

  if (user.role === 'admin' || user.role === 'superadmin') {
    return <Navigate to="/admin" replace />;
  }
'@
$new = @'
  if (!user.emailVerified) return <Navigate to="/verify-email" replace />;
  if (!user.username) return <Navigate to="/set-username" replace />;

  if (user.role === 'admin' || user.role === 'superadmin') {
    return <Navigate to="/admin" replace />;
  }
'@
RF "apps/web/src/app/router/routes.jsx" $old $new

$old = @'
      <Route path="/verify-email" element={<RequireAuth><VerifyEmail /></RequireAuth>} />
'@
$new = @'
      <Route path="/verify-email" element={<RequireAuth><VerifyEmail /></RequireAuth>} />
      <Route path="/set-username" element={<RequireAuth><SetUsername /></RequireAuth>} />
'@
RF "apps/web/src/app/router/routes.jsx" $old $new

$old = @'
        if (updated?.emailVerified) {
          setStatus('Email verified. Redirecting...');
          navigate('/journal', { replace: true });
        }
'@
$new = @'
        if (updated?.emailVerified) {
          setStatus('Email verified. Redirecting...');
          if (!updated.username) {
            navigate('/set-username', { replace: true });
          } else {
            navigate('/journal', { replace: true });
          }
        }
'@
RF "apps/web/src/features/auth/pages/VerifyEmailPage.jsx" $old $new

$old = @'
import { Mail, Lock } from 'lucide-react';
'@
$new = @'
import { AtSign, Lock } from 'lucide-react';
'@
RF "apps/web/src/features/auth/pages/LoginPage.jsx" $old $new

$old = @'
    defaultValues: { email: '', password: '' },
'@
$new = @'
    defaultValues: { identifier: '', password: '' },
'@
RF "apps/web/src/features/auth/pages/LoginPage.jsx" $old $new

$old = @'
        <AuthField
          icon={Mail}
          type="email"
          placeholder="Email address"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
'@
$new = @'
        <AuthField
          icon={AtSign}
          type="text"
          placeholder="Email or username"
          autoComplete="username"
          error={errors.identifier?.message}
          {...register('identifier')}
        />
'@
RF "apps/web/src/features/auth/pages/LoginPage.jsx" $old $new

$newPage = @'
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AtSign } from 'lucide-react';
import { setUsernameSchema } from '@mavrix/shared/validators';

import { useAuth } from '@/app/providers/AuthProvider';
import * as authService from '@/features/auth/api';
import AuthLayout from '../components/AuthLayout';
import AuthField from '../components/AuthField';
import AuthButton from '../components/AuthButton';

export default function SetUsernamePage() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm({
    resolver: zodResolver(setUsernameSchema),
    defaultValues: { username: '' },
  });

  const onSubmit = async ({ username }) => {
    try {
      await authService.setUsername(username);
      await refreshUser();
      navigate('/', { replace: true });
    } catch (err) {
      setError('username', { message: err?.message || 'Could not set username' });
    }
  };

  return (
    <AuthLayout
      eyebrow="Almost there"
      title="Choose your username"
      subtitle={
        user?.email
          ? 'One more step for ' + user.email + '. Your username is how others find you.'
          : 'Your username is how others find you.'
      }
      showBackLink={false}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <AuthField
          icon={AtSign}
          type="text"
          placeholder="username (3-30 chars, a-z 0-9 _)"
          autoComplete="username"
          autoFocus
          error={errors.username?.message}
          {...register('username')}
        />
        <p
          style={{
            margin: '0 0 14px',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 11,
            lineHeight: 1.6,
            color: '#8892A3',
            letterSpacing: '.01em',
          }}
        >
          Lowercase letters, digits, and underscores only. Cannot be changed to
          an existing name.
        </p>
        <AuthButton type="submit" loading={isSubmitting} disabled={isSubmitting}>
          Continue
        </AuthButton>
      </form>
    </AuthLayout>
  );
}
'@
WF "apps/web/src/features/auth/pages/SetUsernamePage.jsx" $newPage

# =============================================================================
# PHASE 7 - Frontend chat components (email -> username)
# =============================================================================
Step "PHASE 7 - Frontend chat components"

$chatFiles = @(
    "apps/web/src/features/personal/chats/components/ChatHeader.jsx",
    "apps/web/src/features/personal/chats/components/ConversationRow.jsx",
    "apps/web/src/features/personal/chats/components/FriendsTab.jsx",
    "apps/web/src/features/personal/chats/components/FriendRequestsPanel.jsx",
    "apps/web/src/features/personal/chats/components/DmProfilePanel.jsx",
    "apps/web/src/features/personal/chats/components/GroupProfilePanel.jsx",
    "apps/web/src/features/personal/chats/components/MemberProfilePopover.jsx",
    "apps/web/src/features/personal/chats/components/MessageBubble.jsx",
    "apps/web/src/features/personal/chats/components/MessageList.jsx",
    "apps/web/src/features/personal/chats/components/MessageComposer.jsx",
    "apps/web/src/features/personal/chats/components/BlockConfirmModal.jsx",
    "apps/web/src/features/personal/chats/components/NewChatModal.jsx"
)

foreach ($f in $chatFiles) {
    $full = [System.IO.Path]::Combine((Get-Location).Path, $f)
    if (-not (Test-Path $full)) { Write-Host "  SKIP (missing): $f" -ForegroundColor Yellow; continue }
    $c = [System.IO.File]::ReadAllText($full, $U8)
    $orig = $c
    $c = $c.Replace("if (user.email) return user.email.slice(0, 2).toUpperCase();", "if (user.username) return user.username.slice(0, 2).toUpperCase();`n  if (user.email) return user.email.slice(0, 2).toUpperCase();")
    $c = $c.Replace("if (u.email) return u.email.slice(0, 2).toUpperCase();", "if (u.username) return u.username.slice(0, 2).toUpperCase();`n  if (u.email) return u.email.slice(0, 2).toUpperCase();")
    $c = $c.Replace("return user.email || 'Unknown';", "return user.username || 'Unknown';")
    $c = $c.Replace("return u.email || 'Unknown';", "return u.username || 'Unknown';")
    if ($c -ne $orig) {
        [System.IO.File]::WriteAllText($full, $c, $U8)
        Write-Host "  R $f" -ForegroundColor Green
    } else {
        Write-Host "  SKIP (no change): $f" -ForegroundColor Yellow
    }
}

$old = @'
    if (isAi) return 'AI Assistant';
    return peer?.email || '';
'@
$new = @'
    if (isAi) return 'AI Assistant';
    if (peer?.username) return '@' + peer.username;
    return '';
'@
RF "apps/web/src/features/personal/chats/components/ChatHeader.jsx" $old $new

$old = @'
    : `${c.peer?.firstName || ''} ${c.peer?.lastName || ''} ${c.peer?.email || ''}`.toLowerCase();
'@
$new = @'
    : `${c.peer?.firstName || ''} ${c.peer?.lastName || ''} ${c.peer?.username || ''}`.toLowerCase();
'@
RF "apps/web/src/features/personal/chats/components/ConversationRow.jsx" $old $new

$old = @'
            <div className="panel-email">
              <Mail size={11} /> <span>{peer.email}</span>
            </div>
'@
$new = @'
            <div className="panel-email">
              <Mail size={11} /> <span>{peer.username ? '@' + peer.username : 'no username'}</span>
            </div>
'@
RF "apps/web/src/features/personal/chats/components/DmProfilePanel.jsx" $old $new

$old = @'
                      <span className="panel-member-email">
                        {m.user?.email}
                      </span>
'@
$new = @'
                      <span className="panel-member-email">
                        {m.user?.username ? '@' + m.user.username : ''}
                      </span>
'@
RF "apps/web/src/features/personal/chats/components/GroupProfilePanel.jsx" $old $new

$old = @'
                          <span className="panel-member-email">{u.email}</span>
'@
$new = @'
                          <span className="panel-member-email">{u.username ? '@' + u.username : ''}</span>
'@
RF "apps/web/src/features/personal/chats/components/GroupProfilePanel.jsx" $old $new

$old = @'
              <div className="mpp-email">
                <Mail size={10} />
                <span>{peer.email}</span>
              </div>
'@
$new = @'
              <div className="mpp-email">
                <Mail size={10} />
                <span>{peer.username ? '@' + peer.username : '—'}</span>
              </div>
'@
RF "apps/web/src/features/personal/chats/components/MemberProfilePopover.jsx" $old $new

$old = @'
                  <div className="pane-row-sub">{friend.email}</div>
'@
$new = @'
                  <div className="pane-row-sub">{friend.username ? '@' + friend.username : 'no username'}</div>
'@
RF "apps/web/src/features/personal/chats/components/FriendsTab.jsx" $old $new

$old = @'
                        {req.fromUser?.email} · Sent {relativeTime(req.createdAt)}
'@
$new = @'
                        {req.fromUser?.username ? '@' + req.fromUser.username : 'no username'} · Sent {relativeTime(req.createdAt)}
'@
RF "apps/web/src/features/personal/chats/components/FriendRequestsPanel.jsx" $old $new

$old = @'
                  <span className="ncm-user-email">{u.email}</span>
'@
$new = @'
                  <span className="ncm-user-email">{u.username ? '@' + u.username : ''}</span>
'@
RF "apps/web/src/features/personal/chats/components/NewChatModal.jsx" $old $new

# --- AddFriendModal: full field swap email -> username -----------------------
$addFriend = "apps/web/src/features/personal/chats/components/AddFriendModal.jsx"
$full = [System.IO.Path]::Combine((Get-Location).Path, $addFriend)
if (Test-Path $full) {
    $c = [System.IO.File]::ReadAllText($full, $U8)
    $c = $c.Replace("const [email, setEmail] = useState('');", "const [username, setUsername] = useState('');")
    $c = $c.Replace("const trimmedEmail = email.trim().toLowerCase();", "const trimmedUsername = username.trim().toLowerCase();")
    $c = $c.Replace("const canSubmit = trimmedEmail.length > 3 && !saving && !sent;", "const canSubmit = trimmedUsername.length > 2 && !saving && !sent;")
    $c = $c.Replace("      await sendMutation.mutateAsync({`n        email: trimmedEmail,`n        message: message.trim() || undefined,`n      });", "      await sendMutation.mutateAsync({`n        username: trimmedUsername,`n        message: message.trim() || undefined,`n      });")
    $c = $c.Replace('      toast.success(`Friend request sent to ${trimmedEmail}`);', '      toast.success(`Friend request sent to @${trimmedUsername}`);')
    $c = $c.Replace("    setEmail('');", "    setUsername('');")
    $c = $c.Replace('placeholder="name@example.com"', 'placeholder="username"')
    $c = $c.Replace('type="email"', 'type="text"')
    $c = $c.Replace("value={email}", "value={username}")
    $c = $c.Replace("onChange={(e) => { setEmail(e.target.value); setError(''); }}", "onChange={(e) => { setUsername(e.target.value); setError(''); }}")
    $c = $c.Replace("<span>Email address</span>", "<span>Username</span>")
    $c = $c.Replace("Send a request by email address", "Send a request by username")
    $c = $c.Replace('id="afm2-email"', 'id="afm2-username"')
    $c = $c.Replace('htmlFor="afm2-email"', 'htmlFor="afm2-username"')
    [System.IO.File]::WriteAllText($full, $c, $U8)
    Write-Host "  R $addFriend" -ForegroundColor Green
} else {
    Write-Host "  SKIP (missing): $addFriend" -ForegroundColor Yellow
}

# =============================================================================
# PHASE 8 - Header / AccountSettings / Admin pages
# =============================================================================
Step "PHASE 8 - Header / AccountSettings / Admin pages"

$old = @'
    return (
      (typeof user.displayName === 'string' && user.displayName.trim()) ||
      fromParts ||
      user.email ||
      'User'
    );
'@
$new = @'
    return (
      (typeof user.displayName === 'string' && user.displayName.trim()) ||
      fromParts ||
      user.username ||
      user.email ||
      'User'
    );
'@
RF "apps/web/src/app/layout/HeaderBar/HeaderBar.jsx" $old $new

$old = @'
          <span className="settings-field-label">Email Address</span>
'@
$new = @'
          <span className="settings-field-label">Username</span>
          <span className="settings-field-value">
            {user.username ? '@' + user.username : 'Not set'}
          </span>
        </div>
        <div className="settings-field-row">
          <span className="settings-field-label">Email Address</span>
'@
RF "apps/web/src/app/layout/Settings/panels/AccountPanel.jsx" $old $new

$old = @'
    firstName: '', lastName: '', email: '', role: 'user',
'@
$new = @'
    firstName: '', lastName: '', email: '', username: '', role: 'user',
'@
RF "apps/web/src/features/admin/pages/AdminUserDetailPage.jsx" $old $new

$old = @'
      setForm({
        firstName: user.firstName || '',
        lastName:  user.lastName  || '',
        email:     user.email     || '',
        role:      user.role      || 'user',
      });
'@
$new = @'
      setForm({
        firstName: user.firstName || '',
        lastName:  user.lastName  || '',
        email:     user.email     || '',
        username:  user.username  || '',
        role:      user.role      || 'user',
      });
'@
RF "apps/web/src/features/admin/pages/AdminUserDetailPage.jsx" $old $new

$old = @'
      if (form.email     !== (user.email     || '')) patch.email     = form.email;
'@
$new = @'
      if (form.email     !== (user.email     || '')) patch.email     = form.email;
      if (form.username  !== (user.username  || '')) patch.username  = form.username;
'@
RF "apps/web/src/features/admin/pages/AdminUserDetailPage.jsx" $old $new

$old = @'
                <div className="aud-field">
                  <label className="aud-label">Email</label>
                  <input
                    className="aud-input"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>
'@
$new = @'
                <div className="aud-field">
                  <label className="aud-label">Username</label>
                  <input
                    className="aud-input"
                    type="text"
                    value={form.username}
                    placeholder="3-30 chars, a-z 0-9 _"
                    onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                  />
                </div>
                <div className="aud-field">
                  <label className="aud-label">Email</label>
                  <input
                    className="aud-input"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </div>
'@
RF "apps/web/src/features/admin/pages/AdminUserDetailPage.jsx" $old $new

$old = @'
    form.email     !== (user.email     || '');
'@
$new = @'
    form.email     !== (user.email     || '') ||
    form.username  !== (user.username  || '');
'@
RF "apps/web/src/features/admin/pages/AdminUserDetailPage.jsx" $old $new

Write-Host "`n=== APPLY COMPLETE ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "NEXT STEPS (run manually):" -ForegroundColor Yellow
Write-Host "  cd apps/api"
Write-Host "  npx prisma migrate dev --name add_username"
Write-Host "  npx prisma generate"
Write-Host "  cd ../.."
Write-Host "  npm run dev"
Write-Host ""