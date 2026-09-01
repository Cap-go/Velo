import { env, SELF } from "cloudflare:test";
import { beforeAll, describe, expect, it } from "vitest";
import { initSql } from "./schema";

async function json<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

describe("phase 2 entities", () => {
  beforeAll(async () => {
    const statements = initSql
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean);
    for (const statement of statements) {
      await env.DB.prepare(statement).run();
    }
    await env.DB.exec(`
      DELETE FROM offers;
      DELETE FROM landers;
      DELETE FROM affiliate_networks;
      DELETE FROM traffic_sources;
      DELETE FROM groups;
      DELETE FROM conversions;
      DELETE FROM clicks;
      DELETE FROM affiliates;
      DELETE FROM programs;
      DELETE FROM users;
    `);
  });

  it("creates traffic source, network, lander, offer, group, and campaign with key", async () => {
    const sourceRes = await SELF.fetch("http://localhost/api/entities/traffic-sources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Facebook Ads", cost_type: "cpc", default_cost_cents: 45 }),
    });
    expect(sourceRes.status).toBe(201);
    const { traffic_source } = await json<{ traffic_source: { id: string } }>(sourceRes);

    const networkRes = await SELF.fetch("http://localhost/api/entities/networks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Test Network",
        postback_url_template: "https://net.example/pb?c={click_id}",
      }),
    });
    expect(networkRes.status).toBe(201);

    const landerRes = await SELF.fetch("http://localhost/api/entities/landers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "LP 1", url: "https://merchant.example/lp" }),
    });
    expect(landerRes.status).toBe(201);

    const offerRes = await SELF.fetch("http://localhost/api/entities/offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Main Offer",
        url: "https://network.example/offer?click={click_id}",
        payout_cents: 2500,
      }),
    });
    expect(offerRes.status).toBe(201);

    const groupRes = await SELF.fetch("http://localhost/api/entities/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "US Campaigns" }),
    });
    expect(groupRes.status).toBe(201);

    const campaignRes = await SELF.fetch("http://localhost/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Summer Promo",
        destination_url: "https://merchant.example/pricing",
        traffic_source_id: traffic_source.id,
      }),
    });
    expect(campaignRes.status).toBe(201);
    const { program } = await json<{ program: { campaign_key: string; traffic_source_id: string } }>(
      campaignRes,
    );
    expect(program.campaign_key).toMatch(/^summer_promo_/);
    expect(program.traffic_source_id).toBe(traffic_source.id);
  });
});
