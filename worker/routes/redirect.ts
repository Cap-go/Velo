import { Hono } from "hono";
import { getAffiliateByCode, recordClick } from "../db/queries";
import type { Env } from "../types";
import { affiliateCookie, isSecureRequest } from "../lib/auth";
import { id } from "../lib/utils";

const redirect = new Hono<{ Bindings: Env }>();

redirect.get("/:code", async (c) => {
  const code = c.req.param("code");
  const affiliate = await getAffiliateByCode(c.env.DB, code);
  if (!affiliate) {
    return c.text("Affiliate link not found", 404);
  }

  await recordClick(c.env.DB, {
    id: id("clk"),
    affiliate_id: affiliate.id,
    created_at: Date.now(),
  });

  const destination = c.req.query("url") ?? "https://example.com";
  let target: URL;
  try {
    target = new URL(destination);
  } catch {
    return c.text("Invalid destination URL", 400);
  }

  const secure = isSecureRequest(new URL(c.req.url));
  const headers = new Headers();
  headers.set("Location", target.toString());
  headers.append("Set-Cookie", affiliateCookie(affiliate.code, secure));

  return new Response(null, { status: 302, headers });
});

export { redirect };
