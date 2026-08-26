export function parseHttpUrl(raw: string): URL | null {
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url;
  } catch {
    return null;
  }
}

export function hostsMatch(a: URL, b: URL): boolean {
  return a.hostname.toLowerCase() === b.hostname.toLowerCase();
}

export function withQueryParam(url: URL, key: string, value: string): URL {
  const next = new URL(url.toString());
  next.searchParams.set(key, value);
  return next;
}

export type RedirectResolution =
  | { ok: true; url: URL }
  | { ok: false; error: string; status: number };

export function resolveRedirectTarget(
  programDestination: string | null | undefined,
  optionalUrl: string | undefined,
): RedirectResolution {
  if (!programDestination) {
    return { ok: false, error: "Program destination not configured", status: 503 };
  }

  const base = parseHttpUrl(programDestination);
  if (!base) {
    return { ok: false, error: "Program destination not configured", status: 503 };
  }

  if (!optionalUrl) {
    return { ok: true, url: base };
  }

  const override = parseHttpUrl(optionalUrl);
  if (!override) {
    return { ok: false, error: "Invalid or disallowed destination URL", status: 400 };
  }

  if (!hostsMatch(base, override)) {
    return { ok: false, error: "Destination host not allowed", status: 400 };
  }

  return { ok: true, url: override };
}

export function buildTrackingUrl(appUrl: string, affiliateCode: string): string {
  return `${appUrl.replace(/\/$/, "")}/r/${affiliateCode}`;
}

export const CONVERSION_SNIPPET = (appUrl: string) =>
  `(function(){var k="YOUR_PROGRAM_KEY",b="${appUrl}/api/v1/convert",q=new URLSearchParams(location.search).get("velo_ref");if(q){try{localStorage.setItem("velo_ref",q)}catch(e){}}var r="";try{r=localStorage.getItem("velo_ref")||""}catch(e){}fetch(b,{method:"POST",headers:{"Content-Type":"application/json","X-Program-Key":k},body:JSON.stringify({order_id:window.__VELO_ORDER_ID||"",amount:window.__VELO_AMOUNT||0,affiliate_code:r})})})();`;
