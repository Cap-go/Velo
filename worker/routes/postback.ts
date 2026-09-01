import { Hono } from "hono";
import { createConversion, resolveAffiliateFromClick } from "../lib/conversion";
import type { Env } from "../types";

const postback = new Hono<{ Bindings: Env }>();

function parsePayout(raw: string | undefined): number | null {
  if (raw === undefined || raw === "") return 0;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}

/** Binom-compatible conversion postback: GET /click?cnv_id=...&payout=... */
postback.get("/", async (c) => {
  const clickId = c.req.query("cnv_id")?.trim() || c.req.query("click_id")?.trim();
  if (!clickId) {
    return c.text("cnv_id required", 400);
  }

  const payout = parsePayout(c.req.query("payout"));
  if (payout === null) {
    return c.text("invalid payout", 400);
  }

  const resolved = await resolveAffiliateFromClick(c.env.DB, clickId);
  if (!resolved) {
    return c.text("click not found", 404);
  }

  const { click, program, affiliate } = resolved;
  const status = c.req.query("cnv_status")?.trim() || "lead";
  const status2 = c.req.query("cnv_status2")?.trim() || null;
  const currency = c.req.query("cnv_currency")?.trim() || "USD";
  const orderId =
    c.req.query("order_id")?.trim() || c.req.query("external_event_id")?.trim() || click.id;
  const disableS2s = c.req.query("disable_postback") === "1";

  const result = await createConversion(c.env.DB, program, affiliate, {
    program_id: program.id,
    affiliate_id: affiliate.id,
    click_id: click.id,
    order_id: orderId,
    amount: payout,
    status,
    status2,
    currency,
    disable_s2s: disableS2s,
  });

  return c.json({ ok: true, ...result });
});

export { postback };
