import { isSafeExternalUrl } from './command-engine';

export type ProjectActionKind = 'repository' | 'frontend' | 'backend' | 'deployment' | 'database' | 'docs' | 'custom';

export interface QuickLink {
  alias?: string;
  enabled: boolean;
  group?: string;
  icon?: string;
  id: string;
  name: string;
  order: number;
  showOnHome: boolean;
  url: string;
}

export interface ProjectAction {
  icon?: string;
  id: string;
  kind: ProjectActionKind;
  label: string;
  url: string;
}

export interface Project {
  actions: ProjectAction[];
  description?: string;
  icon?: string;
  id: string;
  name: string;
  showOnHome: boolean;
}

export interface WorkspaceItem {
  id: string;
  label: string;
  url: string;
}

export interface Workspace {
  description?: string;
  id: string;
  items: WorkspaceItem[];
  name: string;
  order: number;
  showOnHome: boolean;
}

export interface QuickLinkInput {
  alias?: string | undefined;
  enabled?: boolean | undefined;
  group?: string | undefined;
  icon?: string | undefined;
  name: string;
  showOnHome?: boolean | undefined;
  url: string;
}

export interface ProjectInput {
  description?: string | undefined;
  icon?: string | undefined;
  name: string;
  showOnHome?: boolean | undefined;
}

export interface ProjectActionInput {
  icon?: string | undefined;
  kind: ProjectActionKind;
  label: string;
  url: string;
}

export interface WorkspaceInput {
  description?: string | undefined;
  name: string;
  showOnHome?: boolean | undefined;
}

export interface WorkspaceItemInput {
  label: string;
  url: string;
}

export interface WorkspaceLaunchPlan {
  label: string;
  urls: string[];
  workspaceId: string;
}

export function createStarterQuickLinks(): QuickLink[] {
  return [
    createQuickLink({ name: 'Google', url: 'https://www.google.com', icon: 'G', showOnHome: true }, 'starter-google', 0),
    createQuickLink({ name: 'YouTube', url: 'https://www.youtube.com', icon: 'Y', showOnHome: true }, 'starter-youtube', 1),
    createQuickLink({ name: 'GitHub', url: 'https://github.com', icon: 'GH', showOnHome: true }, 'starter-github', 2),
  ].filter((link): link is QuickLink => link !== null);
}

export function createQuickLink(input: QuickLinkInput, id: string, order: number): QuickLink | null {
  const name = input.name.trim();
  const url = input.url.trim();
  if (!name || !isSafeExternalUrl(url)) return null;
  const alias = normalizeAlias(input.alias);
  if (input.alias && !alias) return null;
  return {
    ...(alias ? { alias } : {}),
    enabled: input.enabled ?? true,
    ...(normalizeText(input.group) ? { group: normalizeText(input.group) } : {}),
    ...(normalizeIcon(input.icon) ? { icon: normalizeIcon(input.icon) } : {}),
    id,
    name,
    order,
    showOnHome: input.showOnHome ?? true,
    url,
  };
}

export function updateQuickLink(links: readonly QuickLink[], id: string, input: QuickLinkInput): QuickLink[] | null {
  const target = links.find((link) => link.id === id);
  if (!target) return null;
  const updated = createQuickLink(input, target.id, target.order);
  if (!updated || links.some((link) => link.id !== id && link.alias && link.alias === updated.alias)) return null;
  return links.map((link) => (link.id === id ? updated : link));
}

export function removeQuickLink(links: readonly QuickLink[], id: string): QuickLink[] {
  return reorderQuickLinks(links.filter((link) => link.id !== id), links.filter((link) => link.id !== id).map((link) => link.id));
}

export function reorderQuickLinks(links: readonly QuickLink[], ids: readonly string[]): QuickLink[] {
  const linkById = new Map(links.map((link) => [link.id, link]));
  const ordered = ids.flatMap((id) => {
    const link = linkById.get(id);
    return link ? [link] : [];
  });
  const remaining = links.filter((link) => !ids.includes(link.id)).sort((left, right) => left.order - right.order);
  return [...ordered, ...remaining].map((link, order) => ({ ...link, order }));
}

export function createProject(input: ProjectInput, id: string): Project | null {
  const name = input.name.trim();
  if (!name) return null;
  return {
    actions: [],
    ...(normalizeText(input.description) ? { description: normalizeText(input.description) } : {}),
    ...(normalizeIcon(input.icon) ? { icon: normalizeIcon(input.icon) } : {}),
    id,
    name,
    showOnHome: input.showOnHome ?? false,
  };
}

export function updateProject(projects: readonly Project[], id: string, input: ProjectInput): Project[] | null {
  const target = projects.find((project) => project.id === id);
  if (!target) return null;
  const updated = createProject(input, id);
  if (!updated) return null;
  return projects.map((project) => (project.id === id ? { ...updated, actions: project.actions } : project));
}

export function removeProject(projects: readonly Project[], id: string): Project[] {
  return projects.filter((project) => project.id !== id);
}

export function createProjectAction(input: ProjectActionInput, id: string): ProjectAction | null {
  const label = input.label.trim();
  const url = input.url.trim();
  if (!label || !isSafeExternalUrl(url)) return null;
  return { ...(normalizeIcon(input.icon) ? { icon: normalizeIcon(input.icon) } : {}), id, kind: input.kind, label, url };
}

export function saveProjectAction(projects: readonly Project[], projectId: string, action: ProjectAction): Project[] | null {
  const project = projects.find((candidate) => candidate.id === projectId);
  if (!project) return null;
  const actions = project.actions.some((candidate) => candidate.id === action.id)
    ? project.actions.map((candidate) => (candidate.id === action.id ? action : candidate))
    : [...project.actions, action];
  return projects.map((candidate) => (candidate.id === projectId ? { ...candidate, actions } : candidate));
}

export function removeProjectAction(projects: readonly Project[], projectId: string, actionId: string): Project[] {
  return projects.map((project) =>
    project.id === projectId ? { ...project, actions: project.actions.filter((action) => action.id !== actionId) } : project,
  );
}

export function createWorkspace(input: WorkspaceInput, id: string, order: number): Workspace | null {
  const name = input.name.trim();
  if (!name) return null;
  return {
    ...(normalizeText(input.description) ? { description: normalizeText(input.description) } : {}),
    id,
    items: [],
    name,
    order,
    showOnHome: input.showOnHome ?? false,
  };
}

export function updateWorkspace(workspaces: readonly Workspace[], id: string, input: WorkspaceInput): Workspace[] | null {
  const target = workspaces.find((workspace) => workspace.id === id);
  if (!target) return null;
  const updated = createWorkspace(input, id, target.order);
  if (!updated) return null;
  return workspaces.map((workspace) => (workspace.id === id ? { ...updated, items: workspace.items } : workspace));
}

export function removeWorkspace(workspaces: readonly Workspace[], id: string): Workspace[] {
  return workspaces.filter((workspace) => workspace.id !== id);
}

export function createWorkspaceItem(input: WorkspaceItemInput, id: string): WorkspaceItem | null {
  const label = input.label.trim();
  const url = input.url.trim();
  if (!label || !isSafeExternalUrl(url)) return null;
  return { id, label, url };
}

export function saveWorkspaceItem(workspaces: readonly Workspace[], workspaceId: string, item: WorkspaceItem): Workspace[] | null {
  const workspace = workspaces.find((candidate) => candidate.id === workspaceId);
  if (!workspace) return null;
  const items = workspace.items.some((candidate) => candidate.id === item.id)
    ? workspace.items.map((candidate) => (candidate.id === item.id ? item : candidate))
    : [...workspace.items, item];
  return workspaces.map((candidate) => (candidate.id === workspaceId ? { ...candidate, items } : candidate));
}

export function removeWorkspaceItem(workspaces: readonly Workspace[], workspaceId: string, itemId: string): Workspace[] {
  return workspaces.map((workspace) =>
    workspace.id === workspaceId ? { ...workspace, items: workspace.items.filter((item) => item.id !== itemId) } : workspace,
  );
}

export function createWorkspaceLaunchPlan(workspace: Workspace): WorkspaceLaunchPlan | null {
  const urls = workspace.items.map((item) => item.url).filter(isSafeExternalUrl);
  return urls.length ? { label: workspace.name, urls, workspaceId: workspace.id } : null;
}

function normalizeText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

function normalizeIcon(value: string | undefined): string | undefined {
  const normalized = normalizeText(value);
  return normalized && normalized.length <= 4 ? normalized : undefined;
}

function normalizeAlias(value: string | undefined): string | undefined {
  const normalized = normalizeText(value)?.toLowerCase();
  return normalized && /^[a-z0-9][a-z0-9-]{0,31}$/.test(normalized) ? normalized : undefined;
}
