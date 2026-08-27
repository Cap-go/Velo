const LANDING_HOSTS = new Set(["capve.app", "www.capve.app"]);
const CONSOLE_HOST = "console.capve.app";
const SAAS_PREFIXES = ["/login", "/signup", "/app"];

function isLocalHost(host: string): boolean {
  return host === "localhost" || host === "127.0.0.1";
}

export function isLandingHost(host: string): boolean {
  return LANDING_HOSTS.has(host.toLowerCase());
}

export function isConsoleHost(host: string): boolean {
  return host.toLowerCase() === CONSOLE_HOST;
}

function isStaticAssetPath(path: string): boolean {
  return path.startsWith("/assets/") || /\.[a-z0-9]+$/i.test(path);
}

/** Redirect SPA paths to the correct host; API and /r routes pass through. */
export function hostRoutingRedirect(url: URL): Response | null {
  const host = url.hostname.toLowerCase();
  if (isLocalHost(host)) return null;

  const path = url.pathname;
  const suffix = `${url.search}${url.hash}`;

  if (host === "www.capve.app") {
    return Response.redirect(`https://capve.app${path === "/" ? "" : path}${suffix}`, 302);
  }

  if (isLandingHost(host)) {
    if (SAAS_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
      return Response.redirect(`https://${CONSOLE_HOST}${path}${suffix}`, 302);
    }
    if (path !== "/" && !isStaticAssetPath(path)) {
      return Response.redirect(`https://capve.app/${url.search}`, 302);
    }
  }

  if (isConsoleHost(host) && path === "/") {
    return Response.redirect(`https://${CONSOLE_HOST}/app${suffix}`, 302);
  }

  return null;
}

export function authCookieDomain(consoleUrl: string): string | undefined {
  try {
    const host = new URL(consoleUrl).hostname;
    if (host === "localhost" || host === "127.0.0.1") return undefined;
    return host;
  } catch {
    return undefined;
  }
}
