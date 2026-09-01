/** @typedef {{ type: "public"; uri: string }} PublicDestination */

export const APP_NAME = "Capve";
/** Legacy Access app name on capve.app — still matched by findVeloAccessApp. */
export const LEGACY_APP_NAME = "Velo";
export const POLICY_NAME = "Allow operators";

const PROTECTED_PATHS = [
  "/app*",
  "/api/programs*",
  "/api/campaigns*",
  "/api/entities*",
  "/api/reports*",
  "/api/ops*",
  "/api/auth*",
];

/** Paths that must stay public — used by tests and validation. */
export const FORBIDDEN_PROTECTED_URI_PATTERNS = [
  /\/r(\/|$)/,
  /\/api\/v1(\/|$)/,
  /\/api\/health(\/|$)/,
  /^[^/]+\/?$/,
];

/**
 * @param {string | undefined | null} value
 */
export function parseCommaSeparated(value) {
  if (!value) return [];
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * Apex hosts (e.g. capve.app) also get www.{host}.
 * @param {string} appHost
 */
export function apexHostAliases(appHost) {
  const host = appHost.trim().toLowerCase();
  if (!host) return [];
  const parts = host.split(".");
  if (parts.length === 2) return [host, `www.${host}`];
  return [host];
}

/**
 * @param {string[]} hosts
 * @returns {PublicDestination[]}
 */
export function buildProtectedDestinations(hosts) {
  /** @type {PublicDestination[]} */
  const destinations = [];
  for (const host of hosts) {
    for (const path of PROTECTED_PATHS) {
      destinations.push({ type: "public", uri: `${host}${path}` });
    }
  }
  assertDestinationsDoNotWrapPublicRoutes(destinations);
  return destinations;
}

/**
 * @param {PublicDestination[]} destinations
 */
export function assertDestinationsDoNotWrapPublicRoutes(destinations) {
  for (const { uri } of destinations) {
    for (const pattern of FORBIDDEN_PROTECTED_URI_PATTERNS) {
      if (pattern.test(uri)) {
        throw new Error(`Refusing to protect public route: ${uri}`);
      }
    }
  }
}

/**
 * @param {string[]} emails
 * @param {string[]} domains
 */
export function buildAllowPolicyInclude(emails, domains) {
  if (emails.length === 0 && domains.length === 0) {
    return [{ everyone: {} }];
  }

  /** @type {Record<string, unknown>[]} */
  const include = [];
  for (const email of emails) {
    include.push({ email: { email } });
  }
  for (const domain of domains) {
    include.push({ email_domain: { domain } });
  }
  return include;
}

/**
 * @param {string[]} emails
 * @param {string[]} domains
 */
export function buildAllowPolicy(emails, domains) {
  return {
    decision: "allow",
    name: POLICY_NAME,
    include: buildAllowPolicyInclude(emails, domains),
  };
}

/**
 * @param {string} appHost
 */
export function sanitizeAuthDomain(appHost) {
  const slug = appHost
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug || "velo"}.cloudflareaccess.com`;
}

/**
 * @param {string} authDomain
 */
export function teamDomainFromAuthDomain(authDomain) {
  return `https://${authDomain}`;
}

/**
 * @param {Record<string, unknown> | null | undefined} app
 */
export function extractPolicyAud(app) {
  if (!app) return null;
  const aud = app.aud;
  if (typeof aud === "string" && aud) return aud;
  if (Array.isArray(aud) && typeof aud[0] === "string" && aud[0]) return aud[0];
  return null;
}

/**
 * @param {Record<string, unknown>} app
 * @param {string} appHost
 */
export function appMatchesVeloInstall(app, appHost) {
  if (app.name === APP_NAME || app.name === LEGACY_APP_NAME) return true;

  const hosts = apexHostAliases(appHost);
  const destinations = /** @type {PublicDestination[] | undefined} */ (app.destinations);
  if (destinations?.some((d) => hosts.some((h) => d.uri === `${h}/app*` || d.uri === `${h}/app` || d.uri === `${h}/app/*`))) {
    return true;
  }

  const domain = typeof app.domain === "string" ? app.domain : "";
  return hosts.some(
    (h) => domain === `${h}/app` || domain === `${h}/app/*` || domain === `${h}/app*`,
  );
}

/**
 * @param {Record<string, unknown>[]} apps
 * @param {string} appHost
 */
export function findVeloAccessApp(apps, appHost) {
  return apps.find((app) => appMatchesVeloInstall(app, appHost));
}

/**
 * @param {string} appHost
 */
export function buildAccessApplicationBody(appHost, emails, domains) {
  const host = appHost.trim().toLowerCase();
  return {
    name: APP_NAME,
    type: "self_hosted",
    domain: `${host}/app*`,
    destinations: buildProtectedDestinations([host]),
    session_duration: "24h",
    app_launcher_visible: true,
    policies: [buildAllowPolicy(emails, domains)],
  };
}
