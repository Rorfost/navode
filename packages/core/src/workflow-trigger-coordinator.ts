import type { Workflow, WorkflowTrigger } from './workflow';

export interface ScheduledRoutineInfo {
  workflowId: string;
  workflowName: string;
  trigger: WorkflowTrigger;
  nextRunEstimated?: string;
  status: 'active' | 'paused' | 'invalid';
}

/**
 * Calculates estimated next run timestamp for a workflow trigger.
 */
export function calculateNextTriggerRun(
  trigger: WorkflowTrigger,
  now = new Date(),
): string | undefined {
  if (!trigger.enabled) return undefined;

  if (trigger.kind === 'schedule') {
    if (trigger.intervalMinutes && trigger.intervalMinutes > 0) {
      const nextTime = new Date(now.getTime() + trigger.intervalMinutes * 60_000);
      return nextTime.toISOString();
    }
    // Default morning schedule assumption for standard cron if not parsed by full cron library
    const nextTime = new Date(now);
    nextTime.setHours(9, 0, 0, 0);
    if (nextTime <= now) {
      nextTime.setDate(nextTime.getDate() + 1);
    }
    return nextTime.toISOString();
  }

  return undefined;
}

/**
 * Maps all enabled scheduled workflows for display and alarm setup.
 */
export function getActiveScheduledRoutines(
  workflows: Workflow[],
  now = new Date(),
): ScheduledRoutineInfo[] {
  const routines: ScheduledRoutineInfo[] = [];

  for (const workflow of workflows) {
    if (!workflow.enabled) continue;

    for (const trigger of workflow.triggers) {
      if (trigger.kind === 'schedule' && trigger.enabled) {
        const nextRun = calculateNextTriggerRun(trigger, now);
        routines.push({
          workflowId: workflow.id,
          workflowName: workflow.name,
          trigger,
          ...(nextRun ? { nextRunEstimated: nextRun } : {}),
          status: 'active',
        });
      }
    }
  }

  return routines;
}
