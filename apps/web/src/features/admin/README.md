# Admin Panel

Role-gated control surface at `/admin`. Log in as any user with
`role ∈ { admin, superadmin }` and you land here instead of `/journal`.

## Roles

| Role | Access |
|---|---|
| `user` | Cannot see `/admin` at all — navigating there redirects to `/journal` |
| `admin` | Can read + edit most resources; cannot change roles, delete users, edit settings, or wipe cache |
| `superadmin` | Full access, including role changes, hard deletes, settings writes, and cache wipes |

## Bootstrapping the first superadmin

On first boot, the API checks whether any `superadmin` exists. If not, it
creates one from these env vars in `apps/api/.env`:

```env
ADMIN_BOOTSTRAP_EMAIL=you@example.com
ADMIN_BOOTSTRAP_PASSWORD=AtLeast8Chars!