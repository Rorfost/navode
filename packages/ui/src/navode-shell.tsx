import type { FormEvent } from 'react';

export interface NavodeShellProps {
  onCommand?: (command: string) => void;
}

export function NavodeShell({ onCommand }: NavodeShellProps) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const command = new FormData(event.currentTarget).get('command');
    if (typeof command === 'string' && command.trim()) onCommand?.(command.trim());
  }

  return (
    <main className="navode-shell">
      <header>
        <p className="eyebrow">YOUR CENTRAL NAVIGATION NODE</p>
        <h1>Navode</h1>
        <time dateTime={new Date().toISOString()}>{new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(new Date())}</time>
      </header>
      <form aria-label="Run a Navode command" onSubmit={submit}>
        <label htmlFor="command">What do you want to do?</label>
        <div className="command-row">
          <input id="command" name="command" autoFocus autoComplete="off" placeholder="Try: yt segment tree" />
          <button type="submit">Run</button>
        </div>
      </form>
      <section aria-labelledby="quick-actions-title">
        <h2 id="quick-actions-title">Quick actions</h2>
        <div className="quick-actions">
          <button type="button">Search the web</button>
          <button type="button">Open a project</button>
          <button type="button">Start focus time</button>
        </div>
      </section>
      <section aria-labelledby="projects-title">
        <div className="section-heading"><h2 id="projects-title">Projects</h2><button type="button" aria-label="Open settings">Settings</button></div>
        <p className="muted">Configure project workspaces and shortcuts as Navode grows.</p>
      </section>
    </main>
  );
}
