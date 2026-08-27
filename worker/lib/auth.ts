export const REF_COOKIE = "_velo_ref";
const REF_MAX_AGE = 60 * 60 * 24 * 30;

export function affiliateCookie(code: string, secure: boolean): string {
  const parts = [
    `${REF_COOKIE}=${encodeURIComponent(code)}`,
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${REF_MAX_AGE}`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function readAffiliateCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const raw = parseCookie(cookieHeader)[REF_COOKIE];
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return null;
  }
}

function parseCookie(header: string): Record<string, string> {
  return Object.fromEntries(
    header.split(";").map((part) => {
      const [key, ...rest] = part.trim().split("=");
      return [key, rest.join("=")];
    }),
  );
}

export function isSecureRequest(url: URL): boolean {
  return url.protocol === "https:";
}
