/**
 * SkySpark Dashboard Component
 * Interactive dashboard for testing and exploring SkySpark data
 * Uses the useSkyspark hook for state management
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useSkyspark, useSkysparksQuery, useSkysparksConnection } from '@/lib/hooks/use-skyspark';

interface ConnectionStatusProps {
  status: string;
  isConnected: boolean;
  error: string | null;
  onRetry: () => void;
}

function ConnectionStatus({ status, isConnected, error, onRetry }: ConnectionStatusProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      case 'disconnected': return 'bg-red-500';
      case 'error': return 'bg-red-600';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="mb-6 p-4 rounded-lg border bg-white shadow-sm">
      <h2 className="text-lg font-semibold mb-3">SkySpark Connection Status</h2>
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${getStatusColor()}`}></div>
        <span className="capitalize font-medium">{status}</span>
        {isConnected && <span className="text-green-600 text-sm">✓ Connected to demo project</span>}
        <button 
          onClick={onRetry}
          className="ml-auto px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition-colors"
        >
          Test Connection
        </button>
      </div>
      {error && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}
    </div>
  );
}

interface QueryPanelProps {
  query: string;
  setQuery: (query: string) => void;
  result: string | null;
  loading: boolean;
  error: string | null;
  onExecute: () => void;
}

function QueryPanel({ query, setQuery, result, loading, error, onExecute }: QueryPanelProps) {
  const quickQueries = [
    { label: 'Get Sites', query: 'read(site)' },
    { label: 'Get Equipment', query: 'read(equip)' },
    { label: 'Get Points', query: 'read(point)' },
    { label: 'Get All Points (Limit 10)', query: 'read(point).limit(10)' },
    { label: 'About Project', query: 'about()' }
  ];

  return (
    <div className="mb-6 p-4 rounded-lg border bg-white shadow-sm">
      <h2 className="text-lg font-semibold mb-3">Query Executor</h2>
      
      {/* Quick Query Buttons */}
      <div className="mb-4">
        <h3 className="text-sm font-medium mb-2 text-gray-700">Quick Queries:</h3>
        <div className="flex flex-wrap gap-2">
          {quickQueries.map((q, idx) => (
            <button
              key={idx}
              onClick={() => setQuery(q.query)}
              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded text-sm transition-colors"
            >
              {q.label}
            </button>
          ))}
        </div>
      </div>

      {/* Query Input */}
      <div className="mb-4">
        <label htmlFor="queryInput" className="block text-sm font-medium mb-2">
          Axon Query:
        </label>
        <div className="flex gap-2">
          <input
            id="queryInput"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter Axon query (e.g., read(site))"
            className="flex-1 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            onKeyDown={(e) => e.key === 'Enter' && !loading && onExecute()}
          />
          <button 
            onClick={onExecute}
            disabled={loading || !query.trim()}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded transition-colors"
          >
            {loading ? 'Running...' : 'Execute'}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          <strong>Query Error:</strong> {error}
        </div>
      )}

      {/* Results Display */}
      {result && (
        <div>
          <h3 className="text-sm font-medium mb-2">Results:</h3>
          <pre className="bg-gray-50 p-3 rounded border text-xs overflow-auto max-h-96 whitespace-pre-wrap">
            {result}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function SkysparkDashboard() {
  const connection = useSkysparksConnection();
  const queryHook = useSkysparksQuery('read(site)');
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // Auto-execute initial query when connected
  useEffect(() => {
    if (connection.isConnected && !queryHook.result) {
      queryHook.runQuery();
    }
  }, [connection.isConnected]);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">SkySpark Integration Dashboard</h1>
        <p className="text-gray-600">
          Connected to SkySpark Development Instance (localhost:8081) - Project: demo
        </p>
      </div>

      {/* Connection Status */}
      <ConnectionStatus 
        status={connection.status}
        isConnected={connection.isConnected}
        error={connection.error}
        onRetry={connection.retry}
      />

      {/* Query Panel */}
      <QueryPanel
        query={queryHook.query}
        setQuery={queryHook.setQuery}
        result={queryHook.result}
        loading={queryHook.loading}
        error={queryHook.error}
        onExecute={() => queryHook.runQuery()}
      />

      {/* API Endpoints Info */}
      <div className="p-4 rounded-lg border bg-blue-50 shadow-sm">
        <h2 className="text-lg font-semibold mb-3 text-blue-900">Available API Endpoints</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h3 className="font-medium text-blue-800 mb-2">Testing & Connection:</h3>
            <ul className="space-y-1 text-blue-700">
              <li><code>GET /api/skyspark/test</code> - Test connection</li>
              <li><code>POST /api/skyspark/eval</code> - Execute Axon queries</li>
              <li><code>GET /api/skyspark/eval?q=read(site)</code> - Query via URL</li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium text-blue-800 mb-2">Data Endpoints:</h3>
            <ul className="space-y-1 text-blue-700">
              <li><code>GET /api/skyspark/sites</code> - Get all sites</li>
              <li><code>GET /api/skyspark/equipment</code> - Get equipment</li>
              <li><code>GET /api/skyspark/points</code> - Get points</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Diagnostics Toggle */}
      <div className="text-center">
        <button
          onClick={() => setShowDiagnostics(!showDiagnostics)}
          className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm transition-colors"
        >
          {showDiagnostics ? 'Hide' : 'Show'} Technical Details
        </button>
      </div>

      {/* Diagnostics Panel */}
      {showDiagnostics && (
        <div className="p-4 rounded-lg border bg-gray-50 shadow-sm">
          <h2 className="text-lg font-semibold mb-3">Technical Diagnostics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-medium mb-2">Configuration:</h3>
              <ul className="space-y-1 text-gray-700">
                <li><strong>Base URL:</strong> http://localhost:8081</li>
                <li><strong>Project:</strong> demo</li>
                <li><strong>User:</strong> patrick</li>
                <li><strong>Auth Method:</strong> Session Cookie + Attest-Key</li>
                <li><strong>Data Format:</strong> Zinc</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-2">Server Info:</h3>
              <ul className="space-y-1 text-gray-700">
                <li><strong>Version:</strong> SkySpark 3.1.10</li>
                <li><strong>Platform:</strong> Linux aarch64</li>
                <li><strong>Java:</strong> OpenJDK 11.0.25</li>
                <li><strong>Instance:</strong> Development</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
