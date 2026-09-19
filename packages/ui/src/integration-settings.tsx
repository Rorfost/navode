import { NAVODE_INTEGRATIONS, defaultIntegrationConnection, disconnectIntegration } from '@navode/integrations';
import type { NavodeSettings } from '@navode/core';
import { Button } from './primitives';

export interface IntegrationSettingsProps {
  onSettingsChange: (settings: NavodeSettings) => void;
  settings: NavodeSettings;
}

export function IntegrationSettings({ onSettingsChange, settings }: IntegrationSettingsProps) {
  function disconnect(providerId: keyof NavodeSettings['integrations']) {
    onSettingsChange({
      ...settings,
      integrations: {
        ...settings.integrations,
        [providerId]: disconnectIntegration(),
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
