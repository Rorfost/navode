import type { Workflow } from '@navode/core';
import { Button, Dialog } from './primitives';

export interface WorkflowPreviewDialogProps {
  workflow: Workflow | null;
  reason?: string;
  isOpen: boolean;
  onApprove: () => void;
  onCancel: () => void;
}

export function WorkflowPreviewDialog({
  workflow,
  reason,
  isOpen,
  onApprove,
  onCancel,
}: WorkflowPreviewDialogProps) {
  if (!workflow) return null;

  return (
    <Dialog open={isOpen} onClose={onCancel} label={`Approve Execution: ${workflow.name}`}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          color: 'var(--text-primary, #fff)',
        }}
      >
        <div
          style={{
            background: 'rgba(234, 179, 8, 0.15)',
            border: '1px solid rgba(234, 179, 8, 0.4)',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            fontSize: '0.9rem',
            color: '#fef08a',
          }}
        >
          <strong>⚠️ Approval Required</strong>
          <p style={{ margin: '0.25rem 0 0 0', opacity: 0.9 }}>
            {reason ||
              'This workflow requires explicit confirmation before executing multi-step actions.'}
          </p>
        </div>

        <div>
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem' }}>
            Planned Steps ({workflow.steps.length})
          </h4>
          <ul
            style={{
              margin: 0,
              paddingLeft: '1.25rem',
              fontSize: '0.85rem',
              lineHeight: '1.6',
              opacity: 0.9,
            }}
          >
            {workflow.steps.map((step) => (
              <li key={step.id}>
                <strong>{step.name}</strong> ({step.actionKind})
              </li>
            ))}
          </ul>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
            marginTop: '0.5rem',
          }}
        >
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onApprove}>
            Approve & Run
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
