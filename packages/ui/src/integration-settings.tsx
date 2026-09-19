import {
  NAVODE_INTEGRATIONS,
  defaultIntegrationConnection,
  disconnectIntegration,
  parseCodeforcesHandle,
  type IntegrationId,
} from '@navode/integrations';
import type { NavodeSettings } from '@navode/core';
import { useEffect, useState } from 'react';
import { Button, TextInput } from './primitives';

export interface IntegrationSettingsProps {
  onConnect?: (providerId: Extract<IntegrationId, 'github' | 'google-calendar' | 'competitive-programming'>) => void;
  onSettingsChange: (settings: NavodeSettings) => void;
  settings: NavodeSettings;
}

export function IntegrationSettings({ onConnect, onSettingsChange, settings }: IntegrationSettingsProps) {
  const [codeforcesHandle, setCodeforcesHandle] = useState(settings.competitiveProgramming.codeforcesHandle ?? '');
  const [handleError, setHandleError] = useState('');

  useEffect(() => setCodeforcesHandle(settings.competitiveProgramming.codeforcesHandle ?? ''), [settings.competitiveProgramming.codeforcesHandle]);

  function disconnect(providerId: keyof NavodeSettings['integrations']) {
    onSettingsChange({
      ...settings,
      integrations: {
        ...settings.integrations,
        [providerId]: disconnectIntegration(),
      },
    });
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
        ...settings.competitiveProgramming,
        ...(handle ? { codeforcesHandle: handle } : { codeforcesHandle: undefined }),
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
        {NAVODE_INTEGRATIONS.all().map((provider) => {
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
                {connection.lastRefreshAt && <small>Last refresh: {connection.lastRefreshAt}</small>}
                {connection.error && <small role="alert">{connection.error.message}</small>}
              </div>
              <div className="integration-actions">
                {provider.availability === 'available' && connection.status !== 'connected' && (
                  <Button
                    onClick={() =>
                      (provider.id === 'github' || provider.id === 'google-calendar' || provider.id === 'competitive-programming') &&
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
          <Button onClick={saveCodeforcesHandle} variant="quiet">Save handle</Button>
          <Button
            onClick={() =>
              onSettingsChange({
                ...settings,
                competitiveProgramming: {
                  ...settings.competitiveProgramming,
                  showWidget: !settings.competitiveProgramming.showWidget,
                },
              })
            }
            variant="quiet"
          >
            {settings.competitiveProgramming.showWidget ? 'Hide contest widget' : 'Show contest widget'}
          </Button>
        </div>
        {handleError && <small role="alert">{handleError}</small>}
      </div>
      <p className="muted">
        Navode will explain and request only the permissions needed when a provider becomes available.
      </p>
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
