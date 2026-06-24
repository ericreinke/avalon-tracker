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
    </a>`;
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
