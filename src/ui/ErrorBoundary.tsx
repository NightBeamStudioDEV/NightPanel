import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Night Panel render error", error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="onboard" style={{ maxWidth: 560 }}>
          <h1>Something went wrong</h1>
          <p className="muted">{this.state.error.message}</p>
          <button
            className="btn primary"
            onClick={() => {
              this.setState({ error: null });
              window.location.reload();
            }}
          >
            Reload Night Panel
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
