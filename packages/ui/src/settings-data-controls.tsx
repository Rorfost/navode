import {
  DEFAULT_FOCUS_PRESETS,
  DEFAULT_HOME_SECTIONS,
  DEFAULT_NAVODE_SETTINGS,
  clearRecentExecutions,
  createStarterQuickLinks,
  parseNavodeBackup,
  resetFocusTimer,
  serializeNavodeBackup,
  type NavodeSettings,
} from '@navode/core';
import { type ChangeEvent, useState } from 'react';
import { Button, TextInput, Toggle } from './primitives';
import type { OrganizationScreen } from './organization-manager';

export interface SettingsDataControlsProps {
  onOpenOnboarding: () => void;
  onOpenOrganization: (screen: OrganizationScreen) => void;
  onSettingsChange: (settings: NavodeSettings) => void;
  settings: NavodeSettings;
}

export function SettingsDataControls({
  onOpenOnboarding,
  onOpenOrganization,
  onSettingsChange,
  settings,
}: SettingsDataControlsProps) {
  const [importPreview, setImportPreview] = useState<NavodeSettings | null>(null);
  const [importError, setImportError] = useState('');
  const [presetText, setPresetText] = useState(settings.focusPresets.join(', '));

  function update(next: Partial<NavodeSettings>) {
    onSettingsChange({ ...settings, ...next });
  }

  function exportBackup() {
    const blob = new Blob([serializeNavodeBackup(settings)], { type: 'application/json' });
    const href = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = `navode-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(href);
  }

  async function selectImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const result = parseNavodeBackup(await file.text());
    if (!result.success) {
      setImportPreview(null);
      setImportError(result.errors.join(' '));
      return;
    }
    setImportPreview(result.backup.data);
    setImportError('');
  }

  function savePresets() {
    const values = [...new Set(presetText.split(',').map((value) => Number(value.trim())))];
    if (!values.length || values.length > 5 || values.some((value) => !Number.isInteger(value) || value < 1 || value > 180)) {
      setImportError('Focus presets must be one to five whole-minute values from 1 to 180.');
      return;
    }
    update({ focusPresets: values });
    setImportError('');
  }

  return (
    <>
      <section className="settings-section" aria-labelledby="home-sections-title">
        <h3 id="home-sections-title">Home sections</h3>
        <p className="muted">Keep the new tab focused on the surfaces you use.</p>
        <div className="settings-toggles">
          {([
            ['quickAccess', 'Quick access'],
            ['projects', 'Projects'],
            ['workspaces', 'Workspaces'],
            ['productivity', 'Productivity'],
          ] as const).map(([section, label]) => (
            <Toggle
              key={section}
              onClick={() => update({ homeSections: { ...settings.homeSections, [section]: !settings.homeSections[section] } })}
              pressed={settings.homeSections[section]}
            >
              {label}
            </Toggle>
          ))}
        </div>
        <div className="form-actions">
          <Button onClick={() => onOpenOrganization('links')} variant="quiet">Manage quick links</Button>
          <Button onClick={() => onOpenOrganization('projects')} variant="quiet">Manage projects</Button>
          <Button onClick={() => onOpenOrganization('workspaces')} variant="quiet">Manage workspaces</Button>
          <Button onClick={() => update({ homeSections: DEFAULT_HOME_SECTIONS })} variant="quiet">Reset layout</Button>
        </div>
      </section>

      <section className="settings-section" aria-labelledby="focus-preferences-title">
        <h3 id="focus-preferences-title">Focus and motion</h3>
        <label className="editor-field" htmlFor="focus-presets">Focus presets (comma separated minutes)
          <TextInput id="focus-presets" onChange={(event) => setPresetText(event.target.value)} value={presetText} />
        </label>
        <div className="form-actions">
          <Button onClick={savePresets}>Save presets</Button>
          <Button onClick={() => { setPresetText(DEFAULT_FOCUS_PRESETS.join(', ')); update({ focusPresets: DEFAULT_FOCUS_PRESETS }); }} variant="quiet">Reset presets</Button>
        </div>
        <fieldset className="provider-options">
          <legend>Motion</legend>
          {(['system', 'reduce'] as const).map((preference) => (
            <Toggle key={preference} onClick={() => update({ reducedMotion: preference })} pressed={settings.reducedMotion === preference}>
              {preference === 'system' ? 'System setting' : 'Reduce motion'}
            </Toggle>
          ))}
        </fieldset>
      </section>

      <section className="settings-section" aria-labelledby="activity-title">
        <h3 id="activity-title">Onboarding and activity</h3>
        <p className="muted">Recent actions store only labels and timestamps, never search terms or snippet contents.</p>
        <div className="settings-toggles">
          <Toggle onClick={() => update({ recordRecentActions: !settings.recordRecentActions })} pressed={settings.recordRecentActions}>Record recent actions</Toggle>
        </div>
        <div className="form-actions">
          <Button onClick={() => { update({ onboardingCompleted: false }); onOpenOnboarding(); }} variant="quiet">Restart onboarding</Button>
          <Button onClick={() => update({ recentExecutions: clearRecentExecutions() })} variant="quiet">Clear recent actions</Button>
        </div>
      </section>

      <section className="settings-section" aria-labelledby="backup-title">
        <h3 id="backup-title">Backup and recovery</h3>
        <p className="muted">Backups are JSON files you control. Import previews all replacement data before anything is changed.</p>
        <div className="form-actions">
          <Button onClick={exportBackup}>Export backup</Button>
          <label className="button button-secondary file-button">
            Choose backup file
            <input accept="application/json,.json" className="sr-only" onChange={(event) => void selectImport(event)} type="file" />
          </label>
        </div>
        {importError && <p className="form-error" role="alert">{importError}</p>}
        {importPreview && (
          <div className="import-preview" role="status">
            <strong>Ready to replace current Navode data</strong>
            <span>{importPreview.quickLinks.length} links · {importPreview.projects.length} projects · {importPreview.workspaces.length} workspaces · {importPreview.snippets.length} snippets</span>
            <div className="form-actions">
              <Button onClick={() => setImportPreview(null)} variant="quiet">Cancel import</Button>
              <Button onClick={() => { onSettingsChange(importPreview); setImportPreview(null); }}>Replace with backup</Button>
            </div>
          </div>
        )}
      </section>

      <section className="settings-section" aria-labelledby="reset-title">
        <h3 id="reset-title">Reset</h3>
        <p className="muted">Section resets only affect local Navode data. Export a backup first if you may need it later.</p>
        <div className="form-actions">
          <Button onClick={() => update({ quickLinks: createStarterQuickLinks() })} variant="quiet">Reset quick links</Button>
          <Button onClick={() => update({ focusTimer: resetFocusTimer(settings.focusTimer) })} variant="quiet">Reset timer</Button>
          <Button
            onClick={() => {
              if (window.confirm('Reset all Navode data on this device? This cannot be undone.')) {
                onSettingsChange(DEFAULT_NAVODE_SETTINGS);
                onOpenOnboarding();
              }
            }}
            variant="quiet"
          >
            Reset all Navode data
          </Button>
        </div>
      </section>
    </>
  );
}
