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

/** Shared Game Card Renderer */
function renderCard(game, povPlayerId) {
  const myEntry = game.players.find(p => p.player_id === povPlayerId);
  
  // Determine if POV player won
  const isGood = myEntry && GOOD_ROLES.includes(myEntry.role);
  const myTeam = isGood ? 'good' : 'evil';
  const iWon = myTeam === game.winning_team;

  // Mission pips
  const pips = game.missions.map(m => {
    if (m === 'success') return `<div class="mission-pip mission-pip--success">✓</div>`;
    if (m === 'fail') return `<div class="mission-pip mission-pip--fail">✗</div>`;
    return `<div class="mission-pip mission-pip--none">—</div>`;
  }).join('');

  const date = new Date(game.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  const winnerLabel = game.winning_team === 'good' ? 'Good wins' : 'Evil wins';

  const actionsHtml = isAuthed() ? `
    <div class="game-card__actions">
      <button class="game-card__action" onclick="event.preventDefault(); window.location.href='/new-game.html?edit=${game.id}'" title="Edit Game">
        <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 20h9"></path>
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
        </svg>
      </button>
      <button class="game-card__action game-card__action--danger" onclick="deleteGame(event, ${game.id})" title="Delete Game">
        <svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    </div>
  ` : '';

  return `
    <a href="/game.html?id=${game.id}" class="game-card game-card--${iWon ? 'win' : 'loss'}">
      <div class="game-card__result game-card__result--${iWon ? 'win' : 'loss'}">
        ${iWon ? 'WIN' : 'LOSS'}
      </div>
      <div class="game-card__info">
        <div class="game-card__role">${myEntry ? myEntry.role : 'Observer'}</div>
        <div class="game-card__meta">
          <span>${winnerLabel}</span>
          <span>${game.num_players} players</span>
          <span>${date}</span>
        </div>
      </div>
      <div class="game-card__missions">${pips}</div>
      ${actionsHtml}
    </a>`;
}

/** Shared Game Delete Logic */
async function deleteGame(event, gameId) {
  event.preventDefault();
  if (!confirm('Are you sure you want to delete this game?')) return;
  
  try {
    await apiDelete(`/api/games/${gameId}`);
    // Reload feed
    window.location.reload();
  } catch (err) {
    alert(err.message);
  }
}
