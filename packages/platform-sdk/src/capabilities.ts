/**
 * Navode Platform API — supported platform API version string.
 *
 * Extensions declare which version they target. Navode uses this to gate
 * feature availability and to display deprecation notices.
 */
export const NAVODE_PLATFORM_API_VERSION = '1' as const;
export type NavodePlatformApiVersion = typeof NAVODE_PLATFORM_API_VERSION;

/**
 * Declared capabilities that a Navode extension can request.
 *
 * Navode shows these to the user before enabling a plugin. Extensions only
 * receive access to capabilities they have declared and the user has approved.
 *
 * Rules:
 * - An extension must not access resources beyond its declared capabilities.
 * - `network:<hostname>` requests exactly one allowed outbound origin.
 *   Wildcard hostnames are not permitted.
 * - Credential and auth-token access is never granted to third-party plugins.
 * - Arbitrary JavaScript execution in core contexts is not a capability.
 */
export type NavodeCapability =
  | 'commands'
  | 'widgets'
  | 'workflow-actions'
  | 'project-read'
  | 'calendar-summary-read'
  | 'theme'
  | `network:${string}`;

/**
 * A safe subset of capabilities that theme-only plugins may use.
 * Theme plugins must not declare `commands`, `widgets`, or `workflow-actions`.
 */
export const THEME_PLUGIN_ALLOWED_CAPABILITIES: readonly NavodeCapability[] = ['theme'];

/**
 * Parse a capability string and return it as a typed value, or null if invalid.
 *
 * Validates `network:` capabilities to ensure the hostname segment is present
 * and does not contain wildcards.
 */
export function parseCapability(raw: string): NavodeCapability | null {
  if (
    raw === 'commands' ||
    raw === 'widgets' ||
    raw === 'workflow-actions' ||
    raw === 'project-read' ||
    raw === 'calendar-summary-read' ||
    raw === 'theme'
  ) {
    return raw;
  }
  if (raw.startsWith('network:')) {
    const hostname = raw.slice('network:'.length);
    if (hostname.length === 0 || hostname.includes('*')) return null;
    return raw as `network:${string}`;
  }
  return null;
}

/**
 * Returns true if the given extension capability grants outbound network
 * access to the specified hostname.
 */
export function capabilityAllowsHost(capability: NavodeCapability, hostname: string): boolean {
  return capability === `network:${hostname}`;
}
