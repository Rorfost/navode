import { useState } from 'react';
import type { NavodeSettings } from '@navode/core';
import type { PluginRegistryEntry } from '@navode/platform-sdk';
import { Badge, Button, Card, PermissionTag } from './primitives';

export interface PluginManagerPanelProps {
  settings: NavodeSettings;
  onEnablePlugin: (plugin: PluginRegistryEntry) => void;
  onDisablePlugin: (pluginId: string) => void;
  onUninstallPlugin: (pluginId: string) => void;
}

export function PluginManagerPanel({
  settings,
  onEnablePlugin,
  onDisablePlugin,
  onUninstallPlugin,
}: PluginManagerPanelProps) {
  const [selectedPlugin, setSelectedPlugin] = useState<PluginRegistryEntry | null>(null);

  return (
    <div className="plugin-manager-panel">
      <header className="plugin-manager-header">
        <h2>Platform & Plugins</h2>
        <p className="muted">
          Extend Navode with community plugins. Plugins run in a secure sandbox and only have access
          to declared capabilities.
        </p>
      </header>

      {settings.installedPlugins.length === 0 ? (
        <Card className="empty-state">
          <h3>No plugins installed</h3>
          <p className="muted">
            You don't have any plugins installed yet. Plugins allow you to add custom commands,
            widgets, workflows, and themes.
          </p>
          <div className="empty-state-actions">
            <Button
              variant="primary"
              onClick={() => {
                window.open('https://navode.rorfost.com/docs/platform', '_blank');
              }}
            >
              Read the Developer Docs
            </Button>
          </div>
        </Card>
      ) : (
        <div className="plugin-list">
          {settings.installedPlugins.map((plugin) => (
            <Card
              key={plugin.id}
              className={`plugin-item ${plugin.enabled ? 'enabled' : 'disabled'}`}
            >
              <div className="plugin-item-header">
                <div className="plugin-item-title">
                  <h3>{plugin.name}</h3>
                  <span className="plugin-version">v{plugin.version}</span>
                  <Badge
                    variant={
                      plugin.status === 'official'
                        ? 'success'
                        : plugin.status === 'community'
                          ? 'neutral'
                          : 'warning'
                    }
                  >
                    {plugin.status}
                  </Badge>
                </div>
                <div className="plugin-item-actions">
                  {plugin.enabled ? (
                    <Button variant="secondary" onClick={() => onDisablePlugin(plugin.id)}>
                      Disable
                    </Button>
                  ) : (
                    <Button variant="primary" onClick={() => onEnablePlugin(plugin)}>
                      Enable
                    </Button>
                  )}
                  <Button variant="quiet" onClick={() => setSelectedPlugin(plugin)}>
                    Details
                  </Button>
                </div>
              </div>
              <p className="plugin-description">{plugin.description}</p>
              <div className="plugin-publisher">
                Published by <strong>{plugin.publisher}</strong>
              </div>
            </Card>
          ))}
        </div>
      )}

      {selectedPlugin && (
        <PluginDetailsModal
          plugin={selectedPlugin}
          onClose={() => setSelectedPlugin(null)}
          onUninstall={() => {
            onUninstallPlugin(selectedPlugin.id);
            setSelectedPlugin(null);
          }}
        />
      )}
    </div>
  );
}

function PluginDetailsModal({
  plugin,
  onClose,
  onUninstall,
}: {
  plugin: PluginRegistryEntry;
  onClose: () => void;
  onUninstall: () => void;
}) {
  return (
    <div className="dialog-backdrop" onMouseDown={onClose}>
      <div
        className="dialog plugin-details-dialog"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
      >
        <header>
          <h2>{plugin.name} Details</h2>
        </header>
        <div className="dialog-content">
          <div className="detail-row">
            <span className="detail-label">ID:</span>
            <span className="detail-value">{plugin.id}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Version:</span>
            <span className="detail-value">{plugin.version}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Publisher:</span>
            <span className="detail-value">{plugin.publisher}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Status:</span>
            <span className="detail-value">
              <Badge
                variant={
                  plugin.status === 'official'
                    ? 'success'
                    : plugin.status === 'community'
                      ? 'neutral'
                      : 'warning'
                }
              >
                {plugin.status}
              </Badge>
            </span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Platform API:</span>
            <span className="detail-value">v{plugin.compatiblePlatformApiVersion}</span>
          </div>

          <div className="permissions-section">
            <h3>Declared Capabilities</h3>
            {plugin.capabilities.length === 0 ? (
              <p className="muted">This plugin requires no special capabilities.</p>
            ) : (
              <div className="capability-list">
                {plugin.capabilities.map((cap) => (
                  <PermissionTag key={cap} capability={cap} />
                ))}
              </div>
            )}
          </div>
        </div>
        <footer>
          <Button variant="quiet" onClick={onClose}>
            Close
          </Button>
          <Button variant="secondary" className="danger-text" onClick={onUninstall}>
            Uninstall Plugin
          </Button>
        </footer>
      </div>
    </div>
  );
}
