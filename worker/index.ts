import { Hono } from "hono";
import type { Env } from "./types";
import { auth } from "./routes/auth";
import { convert } from "./routes/convert";
import { programs } from "./routes/programs";
import { redirect } from "./routes/redirect";

const app = new Hono<{ Bindings: Env }>();

app.use("*", async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
});

app.get("/api/health", (c) => c.json({ ok: true, service: "velo" }));

app.route("/api/auth", auth);
app.route("/api/programs", programs);
app.route("/api/v1/convert", convert);
app.route("/r", redirect);

import { ATTRIBUTION_SNIPPET } from "./lib/urls";

app.get("/api/v1/snippet", (c) => {
  return c.text(ATTRIBUTION_SNIPPET, 200, {
    "Content-Type": "text/javascript; charset=utf-8",
  });
});

app.all("*", async (c) => {
  const assets = c.env.ASSETS;
  if (!assets) {
    return c.text("Velo API running. Build the frontend with `bun run build`.", 404);
  }
  return assets.fetch(c.req.raw);
});

export default app;
