# e-Kinerja Penyuluh KB

## Current State
Admin login requires Internet Identity (ICP), which is complex and failing. The token system (`adminToken` in URL) only shows a UI hint but doesn't bypass Internet Identity. Backend uses `_initializeAccessControlWithSecret` with `caffeineAdminToken` (from hash fragment), while frontend checks `adminToken` (from query params) — a mismatch that causes admin role initialization to fail.

## Requested Changes (Diff)

### Add
- `src/frontend/src/mocks/localBackend.ts`: Full localStorage-based backend implementation of `backendInterface`
- Local admin mode: when admin enters correct password (`ekinerja-admin-2024`), skip Internet Identity and use localStorage backend
- Simple password input on LoginPage when admin token URL param is detected

### Modify
- `LoginPage.tsx`: Add simple password form (visible when `?adminToken=ekinerja-admin-2024` in URL or session), that sets `localAdminMode` in localStorage and reloads
- `AuthContext.tsx`: Check `localStorage.getItem('localAdminMode')` and set role=admin, isApproved=true immediately without backend calls
- `config.ts` or `useActor.ts`: When `localAdminMode` is set, return localStorage-based mock actor instead of real ICP actor

### Remove
- Nothing removed — Internet Identity still works for regular penyuluh users

## Implementation Plan
1. Create `localBackend.ts` implementing all `backendInterface` methods using localStorage
2. Modify `useActor.ts` to return local backend when `localAdminMode` is active
3. Modify `AuthContext.tsx` to detect `localAdminMode` and bypass network auth
4. Modify `LoginPage.tsx` to show password form for admin token mode
