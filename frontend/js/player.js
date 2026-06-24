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

  const statCards = [
    { value: s.games_played, label: 'Games Played', color: '' },
    { value: formatRate(s.win_rate), label: 'Overall Win Rate', color: '' },
    { value: formatRate(s.win_rate_good), label: 'Win Rate (Good)', color: 'text-good' },
    { value: formatRate(s.win_rate_evil), label: 'Win Rate (Evil)', color: 'text-evil' },
    { value: formatRate(s.win_rate_merlin), label: 'Win Rate (Merlin)', color: 'text-good' },
    { value: formatRate(s.win_rate_percival), label: 'Win Rate (Percival)', color: 'text-good' },
    { value: formatRate(s.win_rate_morgana), label: 'Win Rate (Morgana)', color: 'text-evil' },
  ];

  const statsHtml = statCards.map(c =>
    `<div class="stat-card">
      <div class="stat-card__value ${c.color}">${c.value}</div>
      <div class="stat-card__label">${c.label}</div>
    </div>`
  ).join('');

  const joinDate = new Date(player.created_at).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });

  const authed = isAuthed();
  console.log('[player.js] isAuthed:', authed, '| passcode:', getPasscode());
  const editBtn = authed
    ? `<button class="btn btn-ghost btn-sm" onclick="openEditModal()" style="margin-left:12px;">✏️ Edit</button>`
    : '';

  content.innerHTML = `
    <div class="page-header">
      <div style="display:flex; align-items:center;">
        <h1>${player.name} ${player.is_main ? '★' : ''}</h1>
        ${editBtn}
      </div>
      <p>Joined ${joinDate}</p>
    </div>

    <div class="stats-grid mb-24">${statsHtml}</div>
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
