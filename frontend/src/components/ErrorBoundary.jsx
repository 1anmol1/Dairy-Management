import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Caught error:", error, errorInfo);
    // If it's a dynamic import error (chunk loading), reload the page to get the latest chunks
    if (
      error.message && 
      (error.message.includes('Failed to fetch dynamically imported module') || 
       error.message.includes('Importing a module script failed'))
    ) {
      window.location.reload();
    }
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'sans-serif' }}>
          <h2>Oops, something went wrong.</h2>
          <p>We've updated the application. If this page doesn't refresh automatically, please refresh it manually.</p>
          <button 
            onClick={() => window.location.reload()}
            style={{ padding: '10px 20px', background: '#0F62FE', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
