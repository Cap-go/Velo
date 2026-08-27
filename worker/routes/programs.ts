import { Hono } from "hono";
import {
  createAffiliateWithUniqueCode,
  createProgram,
  getProgram,
  getProgramStats,
  listAffiliates,
  listPrograms,
  updateProgram,
} from "../db/queries";
import type { Env } from "../types";
import { apiKey, convertSecret, id, slugify } from "../lib/utils";
import { buildTrackingUrl, parseHttpUrl } from "../lib/urls";
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

  const body = await c.req.json<{ name?: string; destination_url?: string }>();
  const name = body.name?.trim();
  const destinationRaw = body.destination_url?.trim();
  if (!name) return c.json({ error: "Program name required" }, 400);

  const destination = destinationRaw ? parseHttpUrl(destinationRaw) : null;
  if (!destination) {
    return c.json({ error: "Valid destination URL (http/https) required" }, 400);
  }

  const secret = convertSecret();
  const program = {
    id: id("prg"),
    user_id: user.id,
    name,
    slug: slugify(name),
    api_key: apiKey(),
    destination_url: destination.toString(),
    convert_secret: secret,
    created_at: Date.now(),
  };
  await createProgram(c.env.DB, program);
  const { convert_secret: _secret, ...publicProgram } = program;
  return c.json({ program: publicProgram, convert_secret: secret }, 201);
});

programs.patch("/:id", async (c) => {
  const user = await requireUser(c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);

  const body = await c.req.json<{ name?: string; destination_url?: string }>();
  const updates: { name?: string; destination_url?: string | null } = {};

  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) return c.json({ error: "Program name cannot be empty" }, 400);
    updates.name = name;
  }

  if (body.destination_url !== undefined) {
    const destination = parseHttpUrl(body.destination_url.trim());
    if (!destination) {
      return c.json({ error: "Valid destination URL (http/https) required" }, 400);
    }
    updates.destination_url = destination.toString();
  }

  const program = await updateProgram(c.env.DB, c.req.param("id"), user.id, updates);
  if (!program) return c.json({ error: "Not found" }, 404);
  return c.json({ program });
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
  if (!program.destination_url) {
    return c.json({ error: "Set a program destination URL before creating affiliates" }, 400);
  }

  const body = await c.req.json<{ name?: string }>();
  const name = body.name?.trim();
  if (!name) return c.json({ error: "Affiliate name required" }, 400);

  const affiliate = await createAffiliateWithUniqueCode(c.env.DB, {
    program_id: program.id,
    name,
  });

  const trackingUrl = buildTrackingUrl(c.env.CONSOLE_URL, affiliate.code);
  return c.json({ affiliate, tracking_url: trackingUrl }, 201);
});

export { programs };
