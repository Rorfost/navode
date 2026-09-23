import type { NavodeCapability, NavodePlatformApiVersion } from './capabilities';

/**
 * A command registered by an extension.
 *
 * When the user types the `alias` in the Navode command bar, the command
 * result is shown with the supplied `label` and `description`.
 * The `url` is opened in a new tab when the user selects it.
 *
 * Extensions may only register commands if they declare the `commands`
 * capability in their manifest.
 */
export interface NavodeExtensionCommand {
  /** Unique alias within this extension (e.g. "myplugin:search"). */
  alias: string;
  /** Human-readable label shown in command results. */
  label: string;
  /** Short description shown beneath the label. */
  description: string;
  /**
   * Safe https URL to open when the command is selected.
   * `{query}` is replaced with the user's search text when present.
   */
  url: string;
}

/**
 * A widget registered by an extension.
 *
 * Widgets appear as cards on the Navode home screen. The content is static
 * text/metadata declared in the manifest — extensions cannot inject scripts
 * or arbitrary HTML. Navode renders the widget using its own design system.
 *
 * Extensions may only register widgets if they declare the `widgets`
 * capability in their manifest.
 */
export interface NavodeExtensionWidget {
  /** Unique widget identifier within this extension. */
  id: string;
  /** Section kicker label (all-caps short string). */
  kicker: string;
  /** Widget title shown in the card header. */
  title: string;
  /** Optional description line shown beneath the title. */
  description?: string;
  /**
   * An https URL to open when the user clicks the primary widget action.
   * Must use the https scheme.
   */
  actionUrl?: string;
  /** Label for the primary action button. */
  actionLabel?: string;
}

/**
 * A workflow action registered by an extension.
 *
 * Workflow actions extend the set of step types available in the Navode
 * workflow builder. The action opens a URL or triggers a declared side effect.
 * Extensions may only register workflow actions if they declare the
 * `workflow-actions` capability.
 */
export interface NavodeExtensionWorkflowAction {
  /** Unique action kind identifier, namespaced by extension id (e.g. "myplugin:open-dashboard"). */
  kind: string;
  /** Human-readable label for this action type in the workflow builder. */
  label: string;
  /** Short description. */
  description: string;
  /**
   * If this action opens a URL, provide the https URL template.
   * `{param}` placeholders are replaced with workflow step parameters.
   */
  urlTemplate?: string;
}

/**
 * A theme declared by an extension.
 *
 * Themes override Navode's CSS design tokens. Only the approved token names
 * listed in `NavodeThemeTokens` may be overridden. Extensions must not inject
 * JavaScript or arbitrary CSS rules — only token values are accepted.
 *
 * Extensions may only declare themes if they have the `theme` capability.
 */
export interface NavodeExtensionTheme {
  /** Unique theme id within this extension. */
  id: string;
  /** Human-readable theme name shown in Navode theme settings. */
  name: string;
  /**
   * CSS custom property overrides for approved design tokens.
   * Keys must be one of the approved `NavodeThemeTokens`.
   * Values must be valid CSS color, length, or font-family strings.
   * Navode sanitises values before applying them.
   */
  tokens: Partial<NavodeThemeTokens>;
}

/**
 * The approved set of CSS design token names that themes may override.
 * These map directly to CSS custom properties on `:root`.
 */
export interface NavodeThemeTokens {
  '--background': string;
  '--surface': string;
  '--surface-raised': string;
  '--text': string;
  '--muted': string;
  '--faint': string;
  '--border': string;
  '--accent': string;
  '--accent-strong': string;
  '--focus': string;
  '--radius-card': string;
  '--radius-button': string;
  '--font-family': string;
}

/**
 * A settings field declared by an extension.
 *
 * Settings fields are shown in the plugin's settings panel inside Navode.
 * Only string, number, and boolean values are supported. Values are stored
 * in Navode's local storage under a namespaced key.
 */
export interface NavodeExtensionSettingsField {
  key: string;
  label: string;
  description?: string;
  type: 'string' | 'number' | 'boolean';
  defaultValue?: string | number | boolean;
}

/**
 * The versioned typed manifest for a Navode Platform extension.
 *
 * This is the single source of truth for what an extension declares.
 * Navode validates this against the current Platform API version before
 * enabling the extension.
 *
 * Extensions must not include executable code. The manifest is a pure
 * declarative description of capabilities, metadata, and static content.
 */
export interface NavodeExtensionManifest {
  /**
   * Unique reverse-domain-style extension identifier.
   * Example: "com.example.myplugin"
   */
  id: string;
  /** Human-readable extension name. */
  name: string;
  /** Publisher name or organisation. */
  publisher: string;
  /**
   * Semantic version string.
   * Example: "1.0.0"
   */
  version: string;
  /** Short description of what this extension does. */
  description: string;
  /**
   * The Navode Platform API version this extension targets.
   * Must be a supported version string.
   */
  platformApiVersion: NavodePlatformApiVersion;
  /**
   * Declared capability list. Navode shows these to the user before enabling
   * the extension. Only listed capabilities are accessible.
   */
  capabilities: readonly NavodeCapability[];
  /** Commands registered by this extension. Requires the `commands` capability. */
  commands?: readonly NavodeExtensionCommand[];
  /** Widgets registered by this extension. Requires the `widgets` capability. */
  widgets?: readonly NavodeExtensionWidget[];
  /** Workflow actions registered by this extension. Requires the `workflow-actions` capability. */
  workflowActions?: readonly NavodeExtensionWorkflowAction[];
  /** Themes declared by this extension. Requires the `theme` capability. */
  themes?: readonly NavodeExtensionTheme[];
  /** User-facing settings fields. Values are stored locally, namespaced by extension id. */
  settings?: readonly NavodeExtensionSettingsField[];
}
