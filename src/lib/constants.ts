export const LANDING_URL = "https://capve.app";
export const CONSOLE_URL = "https://console.capve.app";

/** Public tracking links live on the marketing host. */
export const TRACKING_BASE_URL = LANDING_URL;

export function isDevHost(): boolean {
  return import.meta.env.DEV;
}

export function isLandingHost(hostname = window.location.hostname): boolean {
  if (isDevHost()) return false;
  return hostname === "capve.app" || hostname === "www.capve.app";
}

export function isConsoleHost(hostname = window.location.hostname): boolean {
  if (isDevHost()) return false;
  return hostname === "console.capve.app";
}

export function consolePath(path: string): string {
  if (isDevHost()) return path;
  return `${CONSOLE_URL}${path}`;
}

export function landingPath(path = "/"): string {
  if (isDevHost()) return path;
  if (path === "/") return LANDING_URL;
  return `${LANDING_URL}${path}`;
}

/** Merchant API examples in the dashboard. */
export function apiBaseUrl(): string {
  if (isDevHost()) return window.location.origin;
  return CONSOLE_URL;
}
