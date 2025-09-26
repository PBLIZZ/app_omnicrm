/**
 * API Utilities - Central Export
 *
 * Re-exports the main API client utilities that are commonly used throughout the app.
 * This maintains compatibility with existing imports while organizing code.
 */

export {
  apiClient,
  apiRequest,
  get,
  post,
  put,
  patch,
  del,
  del as delete,
  buildUrl,
  safeRequest,
  type ApiRequestOptions,
  // Backward compatibility aliases
  get as get,
  post as post,
  put as put,
  patch as fetchPatch,
  del as delete,
} from "./api/client";
