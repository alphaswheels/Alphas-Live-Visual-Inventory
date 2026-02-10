import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary fallback={
      <div className="flex items-center justify-center h-screen bg-slate-50 text-slate-800 p-8 text-center">
        <div className="max-w-md">
          <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
          <p className="text-slate-600 mb-4">The application encountered a critical error during startup.</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Reload Application
          </button>
        </div>
      </div>
    }>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);