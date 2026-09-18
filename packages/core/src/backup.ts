import { z } from 'zod';
import { isSafeExternalUrl } from './command-engine';
import { parseNavodeSettings, type NavodeSettings } from './index';

export const NAVODE_BACKUP_SCHEMA_VERSION = 1;
const MAX_BACKUP_BYTES = 1_000_000;

export interface NavodeBackup {
  data: NavodeSettings;
  exportedAt: string;
  schemaVersion: typeof NAVODE_BACKUP_SCHEMA_VERSION;
}

export type BackupImportResult =
  | { backup: NavodeBackup; errors: []; success: true }
  | { errors: string[]; success: false };

const safeUrl = z.string().refine(isSafeExternalUrl, 'must use an http or https URL');
const settingsDataSchema = z
  .object({
    schemaVersion: z.number().int().min(1).max(4),
    theme: z.enum(['dark', 'light', 'system']).optional(),
    onboardingCompleted: z.boolean().optional(),
    defaultSearchProvider: z.enum(['google', 'youtube']).optional(),
    initialQuickLinks: z.boolean().optional(),
    customAliases: z
      .array(z.object({ id: z.string().min(1), alias: z.string(), label: z.string(), urlTemplate: safeUrl }))
      .optional(),
    quickLinks: z
      .array(
        z.object({
          id: z.string().min(1),
          name: z.string(),
          url: safeUrl,
          order: z.number().finite().optional(),
          alias: z.string().optional(),
          enabled: z.boolean().optional(),
          group: z.string().optional(),
          icon: z.string().optional(),
          showOnHome: z.boolean().optional(),
        }),
      )
      .optional(),
    projects: z
      .array(
        z.object({
          id: z.string().min(1),
          name: z.string(),
          description: z.string().optional(),
          icon: z.string().optional(),
          showOnHome: z.boolean().optional(),
          actions: z
            .array(
              z.object({
                id: z.string().min(1),
                label: z.string(),
                url: safeUrl,
                kind: z.enum(['repository', 'frontend', 'backend', 'deployment', 'database', 'docs', 'custom']),
                icon: z.string().optional(),
              }),
            )
            .optional(),
        }),
      )
      .optional(),
    workspaces: z
      .array(
        z.object({
          id: z.string().min(1),
          name: z.string(),
          order: z.number().finite().optional(),
          description: z.string().optional(),
          showOnHome: z.boolean().optional(),
          items: z.array(z.object({ id: z.string().min(1), label: z.string(), url: safeUrl })).optional(),
        }),
      )
      .optional(),
    recentExecutions: z.array(z.object({ id: z.string(), label: z.string(), performedAt: z.string(), actionType: z.string() })).optional(),
    scratchpad: z.object({ content: z.string().max(20_000) }).optional(),
    snippets: z
      .array(z.object({ id: z.string().min(1), title: z.string(), content: z.string(), tags: z.array(z.string()).optional(), alias: z.string().optional() }))
      .optional(),
    focusTimer: z
      .object({
        durationMinutes: z.number().int().min(1).max(180),
        remainingSeconds: z.number().int().nonnegative(),
        status: z.enum(['idle', 'running', 'paused', 'completed']),
        endsAt: z.string().datetime().optional(),
      })
      .optional(),
    todayItems: z.array(z.object({ id: z.string().min(1), title: z.string(), completed: z.boolean() })).max(3).optional(),
    homeSections: z.object({ quickAccess: z.boolean(), projects: z.boolean(), workspaces: z.boolean(), productivity: z.boolean() }).optional(),
    focusPresets: z.array(z.number().int().min(1).max(180)).max(5).optional(),
    reducedMotion: z.enum(['system', 'reduce']).optional(),
    recordRecentActions: z.boolean().optional(),
  })
  .passthrough();

const backupSchema = z
  .object({
    schemaVersion: z.literal(NAVODE_BACKUP_SCHEMA_VERSION),
    exportedAt: z.string().datetime(),
    data: settingsDataSchema,
  })
  .strict();

export function createNavodeBackup(settings: NavodeSettings, exportedAt = new Date().toISOString()): NavodeBackup {
  return { data: settings, exportedAt, schemaVersion: NAVODE_BACKUP_SCHEMA_VERSION };
}

export function serializeNavodeBackup(settings: NavodeSettings, exportedAt = new Date().toISOString()): string {
  return JSON.stringify(createNavodeBackup(settings, exportedAt), null, 2);
}

export function parseNavodeBackup(value: string): BackupImportResult {
  if (new TextEncoder().encode(value).byteLength > MAX_BACKUP_BYTES) {
    return { errors: ['Backup files must be smaller than 1 MB.'], success: false };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value) as unknown;
  } catch {
    return { errors: ['This file is not valid JSON.'], success: false };
  }

  const validated = backupSchema.safeParse(parsed);
  if (!validated.success) {
    return {
      errors: validated.error.issues.map((issue) => `${issue.path.join('.') || 'backup'}: ${issue.message}`),
      success: false,
    };
  }

  return {
    backup: {
      data: parseNavodeSettings(validated.data.data),
      exportedAt: validated.data.exportedAt,
      schemaVersion: NAVODE_BACKUP_SCHEMA_VERSION,
    },
    errors: [],
    success: true,
  };
}
