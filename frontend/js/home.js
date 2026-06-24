/** home.js — Render game history cards on the home page. */

let mainPlayerId = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Check if already authed
  if (isAuthed()) showAddButton();

  try {
    // Fetch main player
    const mainPlayer = await apiGet('/api/players/main');
    mainPlayerId = mainPlayer.id;

    // Fetch all games
    const games = await apiGet('/api/games');

    const subtitle = document.getElementById('subtitle');
    subtitle.textContent = `${games.length} game${games.length !== 1 ? 's' : ''} recorded`;

    const grid = document.getElementById('game-grid');
    if (games.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__text">No games yet. Add your first game!</div>
        </div>`;
      return;
    }

    grid.innerHTML = games.map(game => renderCard(game)).join('');
  } catch (err) {
    console.error(err);
    document.getElementById('game-grid').innerHTML =
      '<div class="empty-state"><div class="empty-state__text">Failed to load games.</div></div>';
  }
});

function renderCard(game) {
  // Find main player's entry
  const myEntry = game.players.find(p => p.player_id === mainPlayerId);
  const myRole = myEntry ? myEntry.role : '—';

  // Determine if main player won
  const isGood = myEntry && GOOD_ROLES.includes(myEntry.role);
  const myTeam = isGood ? 'good' : 'evil';
  const iWon = myTeam === game.winning_team;

  // Mission pips
  const pips = game.missions.map((m, i) => {
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
        <div class="game-card__role">${myRole}</div>
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

/* ── Auth ──────────────────────────────────────────────── */

function openAuthModal() {
  document.getElementById('auth-modal').classList.add('active');
  document.getElementById('passcode-input').focus();
}

function closeAuthModal() {
  document.getElementById('auth-modal').classList.remove('active');
}

async function submitPasscode() {
  const code = document.getElementById('passcode-input').value.trim();
  if (!code) return;
  // Test it with a lightweight request
  setPasscode(code);
  try {
    // Try to list players with passcode to validate
    await fetch('/api/players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Passcode': code },
      body: JSON.stringify({ name: '__auth_test_' + Date.now() }),
    }).then(async res => {
      // If 400 "already exists" or 200, the passcode is valid.
      // If 401, it's wrong.
      if (res.status === 401) {
        setPasscode('');
        throw new Error('Wrong passcode');
      }
      // Clean up: if we accidentally created a player, delete it
      if (res.ok) {
        const player = await res.json();
        await fetch(`/api/players/${player.id}`, {
          method: 'DELETE',
          headers: { 'X-Passcode': code },
        });
      }
    });
    showAddButton();
    closeAuthModal();
  } catch (err) {
    alert('Invalid passcode');
    sessionStorage.removeItem('avalon_passcode');
  }
}

function showAddButton() {
  document.getElementById('add-game-btn').classList.remove('hidden');
  document.getElementById('auth-btn').textContent = 'Unlocked';
}

// Close modal on overlay click
document.getElementById('auth-modal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeAuthModal();
});

// Enter key in passcode input
document.getElementById('passcode-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') submitPasscode();
});
