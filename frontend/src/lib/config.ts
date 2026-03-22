// Backend API configuration.
// Single source of truth: root config.json (server.port, frontend.api_base_url).
// start.sh and deploy.sh set NEXT_PUBLIC_API_PORT / NEXT_PUBLIC_API_URL from config when starting the app.
// Override via env: NEXT_PUBLIC_API_URL (full URL) or NEXT_PUBLIC_API_PORT (port only).
// When unset in the browser: use same host as the page with BACKEND_PORT (fixes Private Network Access when frontend is served from a remote host).
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
  // Dashboard domains
  electricity: '/api/electricity',
  steam: '/api/steam',
  boiler: '/api/boiler',
  tank: '/api/tank',
  substation: '/api/substation',
} as const;
