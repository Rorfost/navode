import type { SyncStatus } from './sync';

export type ManagedDevice = {
  id: string;
  label: string;
  lastSeenAt?: string;
  status: 'active' | 'revoked';
  isCurrent: boolean;
};

export type SyncHealth = {
  status: SyncStatus;
  lastSuccessfulSyncAt?: string;
  pendingOperationCount: number;
};

export type CloudRestorePlan = {
  backupId: string;
  exportedAt: string;
  requiresConfirmation: true;
  warning: 'Replacing local data cannot be undone. Export a local JSON backup first.';
};

export function normalizeDeviceLabel(label: string): string {
  const value = label.trim().replace(/\s+/gu, ' ');
  if (value.length < 1 || value.length > 80)
    throw new Error('Device names must be 1 to 80 characters.');
  return value;
}

export function createRestorePlan(backupId: string, exportedAt: string): CloudRestorePlan {
  return {
    backupId,
    exportedAt,
    requiresConfirmation: true,
    warning: 'Replacing local data cannot be undone. Export a local JSON backup first.',
  };
}

export function canReplaceLocalData(confirmation: string): boolean {
  return confirmation === 'REPLACE_LOCAL_DATA';
}
