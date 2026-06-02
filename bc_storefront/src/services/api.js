// src/services/api.js

const DEFAULT_BACKEND_URL = 'http://100.110.252.19:5000';
const VITE_BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

// Resolve clean base URL without trailing slash
export const BASE_URL = (VITE_BACKEND_URL || DEFAULT_BACKEND_URL).replace(/\/$/, '');

/**
 * Custom fetch wrapper that ensures credentials (cookies) are included
 * and normalizes error handling.
 */
async function apiFetch(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
  const isFormData = options.body instanceof FormData;
  
  const headers = {
    'Accept': 'application/json',
    ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
    // Essential for express-session cookie persistence across port 5173/5000
    credentials: 'include',
  };

  try {
    const response = await fetch(url, config);
    
    // Attempt to parse JSON response
    let data = null;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = { message: await response.text() };
    }

    if (!response.ok) {
      // 401 Unauthorized handling - redirect to login in a web environment if appropriate
      if (response.status === 401 && !endpoint.includes('/auth/current-user')) {
        // Option to redirect to login
        window.location.href = '/login';
      }
      
      const error = new Error(data.message || data.error || 'Something went wrong');
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    console.error(`API Fetch Error [${url}]:`, err);
    throw err;
  }
}

export const api = {
  get: (endpoint, headers = {}) => apiFetch(endpoint, { method: 'GET', headers }),
  post: (endpoint, body, headers = {}) => apiFetch(endpoint, { 
    method: 'POST', 
    headers, 
    body: body ? JSON.stringify(body) : undefined 
  }),
  upload: (endpoint, formData, headers = {}) => apiFetch(endpoint, {
    method: 'POST',
    headers,
    body: formData
  }),
  put: (endpoint, body, headers = {}) => apiFetch(endpoint, { 
    method: 'PUT', 
    headers, 
    body: body ? JSON.stringify(body) : undefined 
  }),
  delete: (endpoint, headers = {}) => apiFetch(endpoint, { method: 'DELETE', headers }),
};
