import axios from 'axios';

// Create an Axios instance
const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to attach the CSRF token
api.interceptors.request.use(
  async (config) => {
    // For methods that don't need CSRF, just return
    if (['get', 'head', 'options'].includes(config.method.toLowerCase())) {
      return config;
    }

    // Fetch CSRF token if we don't have it
    try {
      const response = await axios.get('/api/csrf-token');
      const csrfToken = response.data.csrf_token;

      // Attach to header
      if (csrfToken) {
        config.headers['X-CSRFToken'] = csrfToken;
      }
    } catch (error) {
      console.error('Failed to fetch CSRF token', error);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export default api;

// Patterns that indicate a backend/server-internal message we should NOT
// surface to end users (CSRF leaks, stack traces, framework errors, etc.).
const TECHNICAL_PATTERNS = /(csrf|cors\b|cookie|header|cache-control|\bsql\b|traceback|exception|stack\s*trace|database|connection refused|timeout exceeded|null\s*reference|undefined\s+is\s+not|nonetype|deserialization|\bjwt\b|token (?:missing|invalid|expired|required)|internal server|\b50[0-9]\b|forbidden|unauthorized|method not allowed|bad gateway|gateway timeout|werkzeug|flask|sqlalchemy|integrityerror|operationalerror)/i;

const STATUS_MESSAGES = {
  400: 'The request could not be processed. Please check your input and try again.',
  401: 'Your session has expired. Please log in again.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource could not be found.',
  408: 'The request took too long. Please try again.',
  409: 'This action conflicts with the current state. Please refresh and try again.',
  413: 'The file is too large. Please upload a smaller file.',
  415: 'This file type is not supported.',
  422: 'Some of the information provided is invalid. Please review and try again.',
  429: 'Too many attempts. Please wait a moment and try again.',
  500: 'Something went wrong on our end. Please try again in a moment.',
  502: 'The service is temporarily unavailable. Please try again shortly.',
  503: 'The service is temporarily unavailable. Please try again shortly.',
  504: 'The request took too long. Please try again.',
};

/**
 * Translate any error (axios, thrown Error, plain string) into a safe,
 * user-friendly message. Never surfaces server internals like
 * "CSRF token missing" or stack traces.
 */
export const friendlyError = (err, fallback = 'Something went wrong. Please try again.') => {
  if (!err) return fallback;

  // Plain string
  if (typeof err === 'string') {
    return TECHNICAL_PATTERNS.test(err) ? fallback : err;
  }

  // No response from server (network down, CORS, DNS, etc.)
  if (err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
    return 'Unable to reach the server. Please check your internet connection and try again.';
  }
  if (err.code === 'ECONNABORTED') {
    return 'The request took too long. Please try again.';
  }

  const status = err.response?.status;
  const backendMessage = err.response?.data?.message;

  // If the backend supplied a clean, short message, pass it through.
  // Otherwise fall back to the status-based generic message.
  if (typeof backendMessage === 'string' && backendMessage.trim()) {
    const trimmed = backendMessage.trim();
    if (trimmed.length <= 200 && !TECHNICAL_PATTERNS.test(trimmed)) {
      return trimmed;
    }
  }

  if (status && STATUS_MESSAGES[status]) return STATUS_MESSAGES[status];
  if (status && status >= 500) return STATUS_MESSAGES[500];
  if (status && status >= 400) return STATUS_MESSAGES[400];

  // Last resort: the error has a .message but only use it if it is not a
  // technical-looking string.
  if (typeof err.message === 'string' && err.message.trim()) {
    const trimmed = err.message.trim();
    if (trimmed.length <= 200 && !TECHNICAL_PATTERNS.test(trimmed)) {
      return trimmed;
    }
  }

  return fallback;
};
