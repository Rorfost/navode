import { NAVODE_PLATFORM_API_VERSION, parseCapability } from './capabilities';
import type { NavodeExtensionManifest } from './extension-manifest';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  manifest?: NavodeExtensionManifest;
}

/**
 * Validates an unknown value as a `NavodeExtensionManifest`.
 *
 * This is a pure function with no side effects. It performs structural
 * validation and domain-rule checks. Use it in developer tooling, the
 * plugin installation flow, and tests.
 *
 * Validation rules enforced:
 * - Required string fields: id, name, publisher, version, description
 * - id must be reverse-domain-style (letters, digits, dots, hyphens)
 * - version must be a valid semver string (X.Y.Z)
 * - platformApiVersion must match the supported version
 * - capabilities must be a non-empty array of known capability strings
 * - network: capabilities must specify a non-wildcard hostname
 * - commands require the `commands` capability
 * - widgets require the `widgets` capability
 * - workflowActions require the `workflow-actions` capability
 * - themes require the `theme` capability
 * - theme token keys must be approved CSS custom property names
 * - widget/command URLs must use the https scheme
 * - settings field types must be string | number | boolean
 */
export function validateExtensionManifest(value: unknown): ValidationResult {
  const errors: ValidationError[] = [];

  if (!isRecord(value)) {
    return {
      valid: false,
      errors: [{ field: 'root', message: 'Manifest must be a JSON object.' }],
    };
  }

  // Required string fields
  for (const field of ['id', 'name', 'publisher', 'version', 'description'] as const) {
    if (typeof value[field] !== 'string' || (value[field] as string).trim() === '') {
      errors.push({ field, message: `${field} is required and must be a non-empty string.` });
    }
  }

  // id format: reverse-domain style
  if (typeof value.id === 'string' && !/^[a-zA-Z][a-zA-Z0-9.-]*$/.test(value.id)) {
    errors.push({
      field: 'id',
      message: 'id must start with a letter and contain only letters, digits, dots, or hyphens.',
    });
  }

  // version: basic semver
  if (typeof value.version === 'string' && !/^\d+\.\d+\.\d+/.test(value.version)) {
    errors.push({ field: 'version', message: 'version must follow semantic versioning (X.Y.Z).' });
  }

  // platformApiVersion
  if (value.platformApiVersion !== NAVODE_PLATFORM_API_VERSION) {
    errors.push({
      field: 'platformApiVersion',
      message: `platformApiVersion must be "${NAVODE_PLATFORM_API_VERSION}". Found: ${String(value.platformApiVersion)}.`,
    });
  }

  // capabilities
  if (!Array.isArray(value.capabilities) || value.capabilities.length === 0) {
    errors.push({
      field: 'capabilities',
      message: 'capabilities must be a non-empty array of capability strings.',
    });
  } else {
    const parsedCapabilities = new Set<string>();
    for (const cap of value.capabilities) {
      const parsed = parseCapability(String(cap));
      if (!parsed) {
        errors.push({
          field: 'capabilities',
          message: `Unknown or invalid capability: "${String(cap)}".`,
        });
      } else {
        parsedCapabilities.add(parsed);
      }
    }

    // Gate checks
    if (Array.isArray(value.commands) && value.commands.length > 0) {
      if (!parsedCapabilities.has('commands')) {
        errors.push({
          field: 'commands',
          message: 'commands requires the "commands" capability.',
        });
      }
      for (const cmd of value.commands) {
        if (!isRecord(cmd)) continue;
        if (typeof cmd.url === 'string' && !cmd.url.startsWith('https://')) {
          errors.push({
            field: 'commands[].url',
            message: 'Command URLs must use the https scheme.',
          });
        }
      }
    }

    if (Array.isArray(value.widgets) && value.widgets.length > 0) {
      if (!parsedCapabilities.has('widgets')) {
        errors.push({ field: 'widgets', message: 'widgets requires the "widgets" capability.' });
      }
      for (const widget of value.widgets) {
        if (!isRecord(widget)) continue;
        if (typeof widget.actionUrl === 'string' && !widget.actionUrl.startsWith('https://')) {
          errors.push({
            field: 'widgets[].actionUrl',
            message: 'Widget action URLs must use the https scheme.',
          });
        }
      }
    }

    if (Array.isArray(value.workflowActions) && value.workflowActions.length > 0) {
      if (!parsedCapabilities.has('workflow-actions')) {
        errors.push({
          field: 'workflowActions',
          message: 'workflowActions requires the "workflow-actions" capability.',
        });
      }
    }

    if (Array.isArray(value.themes) && value.themes.length > 0) {
      if (!parsedCapabilities.has('theme')) {
        errors.push({ field: 'themes', message: 'themes requires the "theme" capability.' });
      }
      const approvedTokens = new Set([
        '--background',
        '--surface',
        '--surface-raised',
        '--text',
        '--muted',
        '--faint',
        '--border',
        '--accent',
        '--accent-strong',
        '--focus',
        '--radius-card',
        '--radius-button',
        '--font-family',
      ]);
      for (const theme of value.themes) {
        if (!isRecord(theme) || !isRecord(theme.tokens)) continue;
        for (const key of Object.keys(theme.tokens)) {
          if (!approvedTokens.has(key)) {
            errors.push({
              field: 'themes[].tokens',
              message: `Token "${key}" is not an approved design token.`,
            });
          }
        }
      }
    }
  }

  // settings field types
  if (Array.isArray(value.settings)) {
    for (const field of value.settings) {
      if (!isRecord(field)) continue;
      if (!['string', 'number', 'boolean'].includes(String(field.type))) {
        errors.push({
          field: 'settings[].type',
          message: `Settings field type must be "string", "number", or "boolean". Found: "${String(field.type)}".`,
        });
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    manifest: value as unknown as NavodeExtensionManifest,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
