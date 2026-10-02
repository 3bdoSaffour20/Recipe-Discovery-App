import { Component } from 'react';
import { AlertIcon } from './Icons';

/**
 * Catches render-time errors so a single broken component cannot blank the
 * whole app. Navigation and the header stay usable because only the subtree
 * below it is unmounted.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // In production this is where a reporting service would be called.
    console.error('Unhandled rendering error:', error, info?.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    const { children } = this.props;

    if (!error) return children;

    return (
      <div className="error-boundary">
        <span className="state__icon" aria-hidden="true">
          <AlertIcon />
        </span>
        <h1 className="error-boundary__title">Something went wrong.</h1>
        <p className="error-boundary__message">
          The page ran into an unexpected problem. Reloading usually fixes it.
        </p>

        {import.meta.env.DEV ? (
          <pre className="error-boundary__details">{error.stack ?? error.message}</pre>
        ) : null}

        <div className="cluster gap-3">
          <button type="button" className="btn btn--primary" onClick={this.handleReset}>
            Try Again
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => window.location.reload()}
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;