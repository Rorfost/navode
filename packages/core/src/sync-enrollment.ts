import type { NavodeSettings } from './index';

export type SyncEnrollmentStage = 'local-only' | 'account-ready' | 'previewed' | 'opted-in';

export type SyncUploadPreview = {
  excluded: readonly ['scratchpad', 'recentExecutions'];
  included: readonly [
    'aliases',
    'integration configuration metadata',
    'preferences',
    'projects',
    'quick links',
    'snippets',
    'today items',
    'workspaces',
  ];
  requiresConfirmation: true;
};

export function createSyncUploadPreview(_settings: NavodeSettings): SyncUploadPreview {
  // The settings argument makes this the single client-side opt-in boundary.
  // Counts/content remain on-device until the upload is explicitly confirmed.
  return {
    excluded: ['scratchpad', 'recentExecutions'],
    included: [
      'aliases',
      'integration configuration metadata',
      'preferences',
      'projects',
      'quick links',
      'snippets',
      'today items',
      'workspaces',
    ],
    requiresConfirmation: true,
  };
}

export function canStartInitialSync(confirmation: string): boolean {
  return confirmation === 'START_INITIAL_SYNC';
}
