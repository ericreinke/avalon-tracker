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

    grid.innerHTML = games.map(game => renderCard(game, mainPlayerId)).join('');
  } catch (err) {
    console.error(err);
    document.getElementById('game-grid').innerHTML =
      '<div class="empty-state"><div class="empty-state__text">Failed to load games.</div></div>';
  }
});

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
