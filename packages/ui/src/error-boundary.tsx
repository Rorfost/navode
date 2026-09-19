import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from './primitives';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/** Keeps a host rendering a safe recovery screen if an unexpected UI error occurs. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // Personal Navode data must never be emitted from this recovery path.
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <main className="app-recovery" role="alert">
        <p className="eyebrow">NAVODE RECOVERY</p>
        <h1>Navode could not load this screen.</h1>
        <p className="muted">
          Your locally stored data was not changed. Try loading the screen again; if the issue
          continues, use Settings to export or reset local data.
        </p>
        <Button onClick={() => this.setState({ hasError: false })} variant="primary">
          Try again
        </Button>
      </main>
    );
  }
}
