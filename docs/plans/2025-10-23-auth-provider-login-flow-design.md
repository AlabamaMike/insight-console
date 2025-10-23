# Auth Provider & Login Flow Design

**Date:** 2025-10-23
**Status:** Approved
**Author:** Claude Code

## Problem Statement

The production application shows "Missing or invalid authorization header" errors because:
- Protected pages attempt to fetch data before confirming authentication
- Two separate axios instances exist with inconsistent auth handling
- Auth state is checked per-component rather than globally
- No centralized redirect logic for unauthenticated users

## Solution: Unified Auth Provider Pattern

Implement a React Context-based authentication provider that manages auth state globally, handles redirects, and consolidates axios instances.

## Architecture

### Core Components

#### 1. AuthContext (`contexts/AuthContext.tsx`)
React context definition containing:
- `user`: Current user object or null
- `isAuthenticated`: Boolean auth status
- `isLoading`: Initial auth check in progress
- `login()`: Method to authenticate and store tokens
- `logout()`: Method to clear auth and redirect
- `refreshToken()`: Method to refresh access token

#### 2. AuthProvider (`providers/AuthProvider.tsx`)
Provider component that:
- Checks localStorage for existing tokens on mount
- Validates/refreshes tokens on initial load
- Provides auth state and methods to all children
- Handles automatic redirects for unauthenticated users

#### 3. useAuth Hook (`hooks/useAuth.ts`)
Custom hook that:
- Provides type-safe access to AuthContext
- Throws error if used outside AuthProvider
- Simplifies component code: `const { user, isAuthenticated } = useAuth()`

#### 4. ProtectedRoute Component (`components/ProtectedRoute.tsx`)
Wrapper component that:
- Uses `useAuth()` to check authentication status
- Shows loading spinner while auth is being verified
- Redirects to `/auth/login` if not authenticated
- Renders children only when authenticated

### Authentication Flows

#### Initial App Load
```
1. App mounts → AuthProvider initializes
2. Check localStorage for access token
3. If token exists:
   a. Attempt to validate/decode
   b. If valid → set isAuthenticated=true, load user data
   c. If expired → attempt refresh token flow
   d. If refresh succeeds → set new tokens, continue
   e. If refresh fails → clear auth, redirect to login
4. If no token → isAuthenticated=false
5. ProtectedRoute components check isAuthenticated
6. Redirect to /auth/login if false
```

#### Magic Link Login Flow
```
1. User enters email at /auth/login
2. Backend sends magic link email
3. User clicks link → /auth/verify?token=<magic_link_token>
4. Verify page calls backend: POST /auth/verify-magic-link
5. Backend returns { accessToken, refreshToken, user }
6. Call AuthProvider.login(accessToken, refreshToken, user)
7. Tokens saved to localStorage
8. Auth state updated: isAuthenticated=true, user set
9. Redirect to / (homepage)
10. ProtectedRoute sees isAuthenticated=true → renders content
```

#### Token Refresh (Automatic)
```
1. API request receives 401 Unauthorized
2. Axios interceptor catches error
3. Check if refresh token exists
4. If no refresh token → logout and redirect to login
5. If refresh token exists:
   a. Call POST /auth/refresh with refresh token
   b. If successful → save new access token
   c. Retry original request with new token
   d. If refresh fails → logout and redirect to login
```

#### Logout Flow
```
1. User clicks logout button
2. Component calls logout() from useAuth()
3. Clear tokens from localStorage
4. Reset auth state: isAuthenticated=false, user=null
5. Redirect to /auth/login
```

### Error Handling

#### "Missing or invalid authorization header" - ELIMINATED
- Protected pages don't render until `isAuthenticated=true`
- API calls only execute after auth confirmation
- Axios interceptor adds Bearer token to all requests automatically

#### Edge Cases Handled

1. **Token expires mid-session**
   - Axios interceptor detects 401
   - Attempts refresh automatically
   - Retries original request
   - User experiences no interruption

2. **Multiple browser tabs**
   - All tabs read from same localStorage
   - Auth state stays synchronized
   - Logout in one tab affects all tabs

3. **Direct URL access to protected pages**
   - ProtectedRoute checks auth before rendering
   - Redirects to login if not authenticated
   - Preserves attempted URL for post-login redirect (optional enhancement)

4. **Network failures**
   - Distinguish network errors from auth errors
   - Only clear auth state for actual 401/403 responses
   - Show error UI for network issues without logging out

5. **Concurrent 401 responses**
   - Prevent multiple simultaneous refresh attempts
   - Queue requests during token refresh
   - Retry all queued requests after refresh completes

### File Structure

```
frontend/src/
├── contexts/
│   └── AuthContext.tsx          # Context definition, types, default values
├── providers/
│   └── AuthProvider.tsx         # Provider implementation with auth logic
├── hooks/
│   └── useAuth.ts               # Custom hook for accessing auth context
├── components/
│   └── ProtectedRoute.tsx       # Route guard wrapper component
├── lib/
│   ├── auth.ts                  # KEEP: localStorage token helpers
│   ├── axios.ts                 # KEEP & ENHANCE: Has refresh interceptor
│   ├── api.ts                   # UPDATE: Use axios.ts instance
│   └── api/
│       └── auth.ts              # KEEP: Auth API calls (login, verify, refresh)
└── app/
    ├── layout.tsx               # UPDATE: Wrap with <AuthProvider>
    ├── page.tsx                 # UPDATE: Use <ProtectedRoute>
    ├── deals/[id]/page.tsx      # UPDATE: Use <ProtectedRoute>
    └── auth/
        ├── login/page.tsx       # KEEP: Already implemented
        └── verify/page.tsx      # UPDATE: Use AuthProvider.login()
```

## Implementation Changes

### New Files to Create
1. ✅ `contexts/AuthContext.tsx` - Auth context definition
2. ✅ `providers/AuthProvider.tsx` - Provider with auth logic
3. ✅ `hooks/useAuth.ts` - Hook to access auth context
4. ✅ `components/ProtectedRoute.tsx` - Protected route wrapper

### Files to Update
1. ✅ `app/layout.tsx` - Wrap children with `<AuthProvider>`
2. ✅ `app/page.tsx` - Replace useEffect auth check with `<ProtectedRoute>`
3. ✅ `app/deals/[id]/page.tsx` - Wrap with `<ProtectedRoute>`
4. ✅ `lib/api.ts` - Import axios instance from `lib/axios.ts`
5. ✅ `app/auth/verify/page.tsx` - Use `useAuth().login()` after verification
6. ✅ `lib/axios.ts` - Enhance refresh token logic to prevent race conditions

### Files to Keep Unchanged
- ✅ `lib/auth.ts` - Token storage helpers remain useful
- ✅ `lib/api/auth.ts` - Auth API functions still needed
- ✅ `app/auth/login/page.tsx` - Already correctly implemented
- ✅ All API route functions (`getDeals`, `createDeal`, etc.)

## Integration Points

### Root Layout Integration
```tsx
// app/layout.tsx
import { AuthProvider } from '@/providers/AuthProvider'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
```

### Protected Page Integration
```tsx
// app/page.tsx or app/deals/[id]/page.tsx
import { ProtectedRoute } from '@/components/ProtectedRoute'

export default function HomePage() {
  return (
    <ProtectedRoute>
      {/* Existing page content */}
    </ProtectedRoute>
  )
}
```

### Component Auth Access
```tsx
// Any component needing auth info
import { useAuth } from '@/hooks/useAuth'

function MyComponent() {
  const { user, isAuthenticated, logout } = useAuth()

  return (
    <div>
      {isAuthenticated && <p>Welcome, {user?.email}</p>}
      <button onClick={logout}>Logout</button>
    </div>
  )
}
```

## Benefits

1. **Eliminates auth errors** - No API calls before authentication confirmed
2. **Single source of truth** - All components use same auth state
3. **Cleaner code** - No duplicate auth checks across components
4. **Better UX** - Loading states prevent flickering, smooth transitions
5. **Maintainable** - Centralized auth logic, easy to enhance later
6. **Type-safe** - Full TypeScript support via context and hooks

## Testing Considerations

1. **Initial load without auth** - Should redirect to login
2. **Initial load with valid token** - Should show protected content
3. **Initial load with expired token** - Should attempt refresh, then show content or redirect
4. **Token expiry during session** - Should refresh automatically and continue
5. **Refresh token failure** - Should logout and redirect to login
6. **Multiple tabs** - Should sync auth state across tabs
7. **Direct URL access** - Should protect all routes requiring auth
8. **Logout** - Should clear state and redirect immediately

## Future Enhancements (Out of Scope)

- Remember attempted URL and redirect after login
- Add "remember me" functionality
- Implement biometric auth for mobile
- Add session timeout warnings
- Implement role-based access control at route level
