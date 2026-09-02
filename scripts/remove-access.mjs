import { findVeloAccessApp } from "./lib/access-setup.mjs";

const CF_API = "https://api.cloudflare.com/client/v4";

/**
 * @param {string} name
 */
function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

/**
 * @param {unknown} data
 */
function cfErrorMessage(data) {
  if (!data || typeof data !== "object") return "Unknown Cloudflare API error";
  const errors = /** @type {{ message?: string }[]} */ (data.errors);
  if (Array.isArray(errors) && errors.length > 0) {
    return errors.map((e) => e.message || "error").join("; ");
  }
  return "Unknown Cloudflare API error";
}

/**
 * @param {string} token
 * @param {string} path
 * @param {{ method?: string }} [options]
 */
async function cfApi(token, path, options = {}) {
  const response = await fetch(`${CF_API}${path}`, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    const message = cfErrorMessage(data);
    console.error(`Cloudflare API ${options.method ?? "GET"} ${path} failed: ${message}`);
    process.exit(1);
  }
  return data;
}

/**
 * @param {string} token
 * @param {string} accountId
 */
async function listAccessApps(token, accountId) {
  const data = await cfApi(token, `/accounts/${accountId}/access/apps`);
  return /** @type {Record<string, unknown>[]} */ (data.result ?? []);
}

async function main() {
  const token = requireEnv("CLOUDFLARE_API_TOKEN");
  const accountId = requireEnv("CLOUDFLARE_ACCOUNT_ID");
  const appHost = (process.env.APP_HOST ?? "capve.app").trim().toLowerCase();

  console.log(`Removing Cloudflare Access app for ${appHost}...`);

  const apps = await listAccessApps(token, accountId);
  const existing = findVeloAccessApp(apps, appHost);

  if (!existing?.id) {
    console.log("No Capve/Velo Access application found — nothing to remove.");
    return;
  }

  const appId = String(existing.id);
  await cfApi(token, `/accounts/${accountId}/access/apps/${appId}`, { method: "DELETE" });
  console.log(`Deleted Access app ${appId} (${existing.name}).`);
  console.log("Auth and dashboard routes now hit the Worker directly (email/password sessions).");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
