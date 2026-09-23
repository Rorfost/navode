/**
 * @navode/platform-sdk
 *
 * Navode Platform API — types, capability model, registry helpers, and
 * manifest validation for Navode extension developers.
 *
 * This package is framework-free and has no runtime dependencies.
 * It can be used in developer tooling, build pipelines, and test harnesses.
 */

// Capabilities
export {
  NAVODE_PLATFORM_API_VERSION,
  THEME_PLUGIN_ALLOWED_CAPABILITIES,
  capabilityAllowsHost,
  parseCapability,
} from './capabilities';
export type { NavodeCapability, NavodePlatformApiVersion } from './capabilities';

// Extension manifest types
export type {
  NavodeExtensionCommand,
  NavodeExtensionManifest,
  NavodeExtensionSettingsField,
  NavodeExtensionTheme,
  NavodeExtensionWidget,
  NavodeExtensionWorkflowAction,
  NavodeThemeTokens,
} from './extension-manifest';

// Plugin registry
export { createLocalPluginEntry } from './registry';
export type { PluginRegistryEntry, PluginStatus } from './registry';

// Validator
export { validateExtensionManifest } from './validator';
export type { ValidationError, ValidationResult } from './validator';
