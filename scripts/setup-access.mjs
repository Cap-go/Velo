import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import {
  APP_NAME,
  apexHostAliases,
  buildAccessApplicationBody,
  buildAllowPolicy,
  extractPolicyAud,
  findVeloAccessApp,
  parseCommaSeparated,
  POLICY_NAME,
  sanitizeAuthDomain,
  teamDomainFromAuthDomain,
} from "./lib/access-setup.mjs";

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
 * @param {{ method?: string; body?: unknown }} [options]
 */
async function cfApi(token, path, options = {}) {
  const response = await fetch(`${CF_API}${path}`, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    const message = cfErrorMessage(data);
    const code = data.errors?.[0]?.code;
    console.error(`Cloudflare API ${options.method ?? "GET"} ${path} failed: ${message}`);
    if (code === 10000 || response.status === 403) {
      console.error(
        "Token may be missing Access: Apps and Policies Write (and Workers write for APPLY_VARS).",
      );
    }
    process.exit(1);
  }
  return data;
}

/**
 * @param {string} token
 * @param {string} accountId
 * @param {string} appHost
 */
async function ensureAccessOrganization(token, accountId, appHost) {
  const response = await fetch(`${CF_API}/accounts/${accountId}/access/organizations`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  const data = await response.json();

  if (response.ok && data.success && data.result?.auth_domain) {
    return data.result.auth_domain;
  }

  if (response.status === 403 || data.errors?.[0]?.code === 10000) {
    console.error(cfErrorMessage(data));
    console.error(
      "Token may be missing Access: Organizations, Identity Providers, and Groups Write.",
    );
    process.exit(1);
  }

  const authDomain = sanitizeAuthDomain(appHost);
  const created = await cfApi(token, `/accounts/${accountId}/access/organizations`, {
    method: "POST",
    body: {
      name: `${APP_NAME} ${appHost}`,
      auth_domain: authDomain,
    },
  });

  if (!created.result?.auth_domain) {
    const retry = await fetch(`${CF_API}/accounts/${accountId}/access/organizations`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    const retryData = await retry.json();
    if (retry.ok && retryData.success && retryData.result?.auth_domain) {
      return retryData.result.auth_domain;
    }

    console.error(
      "Cloudflare did not return auth_domain after creating the Zero Trust organization.",
    );
    console.error(
      "Ensure the API token has Access: Organizations, Identity Providers, and Groups Write.",
    );
    process.exit(1);
  }

  return created.result.auth_domain;
}

/**
 * @param {string} token
 * @param {string} accountId
 */
async function listAccessApps(token, accountId) {
  const data = await cfApi(token, `/accounts/${accountId}/access/apps`);
  return /** @type {Record<string, unknown>[]} */ (data.result ?? []);
}

/**
 * @param {string} token
 * @param {string} accountId
 * @param {string} appId
 */
async function listAppPolicies(token, accountId, appId) {
  const data = await cfApi(
    token,
    `/accounts/${accountId}/access/apps/${appId}/policies`,
  );
  return /** @type {Record<string, unknown>[]} */ (data.result ?? []);
}

/**
 * @param {string} token
 * @param {string} accountId
 * @param {string} appHost
 * @param {string[]} emails
 * @param {string[]} domains
 */
async function upsertVeloAccessApp(token, accountId, appHost, emails, domains) {
  const apps = await listAccessApps(token, accountId);
  const existing = findVeloAccessApp(apps, appHost);
  const body = buildAccessApplicationBody(appHost, emails, domains);
  const policy = buildAllowPolicy(emails, domains);

  if (!existing?.id) {
    const created = await cfApi(token, `/accounts/${accountId}/access/apps`, {
      method: "POST",
      body,
    });
    return /** @type {Record<string, unknown>} */ (created.result);
  }

  const appId = String(existing.id);
  const { policies: _policies, ...appPatch } = body;
  const updated = await cfApi(token, `/accounts/${accountId}/access/apps/${appId}`, {
    method: "PUT",
    body: appPatch,
  });

  const policies = await listAppPolicies(token, accountId, appId);
  const allowPolicy = policies.find((p) => p.name === POLICY_NAME);

  if (allowPolicy?.id) {
    await cfApi(
      token,
      `/accounts/${accountId}/access/apps/${appId}/policies/${allowPolicy.id}`,
      {
        method: "PUT",
        body: {
          ...policy,
          precedence: allowPolicy.precedence ?? 1,
        },
      },
    );
  } else {
    await cfApi(token, `/accounts/${accountId}/access/apps/${appId}/policies`, {
      method: "POST",
      body: policy,
    });
  }

  return /** @type {Record<string, unknown>} */ (updated.result ?? existing);
}

/**
 * @param {{
 *   token: string;
 *   accountId: string;
 *   workerName: string;
 *   appHost: string;
 *   teamDomain: string;
 *   policyAud: string;
 * }} params
 */
function applyWorkerVars(params) {
  const appUrl = `https://${params.appHost}`;
  const distPath = "dist/velo";

  if (!existsSync(distPath)) {
    console.log("dist/velo missing — building worker before applying vars...");
    const build = spawnSync("bun", ["run", "build"], {
      stdio: "inherit",
      env: { ...process.env, CLOUDFLARE_ENV: "production" },
    });
    if (build.status !== 0) process.exit(build.status ?? 1);
  }

  const env = {
    ...process.env,
    CLOUDFLARE_API_TOKEN: params.token,
    CLOUDFLARE_ACCOUNT_ID: params.accountId,
    CLOUDFLARE_ENV: "production",
  };

  const deployArgs = [
    "wrangler",
    "deploy",
    "--env",
    "production",
    "--name",
    params.workerName,
    "--keep-vars",
    "-y",
    "--var",
    `APP_URL:${appUrl}`,
    "--var",
    `TEAM_DOMAIN:${params.teamDomain}`,
    "--var",
    `POLICY_AUD:${params.policyAud}`,
  ];

  const deploy = spawnSync("bunx", deployArgs, { stdio: "inherit", env });
  if (deploy.status !== 0) {
    console.error("Failed to deploy worker with TEAM_DOMAIN and POLICY_AUD.");
    process.exit(deploy.status ?? 1);
  }
}

async function main() {
  const token = requireEnv("CLOUDFLARE_API_TOKEN");
  const accountId = requireEnv("CLOUDFLARE_ACCOUNT_ID");
  const appHost = requireEnv("APP_HOST").toLowerCase();
  const workerName = process.env.WORKER_NAME?.trim() || "velo";
  const applyVars = process.env.APPLY_VARS?.trim() !== "0";
  const allowedEmails = parseCommaSeparated(process.env.ACCESS_ALLOWED_EMAILS);
  const allowedDomains = parseCommaSeparated(process.env.ACCESS_ALLOWED_DOMAINS);

  if (appHost.includes("/") || appHost.includes(":")) {
    console.error("APP_HOST must be a hostname only (no scheme or path).");
    process.exit(1);
  }

  console.log(`Configuring Cloudflare Access for ${appHost} (worker: ${workerName})...`);

  const authDomain = await ensureAccessOrganization(token, accountId, appHost);
  const teamDomain = teamDomainFromAuthDomain(authDomain);

  const app = await upsertVeloAccessApp(
    token,
    accountId,
    appHost,
    allowedEmails,
    allowedDomains,
  );

  const policyAud = extractPolicyAud(app);
  if (!policyAud) {
    console.error("Access application response did not include aud (POLICY_AUD).");
    process.exit(1);
  }

  if (applyVars) {
    console.log("Applying TEAM_DOMAIN and POLICY_AUD to worker...");
    applyWorkerVars({
      token,
      accountId,
      workerName,
      appHost,
      teamDomain,
      policyAud,
    });
  }

  console.log("Cloudflare Access configured:");
  console.log(`  app_id: ${app.id}`);
  console.log(`  TEAM_DOMAIN: ${teamDomain}`);
  console.log(`  POLICY_AUD: ${policyAud}`);
  console.log(`  protected hosts: ${apexHostAliases(appHost).join(", ")}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
