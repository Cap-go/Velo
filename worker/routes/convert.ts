import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  getAffiliateByCode,
  getProgramByApiKey,
  recordConversion,
} from "../db/queries";
import type { Env } from "../types";
import { readAffiliateCookie } from "../lib/auth";
import { id } from "../lib/utils";

const convert = new Hono<{ Bindings: Env }>();

convert.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "X-Program-Key"],
    maxAge: 86400,
  }),
);

convert.post("/", async (c) => {
  const apiKey = c.req.header("X-Program-Key");
  if (!apiKey) {
    return c.json({ error: "X-Program-Key header required" }, 401);
  }

  const program = await getProgramByApiKey(c.env.DB, apiKey);
  if (!program) {
    return c.json({ error: "Invalid program key" }, 401);
  }

  const body = await c.req.json<{
    order_id?: string;
    amount?: number;
    affiliate_code?: string;
  }>();

  const orderId = body.order_id?.trim();
  const amount = body.amount;

  if (!orderId || typeof amount !== "number" || amount < 0) {
    return c.json({ error: "order_id and amount (number >= 0) required" }, 400);
  }

  const affiliateCode =
    body.affiliate_code?.trim() || readAffiliateCookie(c.req.header("Cookie") ?? null);

  if (!affiliateCode) {
    return c.json({ error: "No affiliate attribution (affiliate_code required)" }, 400);
  }

  const affiliate = await getAffiliateByCode(c.env.DB, affiliateCode);
  if (!affiliate || affiliate.program_id !== program.id) {
    return c.json({ error: "Affiliate not found for this program" }, 404);
  }

  const amountCents = Math.round(amount * 100);
  const status = await recordConversion(c.env.DB, {
    id: id("cnv"),
    affiliate_id: affiliate.id,
    order_id: orderId,
    amount_cents: amountCents,
    created_at: Date.now(),
  });

  return c.json({
    ok: true,
    status,
    conversion: {
      affiliate_code: affiliate.code,
      order_id: orderId,
      amount,
      amount_cents: amountCents,
    },
  });
});

export { convert };
