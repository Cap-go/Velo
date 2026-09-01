export function buildTrackingUrl(appUrl: string, affiliateCode: string): string {
  return `${appUrl.replace(/\/$/, "")}/r/${affiliateCode}`;
}

export function buildPostbackUrl(appUrl: string): string {
  return `${appUrl.replace(/\/$/, "")}/click?cnv_id={click_id}&payout={payout}&cnv_status={status}`;
}
