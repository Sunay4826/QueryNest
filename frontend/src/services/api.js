import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api',
  timeout: 30000
});

const TOKEN_KEY = 'cipher_auth_token';
const USER_KEY = 'cipher_auth_user';

let authToken = localStorage.getItem(TOKEN_KEY) || '';

if (authToken) {
  api.defaults.headers.common.Authorization = `Bearer ${authToken}`;
}

export function setAuthSession({ token, user }) {
  authToken = token || '';
  if (authToken) {
    localStorage.setItem(TOKEN_KEY, authToken);
    api.defaults.headers.common.Authorization = `Bearer ${authToken}`;
  } else {
    localStorage.removeItem(TOKEN_KEY);
    delete api.defaults.headers.common.Authorization;
  }

  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else if (!token) {
    localStorage.removeItem(USER_KEY);
  }
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function logout() {
  setAuthSession({ token: '', user: null });
}

export async function fetchAssignments() {
  const response = await api.get('/assignments');
  return response.data;
}

export async function fetchAssignmentById(assignmentId) {
  const response = await api.get(`/assignments/${assignmentId}`);
  return response.data;
}

export async function executeQuery(payload) {
  const response = await api.post('/query/execute', payload);
  return response.data;
}

export async function fetchHint(payload) {
  const response = await api.post('/hints', payload);
  return response.data;
}

export async function signup(payload) {
  const response = await api.post('/auth/signup', payload);
  return response.data;
}

export async function login(payload) {
  const response = await api.post('/auth/login', payload);
  return response.data;
}

export async function saveAttempt(payload) {
  const response = await api.post('/attempts', payload);
  return response.data;
}

export async function fetchAttempts(assignmentId) {
  const response = await api.get(`/attempts/${assignmentId}`);
  return response.data;
}

export async function fetchAttemptSummary() {
  const response = await api.get('/attempts/summary');
  return response.data;
}

export function getApiError(error, fallback) {
  if (error?.code === 'ECONNABORTED') {
    return 'Request is taking too long. Please try again in a moment.';
  }
  if (error?.message === 'Network Error') {
    return 'Server is currently unavailable. Please refresh the page and try again.';
  }
  return error?.response?.data?.error || error?.message || fallback;
}
