import { Hono } from "hono";
import {
  createAffiliate,
  createProgram,
  getProgram,
  getProgramStats,
  listAffiliates,
  listPrograms,
} from "../db/queries";
import type { Env } from "../types";
import { affiliateCode, apiKey, id, slugify } from "../lib/utils";
import { requireUser } from "./auth";

const programs = new Hono<{ Bindings: Env }>();

programs.get("/", async (c) => {
  const user = await requireUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  const items = await listPrograms(c.env.DB, user.id);
  return c.json({ programs: items });
});

programs.post("/", async (c) => {
  const user = await requireUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const body = await c.req.json<{ name?: string }>();
  const name = body.name?.trim();
  if (!name) return c.json({ error: "Program name required" }, 400);

  const program = {
    id: id("prg"),
    user_id: user.id,
    name,
    slug: slugify(name),
    api_key: apiKey(),
    created_at: Date.now(),
  };
  await createProgram(c.env.DB, program);
  return c.json({ program }, 201);
});

programs.get("/:id", async (c) => {
  const user = await requireUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const program = await getProgram(c.env.DB, c.req.param("id"), user.id);
  if (!program) return c.json({ error: "Not found" }, 404);
  return c.json({ program });
});

programs.get("/:id/stats", async (c) => {
  const user = await requireUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const program = await getProgram(c.env.DB, c.req.param("id"), user.id);
  if (!program) return c.json({ error: "Not found" }, 404);

  const stats = await getProgramStats(c.env.DB, program);
  return c.json(stats);
});

programs.get("/:id/affiliates", async (c) => {
  const user = await requireUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const program = await getProgram(c.env.DB, c.req.param("id"), user.id);
  if (!program) return c.json({ error: "Not found" }, 404);

  const affiliates = await listAffiliates(c.env.DB, program.id);
  return c.json({ affiliates });
});

programs.post("/:id/affiliates", async (c) => {
  const user = await requireUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const program = await getProgram(c.env.DB, c.req.param("id"), user.id);
  if (!program) return c.json({ error: "Not found" }, 404);

  const body = await c.req.json<{ name?: string }>();
  const name = body.name?.trim();
  if (!name) return c.json({ error: "Affiliate name required" }, 400);

  const affiliate = {
    id: id("aff"),
    program_id: program.id,
    name,
    code: affiliateCode(),
    created_at: Date.now(),
  };
  await createAffiliate(c.env.DB, affiliate);

  const appUrl = c.env.APP_URL.replace(/\/$/, "");
  const trackingUrl = `${appUrl}/r/${affiliate.code}?url=https://example.com`;

  return c.json({ affiliate, tracking_url: trackingUrl }, 201);
});

export { programs };
