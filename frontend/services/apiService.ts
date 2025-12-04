import { SystemStats, LogEntry, SystemInfo } from '../types';

// Auto-detect API URL based on environment
const getApiUrl = (): string => {
  // In production (Docker), API is on same host
  if (import.meta.env.PROD) {
    return window.location.origin;
  }
  // In development, use env variable or default
  return import.meta.env.VITE_API_URL || 'http://localhost:3001';
};

const API_URL = getApiUrl();

export const fetchSystemStats = async (): Promise<SystemStats> => {
  const response = await fetch(`${API_URL}/api/stats`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(5000)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `Server Error: ${response.status}`);
  }

  const data = await response.json();
  if (typeof data.cpuLoad !== 'number') throw new Error('Invalid data format');

  return data;
};

export const fetchSystemInfo = async (): Promise<SystemInfo> => {
  const response = await fetch(`${API_URL}/api/info`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(5000)
  });

  if (!response.ok) {
    throw new Error(`Server Error: ${response.status}`);
  }

  return response.json();
};

export const fetchSystemLogs = async (limit = 50, type = 'system'): Promise<{ logs: LogEntry[] }> => {
  const response = await fetch(`${API_URL}/api/logs?limit=${limit}&type=${type}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(5000)
  });

  if (!response.ok) {
    throw new Error(`Server Error: ${response.status}`);
  }

  return response.json();
};

export const fetchProcesses = async (): Promise<any> => {
  const response = await fetch(`${API_URL}/api/processes`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(5000)
  });

  if (!response.ok) {
    throw new Error(`Server Error: ${response.status}`);
  }

  return response.json();
};

export const checkHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_URL}/health`, {
      signal: AbortSignal.timeout(2000)
    });
    return response.ok;
  } catch {
    return false;
  }
};
