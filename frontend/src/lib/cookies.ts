// Lightweight cookie helpers (client-side only).
//
// Design note: tokens are stored in plain (non-httpOnly) cookies rather than
// httpOnly ones, because this frontend calls the Django API directly from
// the browser instead of proxying through Next.js Route Handlers. That
// tradeoff is what makes both (a) the client-side fetch wrapper attaching
// `Authorization: Bearer <token>` and (b) proxy.ts reading auth state for
// route protection possible without a backend-for-frontend layer. A plain
// cookie is readable by any script on the page (same exposure as
// localStorage) — for a real production deployment, the recommended
// hardening is to move to httpOnly cookies set by Next.js Route Handlers
// acting as a BFF in front of Django, or adopt a library like Auth.js.

const ACCESS_COOKIE = "omnicare_access";
const REFRESH_COOKIE = "omnicare_refresh";
const ROLE_COOKIE = "omnicare_role";

function setCookie(name: string, value: string, days: number) {
  if (typeof document === "undefined") return;
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function deleteCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; max-age=0`;
}

export const authCookies = {
  get access() {
    return getCookie(ACCESS_COOKIE);
  },
  get refresh() {
    return getCookie(REFRESH_COOKIE);
  },
  get role() {
    return getCookie(ROLE_COOKIE);
  },
  set(access: string, refresh: string, role: string) {
    // Access tokens are short-lived (see SIMPLE_JWT settings) so a 1-day
    // cookie lifetime is generous; refresh tokens live 7 days server-side.
    setCookie(ACCESS_COOKIE, access, 1);
    setCookie(REFRESH_COOKIE, refresh, 7);
    setCookie(ROLE_COOKIE, role, 7);
  },
  setAccess(access: string) {
    setCookie(ACCESS_COOKIE, access, 1);
  },
  clear() {
    deleteCookie(ACCESS_COOKIE);
    deleteCookie(REFRESH_COOKIE);
    deleteCookie(ROLE_COOKIE);
  },
};
