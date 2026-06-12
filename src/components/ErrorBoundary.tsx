import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@carbon/react';
import { reportError } from '../utils/telemetry';

interface Props {
  children: ReactNode;
  /**
   * Compact replacement UI for granular boundaries (e.g. a single post in a
   * feed). When provided it's rendered in place of the full-page recovery
   * screen, so one malformed item degrades to a small notice instead of taking
   * down its siblings. Omit it for top-level boundaries.
   */
  fallback?: ReactNode;
}
interface State {
  error: Error | null;
  componentStack: string | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, componentStack: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    reportError(error, { source: 'react', componentStack: info.componentStack ?? undefined });
    this.setState({ componentStack: info.componentStack ?? null });
  }

  private reset = () => {
    this.setState({ error: null, componentStack: null });
  };

  private reload = () => {
    window.location.reload();
  };

  render() {
    const { error, componentStack } = this.state;
    if (error) {
      if (this.props.fallback !== undefined) {
        return this.props.fallback;
      }
      return (
        <div
          role="alert"
          style={{
            padding: '2rem',
            maxWidth: '720px',
            margin: '4rem auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          <h2 style={{ margin: 0 }}>Something went wrong</h2>
          <p style={{ color: 'var(--cds-text-secondary)', margin: 0 }}>{error.message}</p>
          {(error.stack || componentStack) && (
            <details
              style={{
                fontSize: '0.75rem',
                color: 'var(--cds-text-secondary)',
                backgroundColor: 'var(--cds-layer)',
                padding: '0.75rem 1rem',
                borderRadius: '4px',
                border: '1px solid var(--cds-border-subtle)',
              }}
            >
              <summary style={{ cursor: 'pointer' }}>Technical details</summary>
              {error.stack && (
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: '0.5rem 0' }}>
                  {error.stack}
                </pre>
              )}
              {componentStack && (
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: '0.5rem 0' }}>
                  {componentStack}
                </pre>
              )}
            </details>
          )}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Button onClick={this.reset}>Try again</Button>
            <Button kind="secondary" onClick={this.reload}>
              Reload page
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
