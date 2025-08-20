# Overlay: Auth & Group Access (Flowchart-complete)

This overlay adds all APIs and libs needed to match the "Black Services API Flowchart – Authentication & Group Access".

## Added/Updated
- `lib/jwt.ts` (with jti + blocklist-aware verification helper)
- `lib/sessions.ts` (Mongo sessions for refresh-token rotation)
- `app/api/auth/login/route.ts`
- `app/api/auth/validate-session/route.ts`
- `app/api/auth/logout/route.ts`
- `app/api/auth/refresh-token/route.ts`
- `app/api/auth/change-password/route.ts`
- `app/api/auth/user-groups/route.ts`
- `app/api/auth/group-access/[id]/route.ts`

## Requirements
- `redis` client available at `@/lib/redis`
- `mongodb` helper available at `@/lib/mongodb`
- Env: `JWT_SECRET`, optionally `JWT_EXPIRES`

## Notes
- Logout uses Redis blocklist per `jti` until JWT expiry.
- Refresh tokens are opaque UUIDs stored hashed in `sessions` collection.
- Validate-session uses blocklist-aware verification.
