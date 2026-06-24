/**
 * api.js — Shared fetch helpers and auth state for the Avalon Tracker.
 */

const API = '';

/** Get the stored passcode from sessionStorage, or null. */
function getPasscode() {
  return sessionStorage.getItem('avalon_passcode');
}

/** Store passcode in sessionStorage. */
function setPasscode(code) {
  sessionStorage.setItem('avalon_passcode', code);
}

/** Check if the user has authenticated this session. */
function isAuthed() {
  return !!getPasscode();
}

/** Build headers object, optionally including the passcode. */
function authHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  const code = getPasscode();
  if (code) headers['X-Passcode'] = code;
  return headers;
}

/** GET helper. */
async function apiGet(path) {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json();
}

/** POST helper (requires auth). */
async function apiPost(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `POST ${path} failed: ${res.status}`);
  }
  return res.json();
}

/** PUT helper (requires auth). */
async function apiPut(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `PUT ${path} failed: ${res.status}`);
  }
  return res.json();
}

/** DELETE helper (requires auth). */
async function apiDelete(path) {
  const res = await fetch(`${API}${path}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `DELETE ${path} failed: ${res.status}`);
  }
  return res.json();
}

/** Avalon roles grouped by team. */
const GOOD_ROLES = ['Merlin', 'Percival', 'Loyal Servant', 'Lover'];
const EVIL_ROLES = ['Morgana', 'Assassin', 'Minion of Mordred', 'Oberon', 'Mordred'];
const ALL_ROLES = [...GOOD_ROLES, ...EVIL_ROLES];
