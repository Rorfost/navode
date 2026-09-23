export type WorkflowActionKind =
  | 'open-url'
  | 'open-project-action'
  | 'launch-workspace'
  | 'start-focus-timer'
  | 'copy-snippet'
  | 'update-today-item'
  | 'refresh-integration'
  | 'notification'
  | 'bounded-delay'
  | 'conditional-branch';

export type WorkflowTriggerKind =
  | 'manual'
  | 'command'
  | 'schedule'
  | 'context'
  | 'integration-event';

export type WorkflowFailurePolicy = 'stop-on-error' | 'continue-on-error';
export type WorkflowApprovalPolicy = 'always' | 'on-high-impact' | 'never';

export interface WorkflowCondition {
  field: 'focus-active' | 'time-of-day' | 'day-of-week' | 'integration-status' | 'custom';
  operator: 'equals' | 'not-equals' | 'greater-than' | 'less-than' | 'contains';
  value: string;
}

export interface WorkflowVariable {
  name: string;
  label: string;
  defaultValue?: string;
  required?: boolean;
}

export interface WorkflowStep {
  id: string;
  name: string;
  actionKind: WorkflowActionKind;
  params: Record<string, string | number | boolean>;
  condition?: WorkflowCondition;
  failurePolicy?: WorkflowFailurePolicy;
}

export interface WorkflowTrigger {
  kind: WorkflowTriggerKind;
  commandAlias?: string;
  cronSchedule?: string; // e.g., "0 9 * * 1-5"
  intervalMinutes?: number;
  eventProvider?: 'github' | 'calendar' | 'codeforces';
  eventType?: string;
  enabled: boolean;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  icon?: string;
  category?: string;
  enabled: boolean;
  triggers: WorkflowTrigger[];
  variables: WorkflowVariable[];
  steps: WorkflowStep[];
  approvalPolicy: WorkflowApprovalPolicy;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowExecutionStep {
  stepId: string;
  stepName: string;
  actionKind: WorkflowActionKind;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  error?: string;
  output?: string;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowName: string;
  triggerKind: WorkflowTriggerKind;
  status: 'queued' | 'running' | 'success' | 'failed' | 'cancelled' | 'requires-approval';
  startedAt: string;
  completedAt?: string;
  steps: WorkflowExecutionStep[];
  error?: string;
  requiresApprovalReason?: string;
}

export interface ExecutionContext {
  openUrl?: (url: string) => void | Promise<void>;
  launchWorkspace?: (workspaceId: string) => void | Promise<void>;
  startFocusTimer?: (minutes: number) => void | Promise<void>;
  copySnippet?: (snippetId: string) => void | Promise<void>;
  updateTodayItem?: (text: string) => void | Promise<void>;
  refreshIntegration?: (providerId: string) => void | Promise<void>;
  notify?: (title: string, message: string) => void | Promise<void>;
  variables?: Record<string, string>;
  isFocusActive?: boolean;
  userApproved?: boolean;
}

export const MAX_WORKFLOW_STEPS = 25;
export const MAX_TAB_OPEN_WARNING_THRESHOLD = 3;
export const STEP_TIMEOUT_MS = 10_000;

/**
 * Validates a workflow for consistency and safety bounds.
 */
export function validateWorkflow(workflow: Workflow): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!workflow.name || workflow.name.trim().length === 0) {
    errors.push('Workflow must have a non-empty name.');
  }

  if (workflow.steps.length === 0) {
    errors.push('Workflow must contain at least one step.');
  }

  if (workflow.steps.length > MAX_WORKFLOW_STEPS) {
    errors.push(`Workflow exceeds maximum limit of ${MAX_WORKFLOW_STEPS} steps.`);
  }

  let tabCount = 0;
  for (const step of workflow.steps) {
    if (step.actionKind === 'open-url') {
      tabCount++;
      const url = String(step.params.url || '');
      if (
        !url.startsWith('http://') &&
        !url.startsWith('https://') &&
        !url.startsWith('chrome://')
      ) {
        errors.push(`Step "${step.name}" has invalid URL scheme: ${url}`);
      }
    }
  }

  if (tabCount >= MAX_TAB_OPEN_WARNING_THRESHOLD) {
    warnings.push(`Workflow opens ${tabCount} tabs simultaneously.`);
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Evaluates whether a workflow execution requires user approval before proceeding.
 */
export function requiresUserApproval(
  workflow: Workflow,
  context?: ExecutionContext,
): { requiresApproval: boolean; reason?: string } {
  if (context?.userApproved) {
    return { requiresApproval: false };
  }

  if (workflow.approvalPolicy === 'always') {
    return { requiresApproval: true, reason: 'Workflow configuration requires explicit approval.' };
  }

  if (workflow.approvalPolicy === 'on-high-impact') {
    const tabCount = workflow.steps.filter((s) => s.actionKind === 'open-url').length;
    if (tabCount >= MAX_TAB_OPEN_WARNING_THRESHOLD) {
      return {
        requiresApproval: true,
        reason: `Workflow will open ${tabCount} browser tabs.`,
      };
    }
  }

  return { requiresApproval: false };
}

/**
 * Template Workflows for V4 Automate
 */
export const DEFAULT_WORKFLOW_TEMPLATES: Workflow[] = [
  {
    id: 'template-start-work',
    name: 'Start Work Session',
    description:
      'Opens core work links, launches your primary workspace, and starts a focus timer.',
    icon: 'briefcase',
    category: 'Productivity',
    enabled: true,
    triggers: [{ kind: 'command', commandAlias: 'run work', enabled: true }],
    variables: [{ name: 'minutes', label: 'Focus Minutes', defaultValue: '50', required: false }],
    steps: [
      {
        id: 'step-1',
        name: 'Open GitHub',
        actionKind: 'open-url',
        params: { url: 'https://github.com' },
      },
      {
        id: 'step-2',
        name: 'Start 50-minute Focus',
        actionKind: 'start-focus-timer',
        params: { durationMinutes: 50 },
      },
      {
        id: 'step-3',
        name: 'Notify Work Started',
        actionKind: 'notification',
        params: { title: 'Work Session', message: "Focus timer active. Let's build!" },
      },
    ],
    approvalPolicy: 'on-high-impact',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'template-start-study',
    name: 'Start Study Session',
    description: 'Prepares study resources, notes, and sets up a study timer.',
    icon: 'book-open',
    category: 'Learning',
    enabled: true,
    triggers: [{ kind: 'command', commandAlias: 'run study', enabled: true }],
    variables: [
      { name: 'subject', label: 'Study Subject', defaultValue: 'General', required: false },
    ],
    steps: [
      {
        id: 'step-1',
        name: 'Open Documentation',
        actionKind: 'open-url',
        params: { url: 'https://developer.mozilla.org' },
      },
      {
        id: 'step-2',
        name: 'Start 45-minute Focus',
        actionKind: 'start-focus-timer',
        params: { durationMinutes: 45 },
      },
    ],
    approvalPolicy: 'never',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'template-start-focus',
    name: 'Deep Focus Sprint',
    description: 'Refreshes context, silences distractions, and starts a 90-minute focus timer.',
    icon: 'zap',
    category: 'Focus',
    enabled: true,
    triggers: [{ kind: 'command', commandAlias: 'focus', enabled: true }],
    variables: [],
    steps: [
      {
        id: 'step-1',
        name: 'Start 90-minute Focus',
        actionKind: 'start-focus-timer',
        params: { durationMinutes: 90 },
      },
      {
        id: 'step-2',
        name: 'Focus Session Banner',
        actionKind: 'notification',
        params: { title: 'Deep Focus', message: '90-minute sprint initiated.' },
      },
    ],
    approvalPolicy: 'never',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'template-project-session',
    name: 'Project Kickoff',
    description: 'Launches project workspace, checks status, and prepares notes.',
    icon: 'folder',
    category: 'Projects',
    enabled: true,
    triggers: [{ kind: 'command', commandAlias: 'project-session', enabled: true }],
    variables: [{ name: 'projectId', label: 'Project ID', defaultValue: '', required: false }],
    steps: [
      {
        id: 'step-1',
        name: 'Refresh Integrations',
        actionKind: 'refresh-integration',
        params: { providerId: 'github' },
      },
      {
        id: 'step-2',
        name: 'Start 30-minute Focus',
        actionKind: 'start-focus-timer',
        params: { durationMinutes: 30 },
      },
    ],
    approvalPolicy: 'never',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'template-morning-setup',
    name: 'Morning Setup Routine',
    description: 'Refreshes calendar and GitHub status, sets daily top 3 goals.',
    icon: 'sun',
    category: 'Daily',
    enabled: true,
    triggers: [
      { kind: 'schedule', cronSchedule: '0 9 * * 1-5', enabled: true },
      { kind: 'command', commandAlias: 'morning', enabled: true },
    ],
    variables: [],
    steps: [
      {
        id: 'step-1',
        name: 'Refresh Calendar',
        actionKind: 'refresh-integration',
        params: { providerId: 'google-calendar' },
      },
      {
        id: 'step-2',
        name: 'Refresh GitHub',
        actionKind: 'refresh-integration',
        params: { providerId: 'github' },
      },
      {
        id: 'step-3',
        name: 'Morning Greeting',
        actionKind: 'notification',
        params: { title: 'Good Morning!', message: 'Calendar & GitHub synced.' },
      },
    ],
    approvalPolicy: 'never',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

/**
 * Executes a single workflow step.
 */
export async function executeStep(
  step: WorkflowStep,
  context: ExecutionContext,
): Promise<WorkflowExecutionStep> {
  const startedAt = new Date().toISOString();
  const executionStep: WorkflowExecutionStep = {
    stepId: step.id,
    stepName: step.name,
    actionKind: step.actionKind,
    status: 'running',
    startedAt,
  };

  try {
    switch (step.actionKind) {
      case 'open-url': {
        const rawUrl = String(step.params.url || '');
        const url = interpolateVariables(rawUrl, context.variables);
        if (context.openUrl) {
          await context.openUrl(url);
        }
        executionStep.output = `Opened URL: ${url}`;
        break;
      }
      case 'launch-workspace': {
        const workspaceId = String(step.params.workspaceId || '');
        if (context.launchWorkspace) {
          await context.launchWorkspace(workspaceId);
        }
        executionStep.output = `Launched workspace: ${workspaceId}`;
        break;
      }
      case 'start-focus-timer': {
        const duration = Number(step.params.durationMinutes || 25);
        if (context.startFocusTimer) {
          await context.startFocusTimer(duration);
        }
        executionStep.output = `Started focus timer: ${duration}m`;
        break;
      }
      case 'copy-snippet': {
        const snippetId = String(step.params.snippetId || '');
        if (context.copySnippet) {
          await context.copySnippet(snippetId);
        }
        executionStep.output = `Copied snippet: ${snippetId}`;
        break;
      }
      case 'update-today-item': {
        const text = interpolateVariables(String(step.params.text || ''), context.variables);
        if (context.updateTodayItem) {
          await context.updateTodayItem(text);
        }
        executionStep.output = `Added today item: ${text}`;
        break;
      }
      case 'refresh-integration': {
        const providerId = String(step.params.providerId || '');
        if (context.refreshIntegration) {
          await context.refreshIntegration(providerId);
        }
        executionStep.output = `Refreshed integration: ${providerId}`;
        break;
      }
      case 'notification': {
        const title = interpolateVariables(
          String(step.params.title || 'Navode'),
          context.variables,
        );
        const message = interpolateVariables(String(step.params.message || ''), context.variables);
        if (context.notify) {
          await context.notify(title, message);
        }
        executionStep.output = `Notification: ${title} - ${message}`;
        break;
      }
      case 'bounded-delay': {
        const ms = Math.min(Number(step.params.durationMs || 1000), 5000);
        await new Promise((resolve) => setTimeout(resolve, ms));
        executionStep.output = `Delayed ${ms}ms`;
        break;
      }
      default:
        executionStep.output = `Executed step ${step.name}`;
    }

    executionStep.status = 'success';
    executionStep.completedAt = new Date().toISOString();
  } catch (err) {
    executionStep.status = 'failed';
    executionStep.error = err instanceof Error ? err.message : String(err);
    executionStep.completedAt = new Date().toISOString();
  }

  return executionStep;
}

/**
 * Runs a complete workflow execution lifecycle.
 */
export async function runWorkflowExecution(
  workflow: Workflow,
  triggerKind: WorkflowTriggerKind,
  context: ExecutionContext = {},
): Promise<WorkflowExecution> {
  const executionId = `exec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const startedAt = new Date().toISOString();

  const approvalCheck = requiresUserApproval(workflow, context);
  if (approvalCheck.requiresApproval) {
    return {
      id: executionId,
      workflowId: workflow.id,
      workflowName: workflow.name,
      triggerKind,
      status: 'requires-approval',
      startedAt,
      steps: workflow.steps.map((s) => ({
        stepId: s.id,
        stepName: s.name,
        actionKind: s.actionKind,
        status: 'pending',
      })),
      ...(approvalCheck.reason ? { requiresApprovalReason: approvalCheck.reason } : {}),
    };
  }

  const execution: WorkflowExecution = {
    id: executionId,
    workflowId: workflow.id,
    workflowName: workflow.name,
    triggerKind,
    status: 'running',
    startedAt,
    steps: [],
  };

  for (const step of workflow.steps) {
    const executedStep = await executeStep(step, context);
    execution.steps.push(executedStep);

    if (executedStep.status === 'failed') {
      const failurePolicy = step.failurePolicy || 'stop-on-error';
      if (failurePolicy === 'stop-on-error') {
        execution.status = 'failed';
        execution.error = `Step "${step.name}" failed: ${executedStep.error}`;
        execution.completedAt = new Date().toISOString();
        return execution;
      }
    }
  }

  execution.status = 'success';
  execution.completedAt = new Date().toISOString();
  return execution;
}

function interpolateVariables(template: string, variables?: Record<string, string>): string {
  if (!variables) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => variables[key] ?? `{${key}}`);
}
