export type PublicPage = 'home' | 'privacy' | 'support';

export interface PublicSiteProps {
  page: PublicPage;
}

export function PublicSite({ page }: PublicSiteProps) {
  return (
    <main className="public-site">
      <header className="public-header">
        <a aria-label="Navode home" className="public-brand" href="/">
          Navode
        </a>
        <nav aria-label="Public navigation" className="public-nav">
          <a href="/#features">Features</a>
          <a href="/privacy">Privacy</a>
          <a href="/support">Support</a>
          <a className="public-nav-cta" href="/app">
            Open companion
          </a>
        </nav>
      </header>
      {page === 'home' && <LandingPage />}
      {page === 'privacy' && <PrivacyPage />}
      {page === 'support' && <SupportPage />}
      <footer className="public-footer">
        <span>© 2026 Rorfost</span>
        <span>
          <a href="/privacy">Privacy</a> · <a href="/support">Support</a>
        </span>
      </footer>
    </main>
  );
}

function LandingPage() {
  return (
    <>
      <section className="public-hero" aria-labelledby="hero-title">
        <p className="eyebrow">YOUR CENTRAL NAVIGATION NODE</p>
        <h1 id="hero-title">A new tab that knows where you’re headed.</h1>
        <p className="public-lede">
          Navode is a local-first, keyboard-first Chrome new-tab companion for the links, projects,
          focus, and small routines that move your day forward.
        </p>
        <div className="public-actions">
          <a className="public-button public-button-primary" href="/app">
            Open the local companion
          </a>
          <a className="public-button" href="/privacy">
            Read the privacy policy
          </a>
        </div>
      </section>

      <section className="public-section" id="features" aria-labelledby="features-title">
        <p className="eyebrow">BUILT FOR MOMENTUM</p>
        <h2 id="features-title">One calm starting point, not another place to manage.</h2>
        <div className="public-feature-grid">
          <article>
            <h3>Navigate quickly</h3>
            <p>
              Search, open safe links, launch workspaces, and use aliases without leaving the
              keyboard.
            </p>
          </article>
          <article>
            <h3>Keep useful context</h3>
            <p>
              Store quick links, projects, snippets, a scratchpad, and up to three daily priorities
              locally.
            </p>
          </article>
          <article>
            <h3>Protect your focus</h3>
            <p>
              Run a resumable focus timer, pick your presets, and keep control over motion and home
              layout.
            </p>
          </article>
          <article>
            <h3>Own your data</h3>
            <p>Back up and restore your Navode configuration with a validated local JSON file.</p>
          </article>
        </div>
      </section>

      <section className="public-status" aria-labelledby="status-title">
        <div>
          <p className="eyebrow">INSTALLATION STATUS</p>
          <h2 id="status-title">Prepared for Chrome, not yet listed.</h2>
        </div>
        <p>
          Navode’s Chrome extension package is being prepared for release. A Chrome Web Store
          listing is not available yet; this public site is ready to provide product information,
          privacy details, and support when it is deployed.
        </p>
      </section>
    </>
  );
}

function PrivacyPage() {
  return (
    <article className="public-prose" aria-labelledby="privacy-title">
      <p className="eyebrow">PRIVACY POLICY · V2.1</p>
      <h1 id="privacy-title">Your Navode data stays local.</h1>
      <p>Last updated: September 19, 2026.</p>
      <h2>What Navode stores</h2>
      <p>
        Navode stores the settings and content you create: theme and motion preferences, search
        provider, aliases, quick links, projects, workspaces, scratchpad text, snippets, focus timer
        state, Today priorities, a bounded recent-action list, and non-secret integration status.
        Recent actions contain labels and timestamps, not search queries or snippet contents.
      </p>
      <h2>Where it is stored</h2>
      <p>
        The Chrome extension stores this data in Chrome local storage. The optional web companion
        stores it in that browser’s local storage. V2.1 does not provide cloud sync, accounts, or a
        Navode-hosted database, and does not store provider credentials in Navode settings.
      </p>
      <h2>When data leaves your device</h2>
      <p>
        Navode does not send your configuration, notes, snippets, or activity to Navode servers.
        The V2.1 integration registry does not contact providers. When you intentionally run a
        search, open a link, launch a workspace, or use a configured
        command, your browser opens the selected external destination. That site receives the
        information normally included in that navigation, such as a search query sent to Google,
        YouTube, GitHub, Codeforces, or LeetCode, or the URL you chose.
      </p>
      <h2>Analytics and accounts</h2>
      <p>
        V2.1 has no analytics, telemetry, advertising identifiers, user accounts, or authentication.
      </p>
      <h2>Delete or recover data</h2>
      <p>
        Use Settings to clear individual sections or select Reset all Navode data. You can export a
        local backup before resetting and import it later after reviewing the replacement preview.
        Removing extension data through Chrome also removes its locally stored Navode data.
      </p>
      <h2>Contact</h2>
      <p>
        For privacy questions or support, email{' '}
        <a href="mailto:support@rorfost.com">support@rorfost.com</a>.
      </p>
    </article>
  );
}

function SupportPage() {
  return (
    <article className="public-prose" aria-labelledby="support-title">
      <p className="eyebrow">SUPPORT</p>
      <h1 id="support-title">Help make the next tab useful.</h1>
      <p>
        For help with Navode, include your browser version, whether you are using the extension or
        web companion, and a short description of what happened. Do not include passwords, tokens,
        scratchpad text, snippets, or exported backups in a support request.
      </p>
      <p>
        <a
          className="public-button public-button-primary"
          href="mailto:support@rorfost.com?subject=Navode%20support"
        >
          Contact Navode support
        </a>
      </p>
      <h2>Before you write</h2>
      <p>
        Most configuration issues can be recovered from Settings: export a backup, review the import
        preview, reset an individual section, or reset all local Navode data. The{' '}
        <a href="/privacy">privacy policy</a> explains what remains on your device.
      </p>
    </article>
  );
}
