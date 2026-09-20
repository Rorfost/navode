import { describe, expect, it } from 'vitest';
import {
  acknowledgeSyncOperations,
  collectSyncEntities,
  createSyncState,
  DEFAULT_NAVODE_SETTINGS,
  queueLocalEntity,
  reconcileRemoteOperations,
} from '../src';

describe('local-first sync state', () => {
  it('keeps an offline local write queued until it is acknowledged', () => {
    const queued = queueLocalEntity(createSyncState(), {
      deviceId: 'device-a',
      id: 'link-1',
      kind: 'quick-link',
      operationId: 'op-1',
      value: { name: 'Docs' },
    });
    expect(queued.pendingOperations).toHaveLength(1);
    expect(acknowledgeSyncOperations(queued, ['op-1'], 1)).toMatchObject({
      pendingOperations: [],
      status: 'synced',
    });
  });

  it('is idempotent for duplicate remote retries', () => {
    const operation = {
      operationId: 'op-1',
      entity: {
        deleted: false,
        id: 'link-1',
        kind: 'quick-link' as const,
        value: {},
        version: { counter: 1, deviceId: 'device-a' },
      },
    };
    const first = reconcileRemoteOperations(createSyncState(), {
      operations: [operation],
      serverRevision: 1,
    });
    expect(
      reconcileRemoteOperations(first, { operations: [operation], serverRevision: 1 })
        .appliedOperationIds,
    ).toEqual(['op-1']);
  });

  it('records same-record conflicts without replacing a newer local entity', () => {
    const local = queueLocalEntity(createSyncState(), {
      deviceId: 'device-z',
      id: 'link-1',
      kind: 'quick-link',
      operationId: 'local',
      value: { name: 'Local' },
    });
    const reconciled = reconcileRemoteOperations(local, {
      operations: [
        {
          operationId: 'remote',
          entity: {
            deleted: false,
            id: 'link-1',
            kind: 'quick-link',
            value: { name: 'Remote' },
            version: { counter: 1, deviceId: 'device-a' },
          },
        },
      ],
      serverRevision: 2,
    });
    expect(reconciled.conflicts).toHaveLength(1);
    expect(reconciled.entities['quick-link:link-1']?.value).toEqual({ name: 'Local' });
  });

  it('propagates a newer deletion tombstone and preserves partial failures', () => {
    const queued = queueLocalEntity(createSyncState(), {
      deviceId: 'device-a',
      id: 'link-1',
      kind: 'quick-link',
      operationId: 'one',
      value: {},
    });
    const twiceQueued = queueLocalEntity(queued, {
      deviceId: 'device-a',
      id: 'link-2',
      kind: 'quick-link',
      operationId: 'two',
      value: {},
    });
    const partial = acknowledgeSyncOperations(twiceQueued, ['one'], 1);
    const reconciled = reconcileRemoteOperations(partial, {
      operations: [
        {
          operationId: 'delete',
          entity: {
            deleted: true,
            id: 'link-1',
            kind: 'quick-link',
            value: null,
            version: { counter: 3, deviceId: 'device-b' },
          },
        },
      ],
      serverRevision: 2,
    });
    expect(partial.pendingOperations.map((operation) => operation.operationId)).toEqual(['two']);
    expect(reconciled.entities['quick-link:link-1']?.deleted).toBe(true);
  });

  it('excludes scratchpad and recent history from the default sync set', () => {
    const entities = collectSyncEntities(
      {
        ...DEFAULT_NAVODE_SETTINGS,
        recentExecutions: [
          {
            actionType: 'show-help',
            id: 'recent',
            label: 'Recent',
            performedAt: new Date().toISOString(),
          },
        ],
        scratchpad: { content: 'private note' },
      },
      'device-a',
    );
    expect(entities.some((entity) => JSON.stringify(entity.value).includes('private note'))).toBe(
      false,
    );
    expect(entities.some((entity) => JSON.stringify(entity.value).includes('Recent'))).toBe(false);
  });
});
