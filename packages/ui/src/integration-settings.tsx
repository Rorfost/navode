import {
  NAVODE_INTEGRATIONS,
  defaultIntegrationConnection,
  disconnectIntegration,
  createProjectHealthTarget,
  parseCodeforcesHandle,
  type ProjectHealthTarget,
  type IntegrationId,
} from '@navode/integrations';
import type { NavodeSettings } from '@navode/core';
import { type FormEvent, useEffect, useState } from 'react';
import { Button, TextInput } from './primitives';

export interface IntegrationSettingsProps {
  onConnect?: (
    providerId: Extract<IntegrationId, 'github' | 'google-calendar' | 'competitive-programming'>,
  ) => void;
  onDisconnect?: (
    providerId: Extract<IntegrationId, 'github' | 'google-calendar' | 'competitive-programming'>,
  ) => void;
  onRefresh?: (
    providerId: Extract<IntegrationId, 'github' | 'google-calendar' | 'competitive-programming'>,
  ) => void;
  onRefreshAll?: () => void;
  onProjectHealthTargetSave?: (target: ProjectHealthTarget) => Promise<boolean>;
  onSettingsChange: (settings: NavodeSettings) => void;
  settings: NavodeSettings;
}

export function IntegrationSettings({
  onConnect,
  onDisconnect,
  onRefresh,
  onRefreshAll,
  onProjectHealthTargetSave,
  onSettingsChange,
  settings,
}: IntegrationSettingsProps) {
  const [codeforcesHandle, setCodeforcesHandle] = useState(
    settings.competitiveProgramming.codeforcesHandle ?? '',
  );
  const [handleError, setHandleError] = useState('');

  useEffect(
    () => setCodeforcesHandle(settings.competitiveProgramming.codeforcesHandle ?? ''),
    [settings.competitiveProgramming.codeforcesHandle],
  );

  function disconnect(providerId: keyof NavodeSettings['integrations']) {
    onSettingsChange({
      ...settings,
      integrations: {
        ...settings.integrations,
        [providerId]: disconnectIntegration(),
      },
      integrationCache: Object.fromEntries(
        Object.entries(settings.integrationCache).filter(([id]) => id !== providerId),
      ),
    });
    if (
      providerId === 'github' ||
      providerId === 'google-calendar' ||
      providerId === 'competitive-programming'
    )
      onDisconnect?.(providerId);
  }

  function saveCodeforcesHandle() {
    const handle = codeforcesHandle.trim();
    if (handle && !parseCodeforcesHandle(handle)) {
      setHandleError('Use 1–24 letters, numbers, dots, underscores, or hyphens.');
      return;
    }
    setHandleError('');
    onSettingsChange({
      ...settings,
      competitiveProgramming: {
        ...(handle
          ? { ...settings.competitiveProgramming, codeforcesHandle: handle }
          : { showWidget: settings.competitiveProgramming.showWidget }),
      },
    });
  }

  return (
    <section className="settings-section" aria-labelledby="integrations-title">
      <h3 id="integrations-title">Integrations</h3>
      <p className="muted">
        Integrations are optional. Navode keeps working locally while a provider is unavailable.
      </p>
      <ul className="integration-list" aria-label="Available integrations">
        {NAVODE_INTEGRATIONS.all()
          .filter((provider) => provider.id !== 'project-health')
          .map((provider) => {
            const connection = settings.integrations[provider.id] ?? defaultIntegrationConnection();
            const requiredPermissions = provider.permissions.length
              ? provider.permissions.map((permission) => permission.label).join(', ')
              : 'No permissions requested yet';
            return (
              <li key={provider.id}>
                <div className="integration-copy">
                  <strong>{provider.name}</strong>
                  <span>{provider.description}</span>
                  <small>
                    Status: {formatStatus(connection.status)} · Permissions: {requiredPermissions}
                  </small>
                  {connection.lastRefreshAt && (
                    <small>Last refresh: {connection.lastRefreshAt}</small>
                  )}
                  {connection.error && <small role="alert">{connection.error.message}</small>}
                </div>
                <div className="integration-actions">
                  {provider.availability === 'available' && connection.status !== 'connected' && (
                    <Button
                      onClick={() =>
                        (provider.id === 'github' ||
                          provider.id === 'google-calendar' ||
                          provider.id === 'competitive-programming') &&
                        onConnect?.(provider.id)
                      }
                    >
                      {connection.status === 'error' ? 'Reconnect' : 'Connect'}
                    </Button>
                  )}
                  {provider.availability === 'planned' && (
                    <span className="integration-planned">Coming in a later V2 step</span>
                  )}
                  <Button
                    disabled={connection.status !== 'connected' && connection.status !== 'error'}
                    onClick={() => disconnect(provider.id)}
                    variant="quiet"
                  >
                    Disconnect
                  </Button>
                  <Button
                    disabled={connection.status !== 'connected'}
                    onClick={() =>
                      onRefresh?.(
                        provider.id as Extract<
                          IntegrationId,
                          'github' | 'google-calendar' | 'competitive-programming'
                        >,
                      )
                    }
                    variant="quiet"
                  >
                    Refresh
                  </Button>
                </div>
              </li>
            );
          })}
      </ul>
      <div className="integration-handle" aria-label="Codeforces profile">
        <label htmlFor="codeforces-handle">Public Codeforces handle</label>
        <div className="integration-actions">
          <TextInput
            id="codeforces-handle"
            onChange={(event) => setCodeforcesHandle(event.target.value)}
            placeholder="Optional — no default handle"
            value={codeforcesHandle}
          />
          <Button onClick={saveCodeforcesHandle} variant="quiet">
            Save handle
          </Button>
        </div>
        {handleError && <small role="alert">{handleError}</small>}
      </div>
      <p className="muted">
        Navode will explain and request only the permissions needed when a provider becomes
        available.
      </p>
      <section className="settings-section" aria-labelledby="live-widgets-title">
        <div className="section-heading">
          <div>
            <h3 id="live-widgets-title">Live widgets</h3>
            <p className="muted">Choose the live context you want on your home screen.</p>
          </div>
          <Button onClick={onRefreshAll} variant="quiet">
            Refresh visible
          </Button>
        </div>
        <div className="integration-actions" aria-label="Live widget preferences">
          {(
            [
              ['calendar', 'Calendar'],
              ['github', 'GitHub'],
              ['competitiveProgramming', 'Competitive programming'],
              ['projectHealth', 'Project health'],
            ] as const
          ).map(([id, label]) => (
            <Button
              key={id}
              onClick={() =>
                onSettingsChange({
                  ...settings,
                  integrationWidgets: {
                    ...settings.integrationWidgets,
                    [id]: !settings.integrationWidgets[id],
                  },
                })
              }
              variant="quiet"
            >
              {settings.integrationWidgets[id] ? `Hide ${label}` : `Show ${label}`}
            </Button>
          ))}
        </div>
      </section>
      <ProjectHealthSettings
        {...(onProjectHealthTargetSave ? { onProjectHealthTargetSave } : {})}
        onSettingsChange={onSettingsChange}
        settings={settings}
      />
    </section>
  );
}

function ProjectHealthSettings({
  onProjectHealthTargetSave,
  onSettingsChange,
  settings,
}: Pick<IntegrationSettingsProps, 'onProjectHealthTargetSave' | 'onSettingsChange' | 'settings'>) {
  const [label, setLabel] = useState('');
  const [projectId, setProjectId] = useState('');
  const [url, setUrl] = useState('');
  const [expectedStatus, setExpectedStatus] = useState('200');
  const [error, setError] = useState('');

  async function saveTarget(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const target = createProjectHealthTarget({
      id: `health-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      label,
      ...(projectId ? { projectId } : {}),
      url,
      expectedStatus: Number(expectedStatus),
    });
    if (!target) {
      setError(
        'Use a label, an http or https URL without credentials, and an expected status from 100 to 599.',
      );
      return;
    }
    if (settings.projectHealthTargets.some((existing) => existing.url === target.url)) {
      setError('This service URL is already being checked.');
      return;
    }
    if (onProjectHealthTargetSave && !(await onProjectHealthTargetSave(target))) {
      setError('Browser access was not granted for this service URL.');
      return;
    }
    onSettingsChange({
      ...settings,
      projectHealthTargets: [...settings.projectHealthTargets, target],
    });
    setLabel('');
    setProjectId('');
    setUrl('');
    setExpectedStatus('200');
    setError('');
  }

  return (
    <section className="settings-section" aria-labelledby="project-health-title">
      <h3 id="project-health-title">Project health</h3>
      <p className="muted">
        Navode checks only the service URLs you add, from this browser. Results stay on this device
        and may be unavailable when a service blocks browser requests.
      </p>
      {settings.projectHealthTargets.length > 0 && (
        <ul className="integration-list" aria-label="Configured service health checks">
          {settings.projectHealthTargets.map((target) => (
            <li key={target.id}>
              <div className="integration-copy">
                <strong>{target.label}</strong>
                <span>{target.url}</span>
                <small>Expected HTTP {target.expectedStatus}</small>
              </div>
              <Button
                onClick={() =>
                  onSettingsChange({
                    ...settings,
                    projectHealthTargets: settings.projectHealthTargets.filter(
                      (item) => item.id !== target.id,
                    ),
                  })
                }
                variant="quiet"
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
      <form className="alias-form" onSubmit={saveTarget}>
        <label>
          Service label
          <TextInput
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Production API"
            required
            value={label}
          />
        </label>
        <label>
          Project (optional)
          <select onChange={(event) => setProjectId(event.target.value)} value={projectId}>
            <option value="">No project</option>
            {settings.projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Health URL
          <TextInput
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com/health"
            required
            value={url}
          />
        </label>
        <label>
          Expected HTTP status
          <TextInput
            inputMode="numeric"
            onChange={(event) => setExpectedStatus(event.target.value)}
            required
            value={expectedStatus}
          />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <Button type="submit">Add health check</Button>
        </div>
      </form>
    </section>
  );
}

function formatStatus(status: 'disconnected' | 'connecting' | 'connected' | 'error'): string {
  switch (status) {
    case 'disconnected':
      return 'Disconnected';
    case 'connecting':
      return 'Connecting';
    case 'connected':
      return 'Connected';
    case 'error':
      return 'Error';
  }
}
