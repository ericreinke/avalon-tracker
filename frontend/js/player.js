/** player.js — Render player profile with stats. */

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const playerId = params.get('id');
  if (!playerId) {
    document.getElementById('content').innerHTML = '<div class="empty-state"><div class="empty-state__text">No player ID provided.</div></div>';
    return;
  }

  try {
    const player = await apiGet(`/api/players/${playerId}`);
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

  content.innerHTML = `
    <div class="page-header">
      <h1>${player.name} ${player.is_main ? '★' : ''}</h1>
      <p>Joined ${joinDate}</p>
    </div>

    <div class="stats-grid mb-24">${statsHtml}</div>
  `;
}
