import { Hono } from "hono";
import { getAffiliateByCode, getProgramById, recordClick } from "../db/queries";
import { getTriggersForEvent } from "../db/ops";
import {
  getOrCreateCampaignAffiliate,
  getOrCreateRotation,
  getProgramByCampaignKey,
  getRotationConfig,
} from "../db/routing";
import type { Env } from "../types";
import { affiliateCookie, isSecureRequest } from "../lib/auth";
import {
  fallbackDestination,
  newVisitorKey,
  readVisitorKey,
  resolvePathDestination,
  selectPath,
  visitorCookie,
} from "../lib/routing";
import { fireTriggerWebhooks } from "../lib/triggers";
import { id } from "../lib/utils";
import { resolveRedirectTarget } from "../lib/urls";

import type { Context } from "hono";

type AppContext = { Bindings: Env };

async function handleClickRedirect(
  c: Context<AppContext>,
  program: { id: string; destination_url: string | null; campaign_key: string | null },
  affiliate: { id: string; code: string },
) {
  const resolved = resolveRedirectTarget(program.destination_url, c.req.query("url"));
  if (!resolved.ok) {
    return c.text(resolved.error, resolved.status as 400 | 503);
  }

  const clickId = id("clk");
  const secure = isSecureRequest(new URL(c.req.url));
  const cookieHeader = c.req.header("cookie") ?? null;
  let visitorKey = readVisitorKey(cookieHeader);
  const setVisitorCookie = !visitorKey;
  if (!visitorKey) visitorKey = newVisitorKey();

  const ctx = {
    click_id: clickId,
    velo_ref: affiliate.code,
    campaign_key: program.campaign_key,
  };

  const config = await getRotationConfig(c.env.DB, program.id);
  const baseDestination = resolved.url.toString();
  let destination = fallbackDestination(baseDestination, ctx);
  let pathId: string | null = null;
  let landerId: string | null = null;
  let offerId: string | null = null;

  if (config.paths.length > 0) {
    const path = await selectPath(c.env.DB, config.rotation, config.paths, {
      programId: program.id,
      visitorKey,
    });
    if (path) {
      const pathDest = resolvePathDestination(path, baseDestination, ctx);
      if ("url" in pathDest) {
        destination = pathDest;
        pathId = pathDest.path_id;
        landerId = pathDest.lander_id;
        offerId = pathDest.offer_id;
      }
    }
  }

  if ("error" in destination) {
    return c.text(destination.error, 503);
  }

  await recordClick(c.env.DB, {
    id: clickId,
    program_id: program.id,
    affiliate_id: affiliate.id,
    ip: c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for") ?? null,
    user_agent: c.req.header("user-agent") ?? null,
    path_id: pathId,
    lander_id: landerId,
    offer_id: offerId,
    created_at: Date.now(),
  });

  const programFull = await getProgramById(c.env.DB, program.id);
  if (programFull) {
    const clickTriggers = await getTriggersForEvent(
      c.env.DB,
      programFull.user_id,
      program.id,
      "click",
    );
    await fireTriggerWebhooks(clickTriggers, {
      click_id: clickId,
      velo_ref: affiliate.code,
      campaign_key: program.campaign_key,
      program_id: program.id,
    });
  }

  const headers = new Headers();
  headers.set("Location", destination.url.toString());
  headers.append("Set-Cookie", affiliateCookie(affiliate.code, secure));
  if (setVisitorCookie) {
    headers.append("Set-Cookie", visitorCookie(visitorKey, secure));
  }

  return new Response(null, { status: 302, headers });
}

const redirect = new Hono<AppContext>();

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

  return handleClickRedirect(c, program, affiliate);
});

const campaign = new Hono<AppContext>();

campaign.get("/:key", async (c) => {
  const key = c.req.param("key");
  const program = await getProgramByCampaignKey(c.env.DB, key);
  if (!program || program.status !== "active") {
    return c.text("Campaign not found", 404);
  }

  const affiliate = await getOrCreateCampaignAffiliate(c.env.DB, program.id, key);
  await getOrCreateRotation(c.env.DB, program.id);

  return handleClickRedirect(
    c,
    { ...program, campaign_key: program.campaign_key ?? key },
    affiliate,
  );
});

export { redirect, campaign };
