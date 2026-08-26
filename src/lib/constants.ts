export const PRODUCTION_APP_URL = "https://capve.app";

/** Canonical product URL in UI copy; local dev uses the Vite origin. */
export function appBaseUrl(): string {
  if (import.meta.env.DEV) return window.location.origin;
  return PRODUCTION_APP_URL;
}
