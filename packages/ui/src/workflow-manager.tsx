import { useState } from 'react';
import {
  DEFAULT_WORKFLOW_TEMPLATES,
  type Workflow,
  type WorkflowExecution,
  type WorkflowHistoryLog,
} from '@navode/core';
import { Button, Card, Dialog, Toggle } from './primitives';
import { WorkflowBuilder } from './workflow-builder';
import { AIWorkflowAssistant } from './ai-workflow-assistant';

export interface WorkflowManagerProps {
  workflows: Workflow[];
  historyLog: WorkflowHistoryLog;
  onSaveWorkflow: (workflow: Workflow) => void;
  onDeleteWorkflow: (workflowId: string) => void;
  onRunWorkflow: (workflow: Workflow) => void;
  onClearHistory: () => void;
}

export function WorkflowManager({
  workflows,
  historyLog,
  onSaveWorkflow,
  onDeleteWorkflow,
  onRunWorkflow,
  onClearHistory,
}: WorkflowManagerProps) {
  const [activeTab, setActiveTab] = useState<'workflows' | 'templates' | 'history'>('workflows');
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);

  const handleCreateNew = () => {
    setEditingWorkflow(null);
    setIsBuilderOpen(true);
  };

  const handleEdit = (wf: Workflow) => {
    setEditingWorkflow(wf);
    setIsBuilderOpen(true);
  };

  const handleUseTemplate = (template: Workflow) => {
    const clone: Workflow = {
      ...template,
      id: `wf_${Date.now()}`,
      name: `${template.name} (Custom)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSaveWorkflow(clone);
    setActiveTab('workflows');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button
            variant={activeTab === 'workflows' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('workflows')}
          >
            My Workflows ({workflows.length})
          </Button>
          <Button
            variant={activeTab === 'templates' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('templates')}
          >
            Templates Gallery ({DEFAULT_WORKFLOW_TEMPLATES.length})
          </Button>
          <Button
            variant={activeTab === 'history' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('history')}
          >
            Execution History ({historyLog.executions.length})
          </Button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button variant="secondary" onClick={() => setIsAIOpen(true)}>
            🤖 AI Generator
          </Button>
          <Button variant="primary" onClick={handleCreateNew}>
            + New Workflow
          </Button>
        </div>
      </div>

      {/* Tab 1: Workflows List */}
      {activeTab === 'workflows' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1rem',
          }}
        >
          {workflows.map((wf) => (
            <Card
              key={wf.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '0.75rem',
              }}
            >
              <div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <h4 style={{ margin: 0, fontSize: '1rem', color: '#f8fafc' }}>{wf.name}</h4>
                  <Toggle
                    pressed={wf.enabled}
                    onClick={() => onSaveWorkflow({ ...wf, enabled: !wf.enabled })}
                  >
                    {wf.enabled ? 'Enabled' : 'Disabled'}
                  </Toggle>
                </div>
                <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                  {wf.description}
                </p>
              </div>

              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                <div>Steps: {wf.steps.length}</div>
                <div>
                  Trigger: {wf.triggers[0]?.commandAlias || wf.triggers[0]?.kind || 'manual'}
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: '0.5rem',
                  justifyContent: 'flex-end',
                  marginTop: '0.5rem',
                }}
              >
                <Button variant="quiet" onClick={() => onDeleteWorkflow(wf.id)}>
                  Delete
                </Button>
                <Button variant="secondary" onClick={() => handleEdit(wf)}>
                  Edit
                </Button>
                <Button variant="primary" onClick={() => onRunWorkflow(wf)}>
                  ▶ Run
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Tab 2: Templates Gallery */}
      {activeTab === 'templates' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1rem',
          }}
        >
          {DEFAULT_WORKFLOW_TEMPLATES.map((tmpl) => (
            <Card
              key={tmpl.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '0.75rem',
              }}
            >
              <div>
                <span
                  style={{
                    background: 'rgba(59, 130, 246, 0.15)',
                    color: '#60a5fa',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                  }}
                >
                  {tmpl.category}
                </span>
                <h4 style={{ margin: '0.4rem 0 0 0', fontSize: '1rem', color: '#f8fafc' }}>
                  {tmpl.name}
                </h4>
                <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                  {tmpl.description}
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button variant="primary" onClick={() => handleUseTemplate(tmpl)}>
                  Use Template
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Tab 3: Execution History */}
      {activeTab === 'history' && (
        <Card style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, color: '#f8fafc' }}>Recent Execution Logs</h4>
            <Button variant="secondary" onClick={onClearHistory}>
              Clear History
            </Button>
          </div>

          {historyLog.executions.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: '0.88rem' }}>No recent workflow executions.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {historyLog.executions.map((exec) => (
                <div
                  key={exec.id}
                  style={{
                    background: 'rgba(15, 23, 42, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '6px',
                    padding: '0.65rem 0.85rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.85rem',
                  }}
                >
                  <div>
                    <strong style={{ color: '#f8fafc' }}>{exec.workflowName}</strong>
                    <div style={{ color: '#64748b', fontSize: '0.78rem' }}>
                      {new Date(exec.startedAt).toLocaleString()} ({exec.steps.length} steps)
                    </div>
                  </div>
                  <span
                    style={{
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background:
                        exec.status === 'success'
                          ? 'rgba(34, 197, 94, 0.2)'
                          : exec.status === 'failed'
                            ? 'rgba(239, 68, 68, 0.2)'
                            : 'rgba(234, 179, 8, 0.2)',
                      color:
                        exec.status === 'success'
                          ? '#4ade80'
                          : exec.status === 'failed'
                            ? '#f87171'
                            : '#fde047',
                    }}
                  >
                    {exec.status.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Builder Modal */}
      <WorkflowBuilder
        workflow={editingWorkflow}
        isOpen={isBuilderOpen}
        onSave={onSaveWorkflow}
        onClose={() => setIsBuilderOpen(false)}
      />

      {/* AI Assistant Modal */}
      <AIWorkflowAssistant
        isOpen={isAIOpen}
        onClose={() => setIsAIOpen(false)}
        onAcceptProposal={onSaveWorkflow}
      />
    </div>
  );
}
