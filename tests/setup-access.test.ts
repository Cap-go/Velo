import { describe, expect, it } from "vitest";
import {
  apexHostAliases,
  assertDestinationsDoNotWrapPublicRoutes,
  buildAccessApplicationBody,
  buildAllowPolicy,
  buildAllowPolicyInclude,
  buildProtectedDestinations,
  extractPolicyAud,
  findVeloAccessApp,
  parseCommaSeparated,
  sanitizeAuthDomain,
  teamDomainFromAuthDomain,
} from "../scripts/lib/access-setup";

describe("access setup builders", () => {
  it("parses comma-separated allow lists", () => {
    expect(parseCommaSeparated("a@b.com, c@d.com")).toEqual(["a@b.com", "c@d.com"]);
    expect(parseCommaSeparated("")).toEqual([]);
  });

  it("adds www alias for apex hosts only", () => {
    expect(apexHostAliases("capve.app")).toEqual(["capve.app", "www.capve.app"]);
    expect(apexHostAliases("app.example.com")).toEqual(["app.example.com"]);
  });

  it("builds path-based protected destinations without public routes", () => {
    const destinations = buildProtectedDestinations(["capve.app", "www.capve.app"]);
    const uris = destinations.map((d) => d.uri);

    expect(uris).toEqual([
      "capve.app/app*",
      "capve.app/api/programs*",
      "capve.app/api/auth*",
      "www.capve.app/app*",
      "www.capve.app/api/programs*",
      "www.capve.app/api/auth*",
    ]);

    expect(uris.some((u) => u.includes("/r"))).toBe(false);
    expect(uris.some((u) => u.includes("/api/v1"))).toBe(false);
    expect(uris.some((u) => u.includes("/api/health"))).toBe(false);

    assertDestinationsDoNotWrapPublicRoutes(destinations);
  });

  it("builds allow policy include rules", () => {
    expect(buildAllowPolicyInclude([], [])).toEqual([{ everyone: {} }]);
    expect(buildAllowPolicyInclude(["ops@capve.app"], ["capve.app"])).toEqual([
      { email: { email: "ops@capve.app" } },
      { email_domain: { domain: "capve.app" } },
    ]);
  });

  it("builds inline allow policy", () => {
    const policy = buildAllowPolicy(["ops@capve.app"], []);
    expect(policy.decision).toBe("allow");
    expect(policy.name).toBe("Allow operators");
    expect(policy.include).toEqual([{ email: { email: "ops@capve.app" } }]);
  });

  it("builds access application body for self-hosted paths", () => {
    const body = buildAccessApplicationBody("capve.app", [], ["capgo.app"]);
    expect(body.type).toBe("self_hosted");
    expect(body.domain).toBe("capve.app/app*");
    expect(body.session_duration).toBe("24h");
    const destinations = body.destinations as { uri: string }[];
    expect(destinations.length).toBe(6);
    const policies = body.policies as { include: unknown[] }[];
    expect(policies[0].include).toEqual([{ email_domain: { domain: "capgo.app" } }]);
  });

  it("sanitizes auth domain and team domain", () => {
    expect(sanitizeAuthDomain("capve.app")).toBe("capve-app.cloudflareaccess.com");
    expect(teamDomainFromAuthDomain("capve-app.cloudflareaccess.com")).toBe(
      "https://capve-app.cloudflareaccess.com",
    );
  });

  it("extracts POLICY_AUD from app payload", () => {
    expect(extractPolicyAud({ aud: "abc" })).toBe("abc");
    expect(extractPolicyAud({ aud: ["xyz"] })).toBe("xyz");
    expect(extractPolicyAud({})).toBeNull();
  });

  it("finds existing Velo access app by name or domain", () => {
    const apps = [
      { name: "Other", domain: "other.example.com/app" },
      { name: "Velo", domain: "capve.app/app", id: "app-1" },
    ];
    expect(findVeloAccessApp(apps, "capve.app")?.id).toBe("app-1");

    const byDestination = [
      {
        name: "Custom",
        destinations: [{ type: "public", uri: "capve.app/app*" }],
        id: "app-2",
      },
    ];
    expect(findVeloAccessApp(byDestination, "capve.app")?.id).toBe("app-2");
  });
});
