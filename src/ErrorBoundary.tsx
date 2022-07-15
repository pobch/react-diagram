import * as React from 'react'

type TProps = { children: React.ReactNode; [key: string]: unknown }
type TState = { error: Error | null; errorInfo: { componentStack: string } | null }

export class ErrorBoundary extends React.Component<TProps, TState> {
  state: TState = { error: null, errorInfo: null }

  componentDidCatch(error: Error, errorInfo: { componentStack: string }) {
    // Catch errors in any components below and re-render with error message
    this.setState({
      error: error,
      errorInfo: errorInfo,
    })
    // You can also log error messages to an error reporting service here
  }

  render() {
    if (this.state.errorInfo) {
      // Error path
      return (
        <div>
          <h1>Error Boundary</h1>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            <strong>Message:</strong>
            <br />
            {this.state.error && this.state.error.toString()}
            <br />
            <strong>Stack:</strong>
            <br />
            {this.state.error && this.state.error.stack?.toString()}
            <br />
            <strong>Component Stack:</strong>
            <br />
            {this.state.errorInfo.componentStack}
          </details>
        </div>
      )
    }
    // Normally, just render children
    return this.props.children
  }
}
