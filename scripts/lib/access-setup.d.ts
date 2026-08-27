export type PublicDestination = { type: "public"; uri: string };

export const APP_NAME: string;
export const LEGACY_APP_NAME: string;
export const POLICY_NAME: string;
export const FORBIDDEN_PROTECTED_URI_PATTERNS: RegExp[];

export function parseCommaSeparated(value: string | undefined | null): string[];
export function apexHostAliases(appHost: string): string[];
export function buildProtectedDestinations(hosts: string[]): PublicDestination[];
export function assertDestinationsDoNotWrapPublicRoutes(
  destinations: PublicDestination[],
): void;
export function buildAllowPolicyInclude(
  emails: string[],
  domains: string[],
): Record<string, unknown>[];
export function buildAllowPolicy(
  emails: string[],
  domains: string[],
): {
  decision: string;
  name: string;
  include: Record<string, unknown>[];
};
export function sanitizeAuthDomain(appHost: string): string;
export function teamDomainFromAuthDomain(authDomain: string): string;
export function extractPolicyAud(
  app: Record<string, unknown> | null | undefined,
): string | null;
export function appMatchesVeloInstall(
  app: Record<string, unknown>,
  appHost: string,
): boolean;
export function findVeloAccessApp(
  apps: Record<string, unknown>[],
  appHost: string,
): Record<string, unknown> | undefined;
export function buildAccessApplicationBody(
  appHost: string,
  emails: string[],
  domains: string[],
): Record<string, unknown>;
