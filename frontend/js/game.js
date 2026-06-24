/** game.js — Render a single game's full detail page. */

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(window.location.search);
  const gameId = params.get('id');
  if (!gameId) {
    document.getElementById('content').innerHTML = '<div class="empty-state"><div class="empty-state__text">No game ID provided.</div></div>';
    return;
  }

  try {
    const game = await apiGet(`/api/games/${gameId}`);
    renderGame(game);
  } catch (err) {
    console.error(err);
    document.getElementById('content').innerHTML = '<div class="empty-state"><div class="empty-state__text">Game not found.</div></div>';
  }
});

function renderGame(game) {
  const content = document.getElementById('content');

  const date = new Date(game.created_at).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  // Winning banner
  const bannerClass = game.winning_team === 'good' ? 'win-banner--good' : 'win-banner--evil';
  const bannerText = game.winning_team === 'good'
    ? 'Good Team Wins!'
    : 'Evil Team Wins!';

  // Missions
  const missionsHtml = game.missions.map((m, i) => {
    let cls = 'mission-pip--none';
    let icon = '—';
    let label = 'N/A';
    if (m === 'success') { cls = 'mission-pip--success'; icon = '✓'; label = 'Pass'; }
    if (m === 'fail') { cls = 'mission-pip--fail'; icon = '✗'; label = 'Fail'; }
    return `<div class="detail-mission ${cls}">M${i+1}<span>${label}</span></div>`;
  }).join('');

  // Roster
  const rosterRows = game.players.map(p => {
    const teamClass = GOOD_ROLES.includes(p.role) ? 'team-badge--good' : 'team-badge--evil';
    const teamLabel = GOOD_ROLES.includes(p.role) ? 'Good' : 'Evil';
    const extra = [];
    if (game.assassinated_id && p.player_id === game.assassinated_id) {
      extra.push(' <span style="font-size:0.75rem; color:var(--text-muted);">(Assassinated)</span>');
    }
    // Check if this player is Merlin
    if (p.role === 'Merlin') {
      extra.push(' <span style="font-size:0.75rem; color:var(--text-muted);">(Merlin)</span>');
    }
    return `<tr>
      <td><a href="/player.html?id=${p.player_id}">${p.player_name}</a>${extra.join('')}</td>
      <td>${p.role}</td>
      <td><span class="team-badge ${teamClass}">${teamLabel}</span></td>
    </tr>`;
  }).join('');

  // Assassination section
  let assassinHtml = '';
  if (game.assassinated_id) {
    const merlinEntry = game.players.find(p => p.role === 'Merlin');
    const merlinName = merlinEntry ? merlinEntry.player_name : 'Unknown';
    const wasCorrect = merlinEntry && merlinEntry.player_id === game.assassinated_id;
    assassinHtml = `
      <div class="detail-section">
        <h2>Assassination</h2>
        <p>The Assassin targeted <strong class="text-evil">${game.assassinated_name}</strong>.</p>
        <p>Merlin was <strong class="text-good">${merlinName}</strong>.</p>
        <p style="margin-top:8px;">${wasCorrect
          ? '<span class="text-evil">✗ Merlin was found — Evil wins!</span>'
          : '<span class="text-good">✓ Merlin stayed hidden — Good wins!</span>'
        }</p>
      </div>`;
  }

  // Notes
  let notesHtml = '';
  if (game.notes) {
    notesHtml = `
      <div class="detail-section">
        <h2>Notes</h2>
        <p>${game.notes}</p>
      </div>`;
  }

  const authed = isAuthed();
  const actionsHtml = authed ? `
    <button class="btn btn-ghost btn-sm" onclick="window.location.href='/new-game.html?edit=${game.id}'" style="margin-left:12px;">Edit</button>
    <button class="btn btn-ghost btn-sm text-evil" onclick="deleteGame(${game.id})" style="margin-left:8px; border-color:var(--evil-soft);">Delete</button>
  ` : '';

  content.innerHTML = `
    <div class="page-header">
      <div style="display:flex; align-items:center;">
        <h1>Game #${game.id}</h1>
        ${actionsHtml}
      </div>
      <p>${date} · ${game.num_players} players</p>
    </div>

    <div class="win-banner ${bannerClass}">${bannerText}</div>

    <div class="detail-section">
      <h2>Missions</h2>
      <div class="detail-missions">${missionsHtml}</div>
    </div>

    <div class="detail-section">
      <h2>Players</h2>
      <table class="roster-table">
        <thead><tr><th>Player</th><th>Role</th><th>Team</th></tr></thead>
        <tbody>${rosterRows}</tbody>
      </table>
    </div>

    ${assassinHtml}
    ${notesHtml}
  `;
}

async function deleteGame(gameId) {
  if (!confirm('Are you sure you want to delete this game?')) return;
  try {
    await apiDelete(`/api/games/${gameId}`);
    window.location.href = '/';
  } catch (err) {
    alert(err.message);
  }
}
