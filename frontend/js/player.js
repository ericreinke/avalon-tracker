/** player.js — Render player profile with stats and edit capability. */

let currentPlayer = null;

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const playerId = params.get('id');
  if (!playerId) {
    document.getElementById('content').innerHTML = '<div class="empty-state"><div class="empty-state__text">No player ID provided.</div></div>';
    return;
  }

  try {
    const player = await apiGet(`/api/players/${playerId}`);
    currentPlayer = player;
    renderPlayer(player);
  } catch (err) {
    console.error(err);
    document.getElementById('content').innerHTML = '<div class="empty-state"><div class="empty-state__text">Player not found.</div></div>';
  }
});

function formatRate(val) {
  if (val === null || val === undefined) return '—';
  return Math.round(val * 100) + '%';
}

function renderPlayer(player) {
  const content = document.getElementById('content');
  const s = player.stats;

  const statsHtml = `
    <div class="player-text-stats">
      <div>
        <span>Games Played: ${s.games_played}</span>
        <span>Win Rate: ${formatRate(s.win_rate)}</span>
      </div>
      <div>
        <span>Win Rate (Good): ${formatRate(s.win_rate_good)}</span>
        <span>Win Rate (Merlin): ${formatRate(s.win_rate_merlin)}</span>
        <span>Win Rate (Percival): ${formatRate(s.win_rate_percival)}</span>
      </div>
      <div>
        <span>Win Rate (Evil): ${formatRate(s.win_rate_evil)}</span>
        <span>Win Rate (Morgana): ${formatRate(s.win_rate_morgana)}</span>
      </div>
    </div>
  `;

  const authed = isAuthed();
  const editBtn = authed
    ? `<button class="btn btn-ghost btn-sm" onclick="openEditModal()" style="margin-left:12px;">Edit</button>`
    : '';

  let gamesHtml = '';
  if (player.games && player.games.length > 0) {
    gamesHtml = `
      <h2 style="margin-top:16px; margin-bottom:16px; font-size:1.25rem;">Game History</h2>
      <div class="game-grid">
        ${player.games.map(game => renderCard(game, player.id)).join('')}
      </div>
    `;
  } else {
    gamesHtml = `
      <h2 style="margin-top:16px; margin-bottom:16px; font-size:1.25rem;">Game History</h2>
      <div class="empty-state"><div class="empty-state__text">No games yet.</div></div>
    `;
  }

  content.innerHTML = `
    <div class="page-header" style="margin-bottom:0;">
      <div style="display:flex; align-items:center;">
        <h1>${player.name} ${player.is_main ? '★' : ''}</h1>
        ${editBtn}
      </div>
    </div>
    ${statsHtml}
    ${gamesHtml}
  `;
}

/* ── Edit Modal ──────────────────────────────────────────── */

function openEditModal() {
  if (!currentPlayer) return;
  document.getElementById('edit-first-name').value = currentPlayer.first_name;
  document.getElementById('edit-last-name').value = currentPlayer.last_name;
  document.getElementById('edit-error').textContent = '';
  document.getElementById('edit-modal').classList.add('active');
  document.getElementById('edit-first-name').focus();
}

function closeEditModal() {
  document.getElementById('edit-modal').classList.remove('active');
}

async function savePlayerEdit() {
  const first_name = document.getElementById('edit-first-name').value.trim();
  const last_name = document.getElementById('edit-last-name').value.trim();
  const errorSpan = document.getElementById('edit-error');
  errorSpan.textContent = '';

  if (!first_name) { errorSpan.textContent = 'First name is required.'; return; }

  try {
    const updated = await apiPut(`/api/players/${currentPlayer.id}`, { first_name, last_name });
    currentPlayer = { ...currentPlayer, ...updated };
    renderPlayer(currentPlayer);
    closeEditModal();
  } catch (err) {
    errorSpan.textContent = err.message;
  }
}

// Close modal on overlay click
document.getElementById('edit-modal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeEditModal();
});

// Enter key support for edit modal
document.getElementById('edit-first-name').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') savePlayerEdit();
});
document.getElementById('edit-last-name').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') savePlayerEdit();
});
