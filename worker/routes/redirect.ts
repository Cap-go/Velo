import { Hono } from "hono";
import { getAffiliateByCode, getProgramById, recordClick } from "../db/queries";
import type { Env } from "../types";
import { affiliateCookie, isSecureRequest } from "../lib/auth";
import { id } from "../lib/utils";
import { resolveRedirectTarget, withQueryParam } from "../lib/urls";

const redirect = new Hono<{ Bindings: Env }>();

redirect.get("/:code", async (c) => {
  const code = c.req.param("code");
  const affiliate = await getAffiliateByCode(c.env.DB, code);
  if (!affiliate) {
    return c.text("Affiliate link not found", 404);
  }

  const program = await getProgramById(c.env.DB, affiliate.program_id);
  if (!program) {
    return c.text("Program not found", 404);
  }

  const resolved = resolveRedirectTarget(program.destination_url, c.req.query("url"));
  if (!resolved.ok) {
    return c.text(resolved.error, resolved.status as 400 | 503);
  }

  const clickId = id("clk");
  await recordClick(c.env.DB, {
    id: clickId,
    program_id: program.id,
    affiliate_id: affiliate.id,
    ip: c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for") ?? null,
    user_agent: c.req.header("user-agent") ?? null,
    created_at: Date.now(),
  });

  let target = withQueryParam(resolved.url, "velo_ref", affiliate.code);
  target = withQueryParam(target, "click_id", clickId);

  const secure = isSecureRequest(new URL(c.req.url));
  const headers = new Headers();
  headers.set("Location", target.toString());
  headers.append("Set-Cookie", affiliateCookie(affiliate.code, secure));

  return new Response(null, { status: 302, headers });
});

export { redirect };
