export const GITHUB_REPO_URL = "https://github.com/Cap-go/Velo";
export const DEPLOY_BUTTON_URL =
  "https://deploy.workers.cloudflare.com/?url=https://github.com/Cap-go/Velo";
export const DEPLOY_BUTTON_IMAGE = "https://deploy.workers.cloudflare.com/button";
export const PRODUCTION_APP_URL = "https://capve.app";

/** Canonical product URL in UI copy; local dev uses the Vite origin. */
export function appBaseUrl(): string {
  if (import.meta.env.DEV) return window.location.origin;
  return PRODUCTION_APP_URL;
}
