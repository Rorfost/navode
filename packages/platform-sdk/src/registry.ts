import type { NavodeCapability } from './capabilities';
import type { NavodeExtensionManifest } from './extension-manifest';

/**
 * Publication status of an entry in the plugin registry.
 *
 * - `official`: Published by the Navode / Rorfost team.
 * - `community`: Submitted by a third-party publisher, listed after a review
 *   process. Navode makes no security guarantee beyond manifest validation.
 * - `unverified`: Sideloaded or self-hosted; not reviewed by the Navode team.
 *   Navode clearly surfaces this status to the user before enabling.
 *
 * Do not imply a security review has occurred when it has not.
 */
export type PluginStatus = 'official' | 'community' | 'unverified';

/**
 * A registry entry representing a published or locally installed extension.
 *
 * The registry is the source of truth for discovery, installation, and update
 * metadata. It does not contain executable code.
 */
export interface PluginRegistryEntry {
  /** Unique extension id matching `NavodeExtensionManifest.id`. */
  id: string;
  /** Human-readable name. */
  name: string;
  /** Publisher name or organisation. */
  publisher: string;
  /** Semantic version string of the installed/available version. */
  version: string;
  /** Short description. */
  description: string;
  /** Declared capabilities as listed in the extension manifest. */
  capabilities: readonly NavodeCapability[];
  /**
   * Navode Platform API version this extension targets.
   * Used to detect incompatibility with the running Navode version.
   */
  compatiblePlatformApiVersion: string;
  /**
   * SHA-256 hex digest of the canonical manifest JSON.
   * Navode checks this when installing from a registry to detect tampering.
   * May be empty for unverified/sideloaded plugins.
   */
  integrityHash: string;
  /** Publication/review status. Always shown to the user before enabling. */
  status: PluginStatus;
  /** Whether this plugin is currently enabled in Navode. */
  enabled: boolean;
  /**
   * ISO 8601 date string of when this entry was last installed or updated.
   * Used to surface "update available" notices.
   */
  installedAt: string;
  /**
   * The full validated manifest. Stored locally so Navode can render plugin
   * details without a network request.
   */
  manifest: NavodeExtensionManifest;
}

/**
 * Creates a `PluginRegistryEntry` for a locally validated manifest.
 * Status is set to `unverified` since sideloaded plugins have not been
 * reviewed by the Navode team.
 */
export function createLocalPluginEntry(
  manifest: NavodeExtensionManifest,
  integrityHash = '',
): PluginRegistryEntry {
  return {
    id: manifest.id,
    name: manifest.name,
    publisher: manifest.publisher,
    version: manifest.version,
    description: manifest.description,
    capabilities: manifest.capabilities,
    compatiblePlatformApiVersion: manifest.platformApiVersion,
    integrityHash,
    status: 'unverified',
    enabled: false,
    installedAt: new Date().toISOString(),
    manifest,
  };
}
