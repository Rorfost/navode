import {
  createProject,
  createProjectAction,
  createQuickLink,
  createWorkspace,
  createWorkspaceItem,
  removeProject,
  removeProjectAction,
  removeQuickLink,
  removeWorkspace,
  removeWorkspaceItem,
  reorderQuickLinks,
  saveProjectAction,
  saveWorkspaceItem,
  updateProject,
  updateQuickLink,
  updateWorkspace,
  type NavodeSettings,
  type ProjectActionKind,
  type QuickLink,
  type Workspace,
} from '@navode/core';
import { type FormEvent, type ReactNode, useState } from 'react';
import { Button, Dialog, TextInput, Toggle } from './primitives';

export type OrganizationScreen = 'links' | 'projects' | 'workspaces';

interface OrganizationManagerProps {
  onClose: () => void;
  onRequestWorkspaceLaunch: (workspace: Workspace) => void;
  onSettingsChange: (settings: NavodeSettings) => void;
  screen: OrganizationScreen | null;
  settings: NavodeSettings;
}

export function OrganizationManager({
  onClose,
  onRequestWorkspaceLaunch,
  onSettingsChange,
  screen,
  settings,
}: OrganizationManagerProps) {
  const title = screen === 'links' ? 'Quick links' : screen === 'projects' ? 'Projects' : 'Workspaces';

  return (
    <Dialog label={title} onClose={onClose} open={screen !== null}>
      {screen === 'links' && <QuickLinksEditor onSettingsChange={onSettingsChange} settings={settings} />}
      {screen === 'projects' && <ProjectsEditor onSettingsChange={onSettingsChange} settings={settings} />}
      {screen === 'workspaces' && (
        <WorkspacesEditor
          onRequestWorkspaceLaunch={onRequestWorkspaceLaunch}
          onSettingsChange={onSettingsChange}
          settings={settings}
        />
      )}
      <div className="dialog-actions">
        <Button onClick={onClose} variant="primary">Done</Button>
      </div>
    </Dialog>
  );
}

function QuickLinksEditor({
  onSettingsChange,
  settings,
}: Pick<OrganizationManagerProps, 'onSettingsChange' | 'settings'>) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [alias, setAlias] = useState('');
  const [icon, setIcon] = useState('');
  const [group, setGroup] = useState('');
  const [showOnHome, setShowOnHome] = useState(true);
  const [error, setError] = useState('');
  const links = [...settings.quickLinks].sort((left, right) => left.order - right.order);

  function reset() {
    setEditingId(null);
    setName('');
    setUrl('');
    setAlias('');
    setIcon('');
    setGroup('');
    setShowOnHome(true);
    setError('');
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = { alias, group, icon, name, showOnHome, url };
    const next = editingId
      ? updateQuickLink(settings.quickLinks, editingId, input)
      : (() => {
          const link = createQuickLink(input, makeId('link'), settings.quickLinks.length);
          return link && !settings.quickLinks.some((existing) => existing.alias && existing.alias === link.alias)
            ? [...settings.quickLinks, link]
            : null;
        })();
    if (!next) {
      setError('Enter a unique optional alias and a safe http or https URL.');
      return;
    }
    onSettingsChange({ ...settings, quickLinks: next });
    reset();
  }

  function edit(link: QuickLink) {
    setEditingId(link.id);
    setName(link.name);
    setUrl(link.url);
    setAlias(link.alias ?? '');
    setIcon(link.icon ?? '');
    setGroup(link.group ?? '');
    setShowOnHome(link.showOnHome);
    setError('');
  }

  function move(link: QuickLink, direction: -1 | 1) {
    const from = links.findIndex((candidate) => candidate.id === link.id);
    const to = from + direction;
    if (to < 0 || to >= links.length) return;
    const ids = links.map((candidate) => candidate.id);
    const [moved] = ids.splice(from, 1);
    if (moved) ids.splice(to, 0, moved);
    onSettingsChange({ ...settings, quickLinks: reorderQuickLinks(settings.quickLinks, ids) });
  }

  return (
    <section className="manager-section" aria-labelledby="quick-links-manager-title">
      <p className="eyebrow">ORGANIZE</p>
      <h2 id="quick-links-manager-title">Quick links</h2>
      <p className="muted">Keep your useful destinations nearby. Icons fall back to initials and never use remote favicon services.</p>
      <ul className="manager-list" aria-label="Quick links">
        {links.map((link, index) => (
          <li key={link.id}>
            <span className="item-icon" aria-hidden="true">{link.icon ?? initials(link.name)}</span>
            <span className="manager-item-copy">
              <strong>{link.name}</strong>
              <small>{link.group ?? link.url}</small>
            </span>
            <Toggle
              aria-label={`Toggle ${link.name}`}
              onClick={() => onSettingsChange({ ...settings, quickLinks: settings.quickLinks.map((candidate) => candidate.id === link.id ? { ...candidate, enabled: !candidate.enabled } : candidate) })}
              pressed={link.enabled}
            >
              {link.enabled ? 'On' : 'Off'}
            </Toggle>
            <span className="manager-actions">
              <Button aria-label={`Move ${link.name} up`} disabled={index === 0} onClick={() => move(link, -1)} variant="quiet">↑</Button>
              <Button aria-label={`Move ${link.name} down`} disabled={index === links.length - 1} onClick={() => move(link, 1)} variant="quiet">↓</Button>
              <Button onClick={() => edit(link)} variant="quiet">Edit</Button>
              <Button onClick={() => onSettingsChange({ ...settings, quickLinks: removeQuickLink(settings.quickLinks, link.id) })} variant="quiet">Delete</Button>
            </span>
          </li>
        ))}
      </ul>
      <EditorForm title={editingId ? 'Edit quick link' : 'Add quick link'} onSubmit={save}>
        <Field label="Name"><TextInput onChange={(event) => setName(event.target.value)} required value={name} /></Field>
        <Field label="URL"><TextInput onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com" required value={url} /></Field>
        <Field label="Alias (optional)"><TextInput onChange={(event) => setAlias(event.target.value)} placeholder="docs" value={alias} /></Field>
        <Field label="Icon or initials (optional)"><TextInput maxLength={4} onChange={(event) => setIcon(event.target.value)} value={icon} /></Field>
        <Field label="Group (optional)"><TextInput onChange={(event) => setGroup(event.target.value)} value={group} /></Field>
        <label className="checkbox-row"><input checked={showOnHome} onChange={(event) => setShowOnHome(event.target.checked)} type="checkbox" /> Show on home</label>
        {error && <p className="form-error" role="alert">{error}</p>}
        <FormActions editing={Boolean(editingId)} onCancel={reset} submitLabel={editingId ? 'Save link' : 'Add link'} />
      </EditorForm>
    </section>
  );
}

function ProjectsEditor({
  onSettingsChange,
  settings,
}: Pick<OrganizationManagerProps, 'onSettingsChange' | 'settings'>) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('');
  const [showOnHome, setShowOnHome] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionLabel, setActionLabel] = useState('');
  const [actionUrl, setActionUrl] = useState('');
  const [actionKind, setActionKind] = useState<ProjectActionKind>('custom');
  const [error, setError] = useState('');
  const selected = settings.projects.find((project) => project.id === editingId);

  function resetProject() {
    setEditingId(null); setName(''); setDescription(''); setIcon(''); setShowOnHome(false); setActionId(null); setActionLabel(''); setActionUrl(''); setActionKind('custom'); setError('');
  }

  function saveProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = { description, icon, name, showOnHome };
    const next = editingId ? updateProject(settings.projects, editingId, input) : (() => {
      const project = createProject(input, makeId('project'));
      return project ? [...settings.projects, project] : null;
    })();
    if (!next) { setError('A project needs a name.'); return; }
    onSettingsChange({ ...settings, projects: next });
    resetProject();
  }

  function editProject(id: string) {
    const project = settings.projects.find((candidate) => candidate.id === id);
    if (!project) return;
    setEditingId(id); setName(project.name); setDescription(project.description ?? ''); setIcon(project.icon ?? ''); setShowOnHome(project.showOnHome); setError('');
  }

  function saveAction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    const action = createProjectAction({ kind: actionKind, label: actionLabel, url: actionUrl }, actionId ?? makeId('project-action'));
    const next = action && saveProjectAction(settings.projects, selected.id, action);
    if (!next) { setError('An action needs a label and a safe http or https URL.'); return; }
    onSettingsChange({ ...settings, projects: next });
    setActionId(null); setActionLabel(''); setActionUrl(''); setActionKind('custom'); setError('');
  }

  return (
    <section className="manager-section" aria-labelledby="projects-manager-title">
      <p className="eyebrow">YOUR WORK</p><h2 id="projects-manager-title">Projects</h2>
      <ul className="manager-list" aria-label="Projects">
        {settings.projects.map((project) => <li key={project.id}><span className="item-icon" aria-hidden="true">{project.icon ?? initials(project.name)}</span><span className="manager-item-copy"><strong>{project.name}</strong><small>{project.actions.length} actions</small></span><span className="manager-actions"><Button onClick={() => editProject(project.id)} variant="quiet">Edit</Button><Button onClick={() => onSettingsChange({ ...settings, projects: removeProject(settings.projects, project.id) })} variant="quiet">Delete</Button></span></li>)}
      </ul>
      <EditorForm title={editingId ? 'Edit project' : 'Add project'} onSubmit={saveProject}>
        <Field label="Name"><TextInput onChange={(event) => setName(event.target.value)} required value={name} /></Field>
        <Field label="Description (optional)"><TextInput onChange={(event) => setDescription(event.target.value)} value={description} /></Field>
        <Field label="Icon (optional)"><TextInput maxLength={4} onChange={(event) => setIcon(event.target.value)} value={icon} /></Field>
        <label className="checkbox-row"><input checked={showOnHome} onChange={(event) => setShowOnHome(event.target.checked)} type="checkbox" /> Show on home</label>
        {error && <p className="form-error" role="alert">{error}</p>}<FormActions editing={Boolean(editingId)} onCancel={resetProject} submitLabel={editingId ? 'Save project' : 'Add project'} />
      </EditorForm>
      {selected && <EditorForm title="Project actions" onSubmit={saveAction}>
        <ul className="compact-list">{selected.actions.map((action) => <li key={action.id}><a href={action.url} rel="noreferrer" target="_blank">{action.label}</a><span><Button onClick={() => { setActionId(action.id); setActionLabel(action.label); setActionUrl(action.url); setActionKind(action.kind); }} variant="quiet">Edit</Button><Button onClick={() => onSettingsChange({ ...settings, projects: removeProjectAction(settings.projects, selected.id, action.id) })} variant="quiet">Delete</Button></span></li>)}</ul>
        <Field label="Action label"><TextInput onChange={(event) => setActionLabel(event.target.value)} required value={actionLabel} /></Field>
        <Field label="Action type"><select onChange={(event) => setActionKind(event.target.value as ProjectActionKind)} value={actionKind}>{(['repository', 'frontend', 'backend', 'deployment', 'database', 'docs', 'custom'] as const).map((kind) => <option key={kind} value={kind}>{kind}</option>)}</select></Field>
        <Field label="URL"><TextInput onChange={(event) => setActionUrl(event.target.value)} required value={actionUrl} /></Field>
        <FormActions editing={Boolean(actionId)} onCancel={() => { setActionId(null); setActionLabel(''); setActionUrl(''); setActionKind('custom'); }} submitLabel={actionId ? 'Save action' : 'Add action'} />
      </EditorForm>}
    </section>
  );
}

function WorkspacesEditor({
  onRequestWorkspaceLaunch,
  onSettingsChange,
  settings,
}: Pick<OrganizationManagerProps, 'onRequestWorkspaceLaunch' | 'onSettingsChange' | 'settings'>) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [showOnHome, setShowOnHome] = useState(false);
  const [itemId, setItemId] = useState<string | null>(null);
  const [itemLabel, setItemLabel] = useState('');
  const [itemUrl, setItemUrl] = useState('');
  const [error, setError] = useState('');
  const selected = settings.workspaces.find((workspace) => workspace.id === editingId);

  function reset() { setEditingId(null); setName(''); setDescription(''); setShowOnHome(false); setItemId(null); setItemLabel(''); setItemUrl(''); setError(''); }
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = { description, name, showOnHome };
    const next = editingId ? updateWorkspace(settings.workspaces, editingId, input) : (() => { const workspace = createWorkspace(input, makeId('workspace'), settings.workspaces.length); return workspace ? [...settings.workspaces, workspace] : null; })();
    if (!next) { setError('A workspace needs a name.'); return; }
    onSettingsChange({ ...settings, workspaces: next }); reset();
  }
  function edit(id: string) { const workspace = settings.workspaces.find((candidate) => candidate.id === id); if (!workspace) return; setEditingId(id); setName(workspace.name); setDescription(workspace.description ?? ''); setShowOnHome(workspace.showOnHome); setError(''); }
  function saveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!selected) return;
    const item = createWorkspaceItem({ label: itemLabel, url: itemUrl }, itemId ?? makeId('workspace-item'));
    const next = item && saveWorkspaceItem(settings.workspaces, selected.id, item);
    if (!next) { setError('A destination needs a label and a safe http or https URL.'); return; }
    onSettingsChange({ ...settings, workspaces: next }); setItemId(null); setItemLabel(''); setItemUrl(''); setError('');
  }
  return <section className="manager-section" aria-labelledby="workspaces-manager-title"><p className="eyebrow">GROUPED LAUNCHES</p><h2 id="workspaces-manager-title">Workspaces</h2><p className="muted">Launching a workspace always confirms how many tabs will open.</p>
    <ul className="manager-list" aria-label="Workspaces">{[...settings.workspaces].sort((left, right) => left.order - right.order).map((workspace) => <li key={workspace.id}><span className="item-icon" aria-hidden="true">{initials(workspace.name)}</span><span className="manager-item-copy"><strong>{workspace.name}</strong><small>{workspace.items.length} destinations</small></span><span className="manager-actions"><Button disabled={!workspace.items.length} onClick={() => onRequestWorkspaceLaunch(workspace)}>Launch</Button><Button onClick={() => edit(workspace.id)} variant="quiet">Edit</Button><Button onClick={() => onSettingsChange({ ...settings, workspaces: removeWorkspace(settings.workspaces, workspace.id) })} variant="quiet">Delete</Button></span></li>)}</ul>
    <EditorForm title={editingId ? 'Edit workspace' : 'Add workspace'} onSubmit={save}><Field label="Name"><TextInput onChange={(event) => setName(event.target.value)} required value={name} /></Field><Field label="Description (optional)"><TextInput onChange={(event) => setDescription(event.target.value)} value={description} /></Field><label className="checkbox-row"><input checked={showOnHome} onChange={(event) => setShowOnHome(event.target.checked)} type="checkbox" /> Show on home</label>{error && <p className="form-error" role="alert">{error}</p>}<FormActions editing={Boolean(editingId)} onCancel={reset} submitLabel={editingId ? 'Save workspace' : 'Add workspace'} /></EditorForm>
    {selected && <EditorForm title="Workspace destinations" onSubmit={saveItem}><ul className="compact-list">{selected.items.map((item) => <li key={item.id}><span>{item.label}</span><span><Button onClick={() => { setItemId(item.id); setItemLabel(item.label); setItemUrl(item.url); }} variant="quiet">Edit</Button><Button onClick={() => onSettingsChange({ ...settings, workspaces: removeWorkspaceItem(settings.workspaces, selected.id, item.id) })} variant="quiet">Delete</Button></span></li>)}</ul><Field label="Destination label"><TextInput onChange={(event) => setItemLabel(event.target.value)} required value={itemLabel} /></Field><Field label="URL"><TextInput onChange={(event) => setItemUrl(event.target.value)} required value={itemUrl} /></Field><FormActions editing={Boolean(itemId)} onCancel={() => { setItemId(null); setItemLabel(''); setItemUrl(''); }} submitLabel={itemId ? 'Save destination' : 'Add destination'} /></EditorForm>}
  </section>;
}

function EditorForm({ children, onSubmit, title }: { children: ReactNode; onSubmit: (event: FormEvent<HTMLFormElement>) => void; title: string }) {
  return <form className="editor-form" onSubmit={onSubmit}><h3>{title}</h3>{children}</form>;
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return <label className="editor-field"><span>{label}</span>{children}</label>;
}

function FormActions({ editing, onCancel, submitLabel }: { editing: boolean; onCancel: () => void; submitLabel: string }) {
  return <div className="form-actions">{editing && <Button onClick={onCancel} variant="quiet">Cancel</Button>}<Button type="submit">{submitLabel}</Button></div>;
}

function initials(name: string): string { return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'N'; }
function makeId(prefix: string): string { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }
