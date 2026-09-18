import {
  MAX_TODAY_ITEMS,
  addTodayItem,
  clearTodayItems,
  createSnippet,
  getFocusTimerSnapshot,
  pauseFocusTimer,
  removeSnippet,
  resetFocusTimer,
  resumeFocusTimer,
  saveSnippet,
  searchSnippets,
  startFocusTimer,
  toggleTodayItem,
  updateTodayItem,
  type NavodeSettings,
} from '@navode/core';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Button, Dialog, TextInput } from './primitives';

export type ProductivityScreen = 'focus' | 'note' | 'snippets' | 'today';

export interface ProductivityManagerProps {
  onClose: () => void;
  onSettingsChange: (settings: NavodeSettings) => void;
  screen: ProductivityScreen | null;
  settings: NavodeSettings;
}

export function ProductivityManager({ onClose, onSettingsChange, screen, settings }: ProductivityManagerProps) {
  const [now, setNow] = useState(() => new Date());
  const [snippetQuery, setSnippetQuery] = useState('');
  const [snippetTitle, setSnippetTitle] = useState('');
  const [snippetContent, setSnippetContent] = useState('');
  const [snippetTags, setSnippetTags] = useState('');
  const [snippetAlias, setSnippetAlias] = useState('');
  const [editingSnippetId, setEditingSnippetId] = useState<string | null>(null);
  const [snippetError, setSnippetError] = useState('');
  const [copyFeedback, setCopyFeedback] = useState('');
  const [todayText, setTodayText] = useState('');
  const [editingTodayId, setEditingTodayId] = useState<string | null>(null);
  const [duration, setDuration] = useState(String(settings.focusTimer.durationMinutes));

  useEffect(() => {
    if (screen !== 'focus') return undefined;
    const interval = window.setInterval(() => setNow(new Date()), 1_000);
    return () => window.clearInterval(interval);
  }, [screen]);

  const timer = getFocusTimerSnapshot(settings.focusTimer, now);
  const snippets = useMemo(() => searchSnippets(settings.snippets, snippetQuery), [settings.snippets, snippetQuery]);

  function update(next: Partial<NavodeSettings>) {
    onSettingsChange({ ...settings, ...next });
  }

  function resetSnippetForm() {
    setSnippetTitle('');
    setSnippetContent('');
    setSnippetTags('');
    setSnippetAlias('');
    setEditingSnippetId(null);
    setSnippetError('');
  }

  function submitSnippet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = editingSnippetId ?? `snippet-${Date.now()}`;
    const snippet = createSnippet({
      alias: snippetAlias,
      content: snippetContent,
      tags: snippetTags.split(','),
      title: snippetTitle,
    }, id);
    if (!snippet || settings.snippets.some((item) => item.id !== id && item.alias && item.alias === snippet.alias)) {
      setSnippetError('Add a title and content; aliases must use letters, numbers, or hyphens and be unique.');
      return;
    }
    update({ snippets: saveSnippet(settings.snippets, snippet) });
    resetSnippetForm();
  }

  function editSnippet(id: string) {
    const snippet = settings.snippets.find((item) => item.id === id);
    if (!snippet) return;
    setSnippetTitle(snippet.title);
    setSnippetContent(snippet.content);
    setSnippetTags(snippet.tags.join(', '));
    setSnippetAlias(snippet.alias ?? '');
    setEditingSnippetId(id);
    setSnippetError('');
  }

  async function copySnippet(id: string) {
    const snippet = settings.snippets.find((item) => item.id === id);
    if (!snippet) return;
    if (!navigator.clipboard) {
      setCopyFeedback('Clipboard access was unavailable. Select and copy the snippet content manually.');
      return;
    }
    try {
      await navigator.clipboard.writeText(snippet.content);
      setCopyFeedback(`Copied ${snippet.title}.`);
    } catch {
      setCopyFeedback('Clipboard access was unavailable. Select and copy the snippet content manually.');
    }
  }

  function submitToday(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = editingTodayId
      ? updateTodayItem(settings.todayItems, editingTodayId, todayText)
      : addTodayItem(settings.todayItems, todayText, `today-${Date.now()}`);
    if (!next) return;
    update({ todayItems: next });
    setTodayText('');
    setEditingTodayId(null);
  }

  function editToday(id: string) {
    const item = settings.todayItems.find((candidate) => candidate.id === id);
    if (!item) return;
    setTodayText(item.title);
    setEditingTodayId(id);
  }

  function startTimer() {
    const next = startFocusTimer(Number(duration));
    if (next) update({ focusTimer: next });
  }

  return (
    <>
      <Dialog label="Scratchpad" onClose={onClose} open={screen === 'note'}>
        <p className="eyebrow">LOCAL ONLY</p>
        <h2>Scratchpad</h2>
        <p className="muted">Temporary plain-text notes are saved automatically on this device.</p>
        <label className="editor-field" htmlFor="scratchpad-content">
          Note
          <textarea
            className="text-input textarea-input"
            id="scratchpad-content"
            onChange={(event) => update({ scratchpad: { content: event.target.value.slice(0, 20_000) } })}
            placeholder="Capture a thought…"
            value={settings.scratchpad.content}
          />
        </label>
        <div className="dialog-actions">
          <Button
            disabled={!settings.scratchpad.content}
            onClick={() => {
              if (window.confirm('Clear the scratchpad? This cannot be undone.')) update({ scratchpad: { content: '' } });
            }}
            variant="quiet"
          >
            Clear note
          </Button>
          <Button onClick={onClose} variant="primary">Done</Button>
        </div>
      </Dialog>

      <Dialog label="Snippets" onClose={onClose} open={screen === 'snippets'}>
        <p className="eyebrow">REUSABLE TEXT</p>
        <h2>Snippets</h2>
        <p className="muted">Snippets stay on this device. Navode is not a password vault—do not store passwords, tokens, or other secrets here.</p>
        <label className="editor-field" htmlFor="snippet-search">Search snippets
          <TextInput id="snippet-search" onChange={(event) => setSnippetQuery(event.target.value)} placeholder="Title, tag, or content" value={snippetQuery} />
        </label>
        {copyFeedback && <p className="command-feedback" role="status">{copyFeedback}</p>}
        <ul className="manager-list" aria-label="Snippets">
          {snippets.map((snippet) => (
            <li key={snippet.id}>
              <span className="manager-item-copy"><strong>{snippet.title}</strong><small>{[snippet.alias, ...snippet.tags].filter(Boolean).join(' · ') || 'No tags'}</small></span>
              <span className="manager-actions">
                <Button aria-label={`Copy ${snippet.title}`} onClick={() => void copySnippet(snippet.id)} variant="quiet">Copy</Button>
                <Button aria-label={`Edit ${snippet.title}`} onClick={() => editSnippet(snippet.id)} variant="quiet">Edit</Button>
                <Button aria-label={`Delete ${snippet.title}`} onClick={() => update({ snippets: removeSnippet(settings.snippets, snippet.id) })} variant="quiet">Delete</Button>
              </span>
            </li>
          ))}
        </ul>
        {!snippets.length && <p className="muted">No matching snippets yet.</p>}
        <form className="editor-form" onSubmit={submitSnippet}>
          <h3>{editingSnippetId ? 'Edit snippet' : 'New snippet'}</h3>
          <label className="editor-field">Title<TextInput onChange={(event) => setSnippetTitle(event.target.value)} required value={snippetTitle} /></label>
          <label className="editor-field">Content<textarea className="text-input textarea-input" onChange={(event) => setSnippetContent(event.target.value)} required value={snippetContent} /></label>
          <label className="editor-field">Tags (comma separated)<TextInput onChange={(event) => setSnippetTags(event.target.value)} placeholder="email, work" value={snippetTags} /></label>
          <label className="editor-field">Shortcut / alias (optional)<TextInput onChange={(event) => setSnippetAlias(event.target.value)} placeholder="reply" value={snippetAlias} /></label>
          {snippetError && <p className="form-error" role="alert">{snippetError}</p>}
          <div className="form-actions">
            {editingSnippetId && <Button onClick={resetSnippetForm} variant="quiet">Cancel</Button>}
            <Button type="submit">{editingSnippetId ? 'Save snippet' : 'Add snippet'}</Button>
          </div>
        </form>
      </Dialog>

      <Dialog label="Focus timer" onClose={onClose} open={screen === 'focus'}>
        <p className="eyebrow">FOCUS SESSION</p>
        <h2>{formatTimer(timer.remainingSeconds)}</h2>
        <p className="muted" role="status">{timer.status === 'completed' ? 'Session complete.' : `${timer.status[0]?.toUpperCase()}${timer.status.slice(1)} session`}</p>
        <fieldset className="provider-options">
          <legend>Duration</legend>
          {[25, 50, 60].map((preset) => <Button key={preset} onClick={() => { setDuration(String(preset)); const next = startFocusTimer(preset); if (next) update({ focusTimer: next }); }} variant="secondary">{preset} min</Button>)}
        </fieldset>
        <label className="editor-field" htmlFor="focus-duration">Custom minutes (1–180)
          <TextInput id="focus-duration" inputMode="numeric" max="180" min="1" onChange={(event) => setDuration(event.target.value)} type="number" value={duration} />
        </label>
        <div className="dialog-actions">
          {(timer.status === 'idle' || timer.status === 'completed') && <Button onClick={startTimer} variant="primary">Start</Button>}
          {timer.status === 'running' && <Button onClick={() => update({ focusTimer: pauseFocusTimer(settings.focusTimer) })} variant="primary">Pause</Button>}
          {timer.status === 'paused' && <Button onClick={() => { const next = resumeFocusTimer(settings.focusTimer); if (next) update({ focusTimer: next }); }} variant="primary">Resume</Button>}
          <Button onClick={() => update({ focusTimer: resetFocusTimer(settings.focusTimer) })} variant="quiet">Reset</Button>
        </div>
      </Dialog>

      <Dialog label="Today priorities" onClose={onClose} open={screen === 'today'}>
        <p className="eyebrow">KEEP IT SMALL</p>
        <h2>Today</h2>
        <p className="muted">Choose up to three priorities.</p>
        <ul className="manager-list" aria-label="Today priorities">
          {settings.todayItems.map((item) => (
            <li key={item.id}>
              <label className="today-item"><input checked={item.completed} onChange={() => update({ todayItems: toggleTodayItem(settings.todayItems, item.id) })} type="checkbox" /> <span>{item.title}</span></label>
              <span className="manager-actions"><Button aria-label={`Edit ${item.title}`} onClick={() => editToday(item.id)} variant="quiet">Edit</Button></span>
            </li>
          ))}
        </ul>
        <form className="editor-form" onSubmit={submitToday}>
          <label className="editor-field">Priority<TextInput disabled={!editingTodayId && settings.todayItems.length >= MAX_TODAY_ITEMS} onChange={(event) => setTodayText(event.target.value)} required value={todayText} /></label>
          <div className="form-actions">
            {editingTodayId && <Button onClick={() => { setEditingTodayId(null); setTodayText(''); }} variant="quiet">Cancel</Button>}
            <Button disabled={!editingTodayId && settings.todayItems.length >= MAX_TODAY_ITEMS} type="submit">{editingTodayId ? 'Save priority' : 'Add priority'}</Button>
          </div>
        </form>
        <div className="dialog-actions">
          <Button disabled={!settings.todayItems.length} onClick={() => { if (window.confirm('Clear all today priorities?')) update({ todayItems: clearTodayItems() }); }} variant="quiet">Clear today</Button>
          <Button onClick={onClose} variant="primary">Done</Button>
        </div>
      </Dialog>
    </>
  );
}

function formatTimer(totalSeconds: number): string {
  return `${Math.floor(totalSeconds / 60).toString().padStart(2, '0')}:${(totalSeconds % 60).toString().padStart(2, '0')}`;
}
