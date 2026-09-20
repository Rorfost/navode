import type { NavodeSettings } from './index';

export type SyncEntityKind =
  | 'alias'
  | 'integration-configuration'
  | 'preference'
  | 'project'
  | 'quick-link'
  | 'snippet'
  | 'today-item'
  | 'workspace';

export type SyncStatus = 'local-only' | 'synced' | 'syncing' | 'paused' | 'error';

export type EntityVersion = { counter: number; deviceId: string };

export type SyncEntity = {
  deleted: boolean;
  id: string;
  kind: SyncEntityKind;
  value: unknown;
  version: EntityVersion;
};

export type SyncOperation = {
  entity: SyncEntity;
  operationId: string;
};

export type SyncConflict = { local: SyncEntity; remote: SyncEntity };

export type SyncState = {
  appliedOperationIds: readonly string[];
  conflicts: readonly SyncConflict[];
  entities: Readonly<Record<string, SyncEntity>>;
  pendingOperations: readonly SyncOperation[];
  serverRevision: number;
  status: SyncStatus;
};

const MAX_OPERATION_IDS = 500;

export function createSyncState(): SyncState {
  return {
    appliedOperationIds: [],
    conflicts: [],
    entities: {},
    pendingOperations: [],
    serverRevision: 0,
    status: 'local-only',
  };
}

export function queueLocalEntity(
  state: SyncState,
  input: {
    deviceId: string;
    id: string;
    kind: SyncEntityKind;
    operationId: string;
    value: unknown;
    deleted?: boolean;
  },
): SyncState {
  const key = entityKey(input.kind, input.id);
  const prior = state.entities[key];
  const entity: SyncEntity = {
    deleted: input.deleted === true,
    id: input.id,
    kind: input.kind,
    value: input.value,
    version: { counter: (prior?.version.counter ?? 0) + 1, deviceId: input.deviceId },
  };
  return {
    ...state,
    entities: { ...state.entities, [key]: entity },
    pendingOperations: [...state.pendingOperations, { entity, operationId: input.operationId }],
    status: 'syncing',
  };
}

export function acknowledgeSyncOperations(
  state: SyncState,
  operationIds: readonly string[],
  serverRevision: number,
): SyncState {
  const acknowledged = new Set(operationIds);
  return {
    ...state,
    appliedOperationIds: boundedIds([...state.appliedOperationIds, ...operationIds]),
    pendingOperations: state.pendingOperations.filter(
      (operation) => !acknowledged.has(operation.operationId),
    ),
    serverRevision: Math.max(state.serverRevision, serverRevision),
    status: state.pendingOperations.some((operation) => !acknowledged.has(operation.operationId))
      ? 'syncing'
      : 'synced',
  };
}

export function reconcileRemoteOperations(
  state: SyncState,
  input: { operations: readonly SyncOperation[]; serverRevision: number },
): SyncState {
  const entities = { ...state.entities };
  const conflicts = [...state.conflicts];
  const appliedOperationIds = [...state.appliedOperationIds];

  for (const operation of input.operations) {
    if (appliedOperationIds.includes(operation.operationId)) continue;
    const key = entityKey(operation.entity.kind, operation.entity.id);
    const local = entities[key];
    const pending = state.pendingOperations.find(
      (candidate) => entityKey(candidate.entity.kind, candidate.entity.id) === key,
    );
    if (local && pending && compareEntityVersions(local.version, operation.entity.version) !== 0) {
      conflicts.push({ local, remote: operation.entity });
    }
    if (!local || compareEntityVersions(operation.entity.version, local.version) > 0) {
      entities[key] = operation.entity;
    }
    appliedOperationIds.push(operation.operationId);
  }

  return {
    ...state,
    appliedOperationIds: boundedIds(appliedOperationIds),
    conflicts,
    entities,
    serverRevision: Math.max(state.serverRevision, input.serverRevision),
    status: state.pendingOperations.length ? 'syncing' : 'synced',
  };
}

export function compareEntityVersions(left: EntityVersion, right: EntityVersion): number {
  if (left.counter !== right.counter) return left.counter - right.counter;
  return left.deviceId.localeCompare(right.deviceId);
}

export function collectSyncEntities(settings: NavodeSettings, deviceId: string): SyncEntity[] {
  const version = { counter: 1, deviceId };
  return [
    ...settings.quickLinks.map((value) => entity('quick-link', value.id, value, version)),
    ...settings.projects.map((value) => entity('project', value.id, value, version)),
    ...settings.workspaces.map((value) => entity('workspace', value.id, value, version)),
    ...settings.customAliases.map((value) => entity('alias', value.id, value, version)),
    ...settings.snippets.map((value) => entity('snippet', value.id, value, version)),
    ...settings.todayItems.map((value) => entity('today-item', value.id, value, version)),
    entity(
      'preference',
      'preferences',
      {
        defaultSearchProvider: settings.defaultSearchProvider,
        focusPresets: settings.focusPresets,
        homeSections: settings.homeSections,
        integrationWidgets: settings.integrationWidgets,
        reducedMotion: settings.reducedMotion,
        theme: settings.theme,
      },
      version,
    ),
    entity(
      'integration-configuration',
      'integrations',
      {
        competitiveProgramming: settings.competitiveProgramming,
        integrations: settings.integrations,
        projectHealthTargets: settings.projectHealthTargets,
      },
      version,
    ),
  ];
}

function entity(
  kind: SyncEntityKind,
  id: string,
  value: unknown,
  version: EntityVersion,
): SyncEntity {
  return { deleted: false, id, kind, value, version };
}

function entityKey(kind: SyncEntityKind, id: string): string {
  return `${kind}:${id}`;
}

function boundedIds(ids: readonly string[]): string[] {
  return [...new Set(ids)].slice(-MAX_OPERATION_IDS);
}
