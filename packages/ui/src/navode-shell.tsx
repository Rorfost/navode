import {
  DEFAULT_NAVODE_SETTINGS,
  type NavodeSettings,
  type SearchProvider,
} from '@navode/core';
import { type FormEvent, type KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  Button,
  Card,
  CommandResult,
  Dialog,
  KeyboardShortcutHint,
  Menu,
  Tab,
  Tabs,
  TextInput,
  Toggle,
  Tooltip,
} from './primitives';

const searchProviders: Record<SearchProvider, { alias: string; label: string }> = {
  google: { alias: 'g', label: 'Google' },
  youtube: { alias: 'yt', label: 'YouTube' },
};

const safeQuickLinks = [
  { label: 'Google', url: 'https://www.google.com' },
  { label: 'YouTube', url: 'https://www.youtube.com' },
  { label: 'GitHub', url: 'https://github.com' },
];

export interface NavodeShellProps {
  onCommand?: (command: string) => void;
  onSettingsChange?: (settings: NavodeSettings) => void;
  settings?: NavodeSettings;
}

export function NavodeShell({
  onCommand,
  onSettingsChange,
  settings = DEFAULT_NAVODE_SETTINGS,
}: NavodeShellProps) {
  const [command, setCommand] = useState('');
  const [selectedResult, setSelectedResult] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(!settings.onboardingCompleted);
  const [now, setNow] = useState(() => new Date());
  const commandInput = useRef<HTMLInputElement>(null);
  const provider = searchProviders[settings.defaultSearchProvider];
  const results = useMemo(
    () => createCommandResults(command, settings.defaultSearchProvider),
    [command, settings.defaultSearchProvider],
  );

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    function handleShortcut(event: globalThis.KeyboardEvent) {
      const target = event.target;
      const isTyping =
        target instanceof HTMLElement &&
        (target.matches('input, textarea, select') ||
          target.isContentEditable ||
          Boolean(target.closest('[contenteditable="true"]')));

      if (event.key === 'Escape') {
        if (isSettingsOpen) setIsSettingsOpen(false);
        else if (isOnboardingOpen) setIsOnboardingOpen(false);
        return;
      }
      if (event.key === '/' && !event.metaKey && !event.ctrlKey && !event.altKey && !isTyping) {
        event.preventDefault();
        commandInput.current?.focus();
      }
    }

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, [isOnboardingOpen, isSettingsOpen]);

  function updateSettings(next: Partial<NavodeSettings>) {
    onSettingsChange?.({ ...settings, ...next });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selected = results[selectedResult];
    const value = selected?.command ?? command.trim();
    if (value) onCommand?.(value);
  }

  function handleCommandKeys(event: KeyboardEvent<HTMLInputElement>) {
    if (!results.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedResult((current) => (current + 1) % results.length);
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedResult((current) => (current - 1 + results.length) % results.length);
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const selected = results[selectedResult];
      if (selected) onCommand?.(selected.command);
    }
  }

  function chooseResult(index: number) {
    setSelectedResult(index);
    const result = results[index];
    if (result) onCommand?.(result.command);
  }

  function finishOnboarding() {
    updateSettings({ onboardingCompleted: true });
    setIsOnboardingOpen(false);
    commandInput.current?.focus();
  }

  return (
    <main className="navode-shell">
      <header className="shell-header">
        <div>
          <p className="eyebrow">YOUR CENTRAL NAVIGATION NODE</p>
          <h1>Navode</h1>
        </div>
        <div className="clock" aria-label="Current date and time">
          <time dateTime={now.toISOString()}>{formatDate(now)}</time>
          <span>{formatTime(now)}</span>
        </div>
      </header>

      <section className="command-area" aria-labelledby="command-title">
        <h2 className="sr-only" id="command-title">Command bar</h2>
        <form aria-label="Run a Navode command" onSubmit={submit}>
          <label className="sr-only" htmlFor="command">What do you want to do?</label>
          <div className="command-row">
            <TextInput
              aria-autocomplete="list"
              aria-controls="command-results"
              aria-expanded={results.length > 0}
              autoComplete="off"
              autoFocus
              id="command"
              name="command"
              onChange={(event) => {
                setCommand(event.target.value);
                setSelectedResult(0);
              }}
              onKeyDown={handleCommandKeys}
              placeholder={`Search ${provider.label} or run a command…`}
              ref={commandInput}
              value={command}
            />
            <Tooltip label="Run command">
              <Button aria-label="Run command" type="submit" variant="primary">
                Run
              </Button>
            </Tooltip>
          </div>
          <p className="command-help">
            Press <KeyboardShortcutHint>/</KeyboardShortcutHint> to focus, then use arrows to choose.
          </p>
        </form>
        {results.length > 0 && (
          <Menu label="Command results">
            <div id="command-results" role="listbox" aria-label="Command suggestions">
              {results.map((result, index) => (
                <CommandResult active={selectedResult === index} key={result.id} onClick={() => chooseResult(index)}>
                  <span>{result.label}</span>
                  <KeyboardShortcutHint>{result.shortcut}</KeyboardShortcutHint>
                </CommandResult>
              ))}
            </div>
          </Menu>
        )}
      </section>

      <div className="content-grid">
        <Card aria-labelledby="quick-access-title">
          <div className="section-heading">
            <div>
              <p className="section-kicker">START HERE</p>
              <h2 id="quick-access-title">Quick access</h2>
            </div>
            <span className="muted">Safe defaults</span>
          </div>
          <div className="quick-actions">
            {safeQuickLinks.map((link) => (
              <a className="quick-link" href={link.url} key={link.url} rel="noreferrer" target="_blank">
                {link.label}
              </a>
            ))}
          </div>
        </Card>

        <Card aria-labelledby="projects-title">
          <div className="section-heading">
            <div>
              <p className="section-kicker">YOUR WORK</p>
              <h2 id="projects-title">Projects &amp; workspaces</h2>
            </div>
            <Button aria-label="Open settings" onClick={() => setIsSettingsOpen(true)} variant="quiet">
              Settings
            </Button>
          </div>
          <p className="muted">Add projects and group your repeat workflows in one place.</p>
          <Button onClick={() => setIsSettingsOpen(true)}>Set up your workspace</Button>
        </Card>

        <Card aria-labelledby="productivity-title">
          <div className="section-heading">
            <div>
              <p className="section-kicker">A LITTLE MOMENTUM</p>
              <h2 id="productivity-title">Productivity</h2>
            </div>
          </div>
          <p className="muted">
            Focus sessions, notes, and snippets will appear here as you make Navode yours.
          </p>
          <Button onClick={() => onCommand?.('focus')}>Start focus time</Button>
        </Card>
      </div>

      <Dialog label="Welcome to Navode" onClose={() => setIsOnboardingOpen(false)} open={isOnboardingOpen}>
        <p className="eyebrow">WELCOME</p>
        <h2>Your next tab, pointed somewhere useful.</h2>
        <p className="muted">
          Navode keeps your frequent moves close and lets you reach them from the keyboard.
        </p>
        <fieldset className="provider-options">
          <legend>Default search provider</legend>
          {(['google', 'youtube'] as const).map((searchProvider) => (
            <Toggle
              key={searchProvider}
              onClick={() => updateSettings({ defaultSearchProvider: searchProvider })}
              pressed={settings.defaultSearchProvider === searchProvider}
            >
              {searchProviders[searchProvider].label}
            </Toggle>
          ))}
        </fieldset>
        <p className="muted">We added Google, YouTube, and GitHub as safe quick links. You can change them later.</p>
        <div className="dialog-actions">
          <Button onClick={finishOnboarding} variant="quiet">Skip for now</Button>
          <Button onClick={finishOnboarding} variant="primary">Start using Navode</Button>
        </div>
      </Dialog>

      <Dialog label="Navode settings" onClose={() => setIsSettingsOpen(false)} open={isSettingsOpen}>
        <p className="eyebrow">PREFERENCES</p>
        <h2>Make Navode feel like yours.</h2>
        <Tabs label="Theme">
          {(['dark', 'light', 'system'] as const).map((theme) => (
            <Tab active={settings.theme === theme} key={theme} onClick={() => updateSettings({ theme })}>
              {theme[0]?.toUpperCase()}
              {theme.slice(1)}
            </Tab>
          ))}
        </Tabs>
        <p className="muted">Theme preference is stored only on this device.</p>
        <div className="dialog-actions">
          <Button onClick={() => setIsSettingsOpen(false)} variant="primary">Done</Button>
        </div>
      </Dialog>
    </main>
  );
}

function createCommandResults(input: string, defaultProvider: SearchProvider) {
  const query = input.trim();
  if (!query || /^(g|google|yt|youtube|focus)\b/i.test(query)) return [];

  const primary = searchProviders[defaultProvider];
  const secondaryProvider: SearchProvider = defaultProvider === 'google' ? 'youtube' : 'google';
  const secondary = searchProviders[secondaryProvider];
  return [
    {
      id: primary.alias,
      label: `Search ${primary.label} for “${query}”`,
      command: `${primary.alias} ${query}`,
      shortcut: 'Enter',
    },
    {
      id: secondary.alias,
      label: `Search ${secondary.label} for “${query}”`,
      command: `${secondary.alias} ${query}`,
      shortcut: '↓',
    },
  ];
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(date);
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date);
}
