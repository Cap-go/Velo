import { Hono } from "hono";
import {
  createPath,
  deletePath,
  getOrCreateRotation,
  getRotationConfig,
  updatePath,
  updateRotation,
} from "../db/routing";
import { getProgram } from "../db/queries";
import type { Env } from "../types";
import type { FlowType, RotationMode } from "../types-routing";
import { requireUser, requireWrite } from "../lib/access";
import { parseHttpUrl } from "../lib/urls";

const routing = new Hono<{ Bindings: Env }>();

routing.get("/:id/rotation", async (c) => {
  const session = await requireUser(c);
  if (!session) return c.json({ error: "Unauthorized" }, 401);

  const program = await getProgram(c.env.DB, c.req.param("id"), session.account_id);
  if (!program) return c.json({ error: "Not found" }, 404);

  const config = await getRotationConfig(c.env.DB, program.id);
  return c.json(config);
});

routing.put("/:id/rotation", async (c) => {
  const session = await requireWrite(c);
  if (session instanceof Response) return session;

  const program = await getProgram(c.env.DB, c.req.param("id"), session.account_id);
  if (!program) return c.json({ error: "Not found" }, 404);

  const body = await c.req.json<{ mode?: RotationMode; fixed_path_id?: string | null }>();
  const validModes: RotationMode[] = ["normal", "smart", "fix_on", "top_to_bottom"];
  if (body.mode && !validModes.includes(body.mode)) {
    return c.json({ error: "Invalid rotation mode" }, 400);
  }

  const rotation = await updateRotation(c.env.DB, program.id, {
    mode: body.mode,
    fixed_path_id: body.fixed_path_id,
  });
  const config = await getRotationConfig(c.env.DB, program.id);
  return c.json({ rotation, paths: config.paths });
});

routing.post("/:id/paths", async (c) => {
  const session = await requireWrite(c);
  if (session instanceof Response) return session;

  const program = await getProgram(c.env.DB, c.req.param("id"), session.account_id);
  if (!program) return c.json({ error: "Not found" }, 404);

  const body = await c.req.json<{
    name?: string;
    flow_type?: FlowType;
    weight?: number;
    sort_order?: number;
    direct_url?: string | null;
    lander_id?: string | null;
    offer_id?: string | null;
    enabled?: boolean;
  }>();

  const name = body.name?.trim();
  if (!name) return c.json({ error: "Path name required" }, 400);

  const validFlows: FlowType[] = ["direct", "lander", "lander_offer", "offer"];
  if (!body.flow_type || !validFlows.includes(body.flow_type)) {
    return c.json({ error: "Valid flow_type required" }, 400);
  }

  if (body.direct_url) {
    const url = parseHttpUrl(body.direct_url);
    if (!url) return c.json({ error: "Invalid direct_url" }, 400);
    body.direct_url = url.toString();
  }

  const path = await createPath(c.env.DB, program.id, {
    name,
    flow_type: body.flow_type,
    weight: body.weight,
    sort_order: body.sort_order,
    direct_url: body.direct_url ?? null,
    lander_id: body.lander_id ?? null,
    offer_id: body.offer_id ?? null,
    enabled: body.enabled,
  });

  return c.json({ path }, 201);
});

routing.patch("/:id/paths/:pathId", async (c) => {
  const session = await requireWrite(c);
  if (session instanceof Response) return session;

  const program = await getProgram(c.env.DB, c.req.param("id"), session.account_id);
  if (!program) return c.json({ error: "Not found" }, 404);

  const body = await c.req.json<{
    name?: string;
    flow_type?: FlowType;
    weight?: number;
    sort_order?: number;
    direct_url?: string | null;
    lander_id?: string | null;
    offer_id?: string | null;
    enabled?: boolean;
  }>();

  if (body.direct_url) {
    const url = parseHttpUrl(body.direct_url);
    if (!url) return c.json({ error: "Invalid direct_url" }, 400);
    body.direct_url = url.toString();
  }

  const path = await updatePath(c.env.DB, c.req.param("pathId"), program.id, body);
  if (!path) return c.json({ error: "Not found" }, 404);
  return c.json({ path });
});

routing.delete("/:id/paths/:pathId", async (c) => {
  const session = await requireWrite(c);
  if (session instanceof Response) return session;

  const program = await getProgram(c.env.DB, c.req.param("id"), session.account_id);
  if (!program) return c.json({ error: "Not found" }, 404);

  const deleted = await deletePath(c.env.DB, c.req.param("pathId"), program.id);
  if (!deleted) return c.json({ error: "Not found" }, 404);
  return c.json({ ok: true });
});

export { routing };
