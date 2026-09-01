import { Hono } from "hono";
import {
  createAffiliateNetwork,
  createGroup,
  createLander,
  createOffer,
  createTrafficSource,
  deleteGroup,
  listAffiliateNetworks,
  listGroups,
  listLanders,
  listOffers,
  listTrafficSources,
} from "../db/entities";
import type { Env } from "../types";
import { requireUser } from "../lib/access";
import { parseHttpUrl } from "../lib/urls";

const entities = new Hono<{ Bindings: Env }>();

entities.get("/groups", async (c) => {
  const user = await requireUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  return c.json({ groups: await listGroups(c.env.DB, user.id) });
});

entities.post("/groups", async (c) => {
  const user = await requireUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const body = await c.req.json<{ name?: string }>();
  const name = body.name?.trim();
  if (!name) return c.json({ error: "Name required" }, 400);
  const group = await createGroup(c.env.DB, user.id, name);
  return c.json({ group }, 201);
});

entities.delete("/groups/:id", async (c) => {
  const user = await requireUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const ok = await deleteGroup(c.env.DB, c.req.param("id"), user.id);
  if (!ok) return c.json({ error: "Not found" }, 404);
  return c.json({ ok: true });
});

entities.get("/traffic-sources", async (c) => {
  const user = await requireUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  return c.json({ traffic_sources: await listTrafficSources(c.env.DB, user.id) });
});

entities.post("/traffic-sources", async (c) => {
  const user = await requireUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const body = await c.req.json<{
    name?: string;
    cost_type?: "cpc" | "cpm" | "cpa";
    default_cost_cents?: number;
    postback_percent?: number;
    s2s_postback_url?: string | null;
  }>();
  const name = body.name?.trim();
  if (!name) return c.json({ error: "Name required" }, 400);
  const source = await createTrafficSource(c.env.DB, user.id, {
    name,
    cost_type: body.cost_type,
    default_cost_cents: body.default_cost_cents,
    postback_percent: body.postback_percent,
    s2s_postback_url: body.s2s_postback_url,
  });
  return c.json({ traffic_source: source }, 201);
});

entities.get("/networks", async (c) => {
  const user = await requireUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  return c.json({ networks: await listAffiliateNetworks(c.env.DB, user.id) });
});

entities.post("/networks", async (c) => {
  const user = await requireUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const body = await c.req.json<{ name?: string; postback_url_template?: string | null }>();
  const name = body.name?.trim();
  if (!name) return c.json({ error: "Name required" }, 400);
  const network = await createAffiliateNetwork(c.env.DB, user.id, {
    name,
    postback_url_template: body.postback_url_template,
  });
  return c.json({ network }, 201);
});

entities.get("/landers", async (c) => {
  const user = await requireUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  return c.json({ landers: await listLanders(c.env.DB, user.id) });
});

entities.post("/landers", async (c) => {
  const user = await requireUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const body = await c.req.json<{ name?: string; url?: string }>();
  const name = body.name?.trim();
  const url = body.url?.trim();
  if (!name || !url) return c.json({ error: "Name and URL required" }, 400);
  if (!parseHttpUrl(url)) return c.json({ error: "Valid http/https URL required" }, 400);
  const lander = await createLander(c.env.DB, user.id, { name, url });
  return c.json({ lander }, 201);
});

entities.get("/offers", async (c) => {
  const user = await requireUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  return c.json({ offers: await listOffers(c.env.DB, user.id) });
});

entities.post("/offers", async (c) => {
  const user = await requireUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const body = await c.req.json<{
    name?: string;
    url?: string;
    network_id?: string | null;
    payout_cents?: number;
  }>();
  const name = body.name?.trim();
  const url = body.url?.trim();
  if (!name || !url) return c.json({ error: "Name and URL required" }, 400);
  if (!parseHttpUrl(url)) return c.json({ error: "Valid http/https URL required" }, 400);
  const offer = await createOffer(c.env.DB, user.id, {
    name,
    url,
    network_id: body.network_id,
    payout_cents: body.payout_cents,
  });
  return c.json({ offer }, 201);
});

export { entities };
