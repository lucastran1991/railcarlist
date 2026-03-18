// Backend API configuration
// Can be overridden by environment variable NEXT_PUBLIC_API_URL
// When unset in the browser: use same host as the page with BACKEND_PORT (fixes Private Network Access when frontend is served from a remote host)

// Must match backend server.port (see config.json); override with NEXT_PUBLIC_API_PORT if needed
const BACKEND_PORT = process.env.NEXT_PUBLIC_API_PORT || '8888';

function getDefaultApiBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location) {
    return `${window.location.protocol}//${window.location.hostname}:${BACKEND_PORT}`;
  }
  return `http://localhost:${BACKEND_PORT}`;
}

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || getDefaultApiBaseUrl();

export const API_ENDPOINTS = {
  health: '/health',
  config: '/api/config',
  load: '/api/load',
  generateDummy: '/api/generate-dummy',
  timeseriesData: '/api/timeseriesdata',
  uploadCsv: '/api/upload-csv',
  tags: '/api/tags',
  railcars: '/api/railcars',
  railcarsImport: '/api/railcars/import',
} as const;
