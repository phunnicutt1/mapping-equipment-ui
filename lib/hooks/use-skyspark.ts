/**
 * React Hook for SkySpark Integration
 * Provides state management and API methods for SkySpark data
 * Tested with SkySpark Development Instance 3.1.10
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { SkysparkResponse } from '../skyspark-api';

export type ConnectionStatus = 'unknown' | 'connecting' | 'connected' | 'disconnected' | 'error';

export interface UseSkyspark {
  // State
  sites: string[];
  equipment: string[];
  points: string[];
  loading: boolean;
  error: string | null;
  connectionStatus: ConnectionStatus;
  
  // Methods
  testConnection: () => Promise<boolean>;
  executeQuery: (expr: string) => Promise<string | null>;
  fetchSites: () => Promise<void>;
  fetchEquipment: (siteId: string) => Promise<void>;
  fetchPoints: (equipId: string) => Promise<void>;
  clearError: () => void;
  
  // Raw data access
  lastResponse: SkysparkResponse | null;
}

export function useSkyspark(): UseSkyspark {
  // State management
  const [sites, setSites] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [points, setPoints] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('unknown');
  const [lastResponse, setLastResponse] = useState<SkysparkResponse | null>(null);

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Test connection to SkySpark
  const testConnection = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    setConnectionStatus('connecting');
    setError(null);

    try {
      const response = await fetch('/api/skyspark/test');
      const result = await response.json();
      
      if (result.success) {
        setConnectionStatus('connected');
        return true;
      } else {
        setConnectionStatus('disconnected');
        setError(result.message || 'Connection failed');
        return false;
      }
    } catch (err) {
      setConnectionStatus('error');
      setError(err instanceof Error ? err.message : 'Connection error');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Execute direct Axon query
  const executeQuery = useCallback(async (expr: string): Promise<string | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/skyspark/eval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expr })
      });
      
      const result: SkysparkResponse = await response.json();
      setLastResponse(result);
      
      if (result.success && result.data) {
        return result.data;
      } else {
        setError(result.error || 'Query failed');
        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Query error';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch sites using direct query
  const fetchSites = useCallback(async (): Promise<void> => {
    const result = await executeQuery('read(site)');
    if (result) {
      // Parse Zinc response or use raw data
      // For now, store as array of strings - can enhance parsing later
      setSites([result]);
    }
  }, [executeQuery]);

  // Fetch equipment for a site
  const fetchEquipment = useCallback(async (siteId: string): Promise<void> => {
    const result = await executeQuery(`read(equip and siteRef==@${siteId})`);
    if (result) {
      setEquipment([result]);
    }
  }, [executeQuery]);

  // Fetch points for equipment  
  const fetchPoints = useCallback(async (equipId: string): Promise<void> => {
    const result = await executeQuery(`read(point and equipRef==@${equipId})`);
    if (result) {
      setPoints([result]);
    }
  }, [executeQuery]);

  // Auto-test connection on mount
  useEffect(() => {
    testConnection();
  }, [testConnection]);

  return {
    // State
    sites,
    equipment,
    points,
    loading,
    error,
    connectionStatus,
    lastResponse,
    
    // Methods
    testConnection,
    executeQuery,
    fetchSites,
    fetchEquipment,
    fetchPoints,
    clearError
  };
}

// Hook for simplified query execution
export function useSkysparksQuery(initialQuery?: string) {
  const [query, setQuery] = useState(initialQuery || '');
  const [result, setResult] = useState<string | null>(null);
  const { executeQuery, loading, error } = useSkyspark();

  const runQuery = useCallback(async (queryExpr?: string) => {
    const expr = queryExpr || query;
    if (!expr.trim()) return;
    
    const data = await executeQuery(expr);
    setResult(data);
  }, [query, executeQuery]);

  return {
    query,
    setQuery,
    result,
    loading,
    error,
    runQuery
  };
}

// Hook for connection monitoring
export function useSkysparksConnection() {
  const { connectionStatus, testConnection, error } = useSkyspark();
  
  // Auto-retry connection on failure
  useEffect(() => {
    if (connectionStatus === 'error' || connectionStatus === 'disconnected') {
      const retryTimer = setTimeout(() => {
        testConnection();
      }, 30000); // Retry every 30 seconds

      return () => clearTimeout(retryTimer);
    }
  }, [connectionStatus, testConnection]);

  return {
    status: connectionStatus,
    isConnected: connectionStatus === 'connected',
    isConnecting: connectionStatus === 'connecting',
    hasError: connectionStatus === 'error',
    error,
    retry: testConnection
  };
}
