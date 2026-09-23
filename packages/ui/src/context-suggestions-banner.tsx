import type { ContextSuggestion } from '@navode/core';
import { Button } from './primitives';

export interface ContextSuggestionsBannerProps {
  suggestions: ContextSuggestion[];
  onAction: (suggestion: ContextSuggestion) => void;
  onDismiss: (suggestionId: string) => void;
}

export function ContextSuggestionsBanner({
  suggestions,
  onAction,
  onDismiss,
}: ContextSuggestionsBannerProps) {
  if (!suggestions || suggestions.length === 0 || !suggestions[0]) return null;

  const topSuggestion = suggestions[0];

  return (
    <div className="context-banner">
      <div className="context-banner-left">
        <div className="context-banner-icon" aria-hidden="true">
          ✦
        </div>
        <div className="context-banner-copy">
          <div className="context-banner-title">{topSuggestion.title}</div>
          <div className="context-banner-desc">{topSuggestion.description}</div>
        </div>
      </div>
      <div className="context-banner-actions">
        <Button variant="primary" onClick={() => onAction(topSuggestion)}>
          Run
        </Button>
        <Button
          variant="quiet"
          onClick={() => onDismiss(topSuggestion.id)}
          aria-label="Dismiss suggestion"
        >
          ✕
        </Button>
      </div>
    </div>
  );
}
