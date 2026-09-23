import type { WorkflowExecution } from './workflow';

export const MAX_WORKFLOW_HISTORY_ITEMS = 50;

export interface WorkflowHistoryLog {
  executions: WorkflowExecution[];
}

export function createEmptyWorkflowHistoryLog(): WorkflowHistoryLog {
  return { executions: [] };
}

export function appendWorkflowExecutionLog(
  log: WorkflowHistoryLog,
  execution: WorkflowExecution,
): WorkflowHistoryLog {
  const updatedExecutions = [execution, ...log.executions].slice(0, MAX_WORKFLOW_HISTORY_ITEMS);
  return { executions: updatedExecutions };
}

export function clearWorkflowHistoryLog(): WorkflowHistoryLog {
  return createEmptyWorkflowHistoryLog();
}

export function filterWorkflowHistoryByStatus(
  log: WorkflowHistoryLog,
  status: WorkflowExecution['status'],
): WorkflowExecution[] {
  return log.executions.filter((e) => e.status === status);
}
