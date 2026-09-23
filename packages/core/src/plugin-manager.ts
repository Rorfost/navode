import type { NavodeCapability } from '@navode/platform-sdk';
import type { PluginRegistryEntry } from '@navode/platform-sdk';
import { NAVODE_PLATFORM_API_VERSION, validateExtensionManifest } from '@navode/platform-sdk';
import type { NavodeSettings } from './index';

export interface PluginEnableResult {
  success: boolean;
  error?: string;
  settings?: NavodeSettings;
}

/**
 * Enables a plugin from its registry entry and returns updated settings.
 *
 * Validates that:
 * - The plugin is not already installed
 * - The manifest is valid per the current platform API version
 * - All declared capabilities are known
 *
 * Does not execute any code from the plugin manifest. The plugin is added
 * to `installedPlugins` with `enabled: true`.
 */
export function enablePlugin(
  settings: NavodeSettings,
  entry: PluginRegistryEntry,
): PluginEnableResult {
  // Check for duplicate
  if (settings.installedPlugins.some((p) => p.id === entry.id)) {
    return { success: false, error: `Plugin "${entry.id}" is already installed.` };
  }

  // Validate platform API compatibility
  if (entry.compatiblePlatformApiVersion !== NAVODE_PLATFORM_API_VERSION) {
    return {
      success: false,
      error: `Plugin targets Platform API v${entry.compatiblePlatformApiVersion}, but Navode supports v${NAVODE_PLATFORM_API_VERSION}.`,
    };
  }

  // Re-validate the manifest to ensure integrity
  const validation = validateExtensionManifest(entry.manifest);
  if (!validation.valid) {
    const firstError = validation.errors[0];
    return {
      success: false,
      error: `Manifest validation failed: ${firstError?.message ?? 'unknown error'}`,
    };
  }

  const enabledEntry: PluginRegistryEntry = { ...entry, enabled: true };
  return {
    success: true,
    settings: {
      ...settings,
      installedPlugins: [...settings.installedPlugins, enabledEntry],
    },
  };
}

/**
 * Disables a plugin by id and returns updated settings.
 *
 * The plugin's configuration remains in settings so it can be re-enabled.
 * To fully remove a plugin use `uninstallPlugin`.
 */
export function disablePlugin(settings: NavodeSettings, pluginId: string): NavodeSettings {
  return {
    ...settings,
    installedPlugins: settings.installedPlugins.map((p) =>
      p.id === pluginId ? { ...p, enabled: false } : p,
    ),
    activeThemePlugin: settings.activeThemePlugin === pluginId ? null : settings.activeThemePlugin,
  };
}

/**
 * Fully removes a plugin from settings.
 *
 * If the plugin was the active theme, the theme is cleared.
 */
export function uninstallPlugin(settings: NavodeSettings, pluginId: string): NavodeSettings {
  return {
    ...settings,
    installedPlugins: settings.installedPlugins.filter((p) => p.id !== pluginId),
    activeThemePlugin: settings.activeThemePlugin === pluginId ? null : settings.activeThemePlugin,
  };
}

/**
 * Returns the set of capabilities granted to a plugin.
 * Only capabilities present in the installed, enabled plugin's manifest
 * are returned. If the plugin is disabled, returns an empty set.
 */
export function getGrantedCapabilities(plugin: PluginRegistryEntry): ReadonlySet<NavodeCapability> {
  if (!plugin.enabled) return new Set();
  return new Set(plugin.capabilities);
}

/**
 * Returns true if the plugin has been granted the specified capability.
 */
export function hasCapability(plugin: PluginRegistryEntry, capability: NavodeCapability): boolean {
  return getGrantedCapabilities(plugin).has(capability);
}

/**
 * Sets the active theme plugin. Validates that the plugin is installed,
 * enabled, and has the `theme` capability.
 *
 * Returns updated settings on success, or the original settings with an
 * error string if validation fails.
 */
export function setActiveThemePlugin(
  settings: NavodeSettings,
  pluginId: string | null,
): { settings: NavodeSettings; error?: string } {
  if (pluginId === null) {
    return { settings: { ...settings, activeThemePlugin: null } };
  }

  const plugin = settings.installedPlugins.find((p) => p.id === pluginId);
  if (!plugin) {
    return { settings, error: `Plugin "${pluginId}" is not installed.` };
  }
  if (!plugin.enabled) {
    return { settings, error: `Plugin "${pluginId}" is not enabled.` };
  }
  if (!hasCapability(plugin, 'theme')) {
    return { settings, error: `Plugin "${pluginId}" does not have the "theme" capability.` };
  }

  return { settings: { ...settings, activeThemePlugin: pluginId } };
}
