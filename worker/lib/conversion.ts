import {
  getAffiliateByCode,
  getClickById,
  getProgramById,
  recordConversion,
  type ConversionInput,
} from "../db/queries";
import { getTriggersForEvent } from "../db/ops";
import { fireS2SPostback } from "./postback";
import { fireTriggerWebhooks } from "./triggers";
import { id } from "./utils";

export type CreateConversionParams = {
  program_id: string;
  affiliate_id: string;
  click_id?: string | null;
  order_id: string;
  amount: number;
  status?: string;
  status2?: string | null;
  currency?: string;
  disable_s2s?: boolean;
};

export async function createConversion(
  db: D1Database,
  program: { id: string; user_id: string; s2s_postback_url?: string | null },
  affiliate: { id: string; code: string },
  params: CreateConversionParams,
): Promise<{
  status: "created" | "duplicate";
  conversion: {
    affiliate_code: string;
    click_id: string | null;
    order_id: string;
    amount: number;
    amount_cents: number;
    status: string;
    status2: string | null;
    currency: string;
  };
}> {
  const amountCents = Math.round(params.amount * 100);
  const recordStatus = await recordConversion(db, {
    id: id("cnv"),
    program_id: params.program_id,
    affiliate_id: params.affiliate_id,
    click_id: params.click_id ?? null,
    order_id: params.order_id,
    amount_cents: amountCents,
    status: params.status ?? "lead",
    status2: params.status2 ?? null,
    currency: params.currency ?? "USD",
    created_at: Date.now(),
  } satisfies ConversionInput);

  if (recordStatus === "created" && !params.disable_s2s) {
    await fireS2SPostback(program.s2s_postback_url, {
      click_id: params.click_id ?? "",
      payout: String(params.amount),
      status: params.status ?? "lead",
      status2: params.status2 ?? undefined,
      currency: params.currency ?? "USD",
      order_id: params.order_id,
      affiliate_code: affiliate.code,
    });

    const triggers = await getTriggersForEvent(db, program.user_id, program.id, "conversion");
    await fireTriggerWebhooks(triggers, {
      click_id: params.click_id ?? null,
      payout: params.amount,
      status: params.status ?? "lead",
      order_id: params.order_id,
      affiliate_code: affiliate.code,
      program_id: program.id,
    });
  }

  return {
    status: recordStatus,
    conversion: {
      affiliate_code: affiliate.code,
      click_id: params.click_id ?? null,
      order_id: params.order_id,
      amount: params.amount,
      amount_cents: amountCents,
      status: params.status ?? "lead",
      status2: params.status2 ?? null,
      currency: params.currency ?? "USD",
    },
  };
}

export async function resolveAffiliateFromClick(
  db: D1Database,
  clickId: string,
  programId?: string,
) {
  const click = await getClickById(db, clickId);
  if (!click) return null;
  if (programId && click.program_id !== programId) return null;

  const program = await getProgramById(db, click.program_id);
  if (!program) return null;

  const affiliates = await db
    .prepare("SELECT id, program_id, name, code, created_at FROM affiliates WHERE id = ?")
    .bind(click.affiliate_id)
    .first<{ id: string; program_id: string; name: string; code: string; created_at: number }>();

  if (!affiliates) return null;

  return { click, program, affiliate: affiliates };
}

export async function resolveAffiliateByCode(
  db: D1Database,
  programId: string,
  affiliateCode: string,
) {
  const affiliate = await getAffiliateByCode(db, affiliateCode);
  if (!affiliate || affiliate.program_id !== programId) return null;
  const program = await getProgramById(db, programId);
  if (!program) return null;
  return { program, affiliate };
}
