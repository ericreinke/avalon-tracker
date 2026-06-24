/** new-game.js — Handle the new game form logic. */

let allPlayers = [];

document.addEventListener('DOMContentLoaded', async () => {
  if (!isAuthed()) {
    alert('You need to authenticate first.');
    window.location.href = '/';
    return;
  }

  try {
    allPlayers = await apiGet('/api/players');
  } catch (err) {
    console.error('Failed to load players:', err);
  }

  // Start with 5 empty rows
  for (let i = 0; i < 5; i++) addPlayerRow();
});

/* ── Mission Toggles ──────────────────────────────────── */

const STATES = ['none', 'success', 'fail'];
const STATE_LABELS = { none: 'N/A', success: 'Pass', fail: 'Fail' };

function cycleMission(btn) {
  const current = btn.dataset.state;
  const next = STATES[(STATES.indexOf(current) + 1) % STATES.length];
  btn.dataset.state = next;
  btn.querySelector('span').textContent = STATE_LABELS[next];
  checkAssassinVisibility();
}

function getMissions() {
  const toggles = document.querySelectorAll('.mission-toggle');
  return Array.from(toggles).map(t => {
    const s = t.dataset.state;
    return s === 'none' ? null : s;
  });
}

function checkAssassinVisibility() {
  const missions = getMissions();
  const successes = missions.filter(m => m === 'success').length;
  const section = document.getElementById('assassin-section');
  if (successes >= 3) {
    section.classList.remove('hidden');
    populateAssassinDropdown();
  } else {
    section.classList.add('hidden');
  }
}

/* ── Player Rows ──────────────────────────────────────── */

function addPlayerRow() {
  const container = document.getElementById('player-rows');
  const row = document.createElement('div');
  row.className = 'player-row';

  const playerSelect = document.createElement('select');
  playerSelect.className = 'form-control';
  playerSelect.innerHTML = `<option value="">— Player —</option>` +
    allPlayers.map(p => `<option value="${p.id}">${p.name}${p.is_main ? ' ★' : ''}</option>`).join('');
  playerSelect.addEventListener('change', populateAssassinDropdown);

  const roleSelect = document.createElement('select');
  roleSelect.className = 'form-control';
  roleSelect.innerHTML = `<option value="">— Role —</option>
    <optgroup label="Good">
      ${GOOD_ROLES.map(r => `<option value="${r}">${r}</option>`).join('')}
    </optgroup>
    <optgroup label="Evil">
      ${EVIL_ROLES.map(r => `<option value="${r}">${r}</option>`).join('')}
    </optgroup>`;
  roleSelect.addEventListener('change', populateAssassinDropdown);

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'remove-row';
  removeBtn.textContent = '×';
  removeBtn.onclick = () => { row.remove(); populateAssassinDropdown(); };

  row.appendChild(playerSelect);
  row.appendChild(roleSelect);
  row.appendChild(removeBtn);
  container.appendChild(row);
}

/* ── Assassin Dropdown ────────────────────────────────── */

function populateAssassinDropdown() {
  const rows = document.querySelectorAll('.player-row');
  const select = document.getElementById('assassinated');
  const currentVal = select.value;

  // Collect players that are in the game (good team only — assassination target is on good team)
  const options = [];
  rows.forEach(row => {
    const selects = row.querySelectorAll('select');
    const playerId = selects[0].value;
    const role = selects[1].value;
    if (playerId && role && GOOD_ROLES.includes(role)) {
      const player = allPlayers.find(p => p.id === parseInt(playerId));
      if (player) options.push({ id: player.id, name: player.name, role });
    }
  });

  select.innerHTML = `<option value="">— Select —</option>` +
    options.map(o => `<option value="${o.id}">${o.name} (${o.role})</option>`).join('');

  // Restore selection if still valid
  if (currentVal && options.some(o => o.id === parseInt(currentVal))) {
    select.value = currentVal;
  }
}

/* ── Submit ────────────────────────────────────────────── */

async function submitGame() {
  const submitBtn = document.getElementById('submit-btn');
  const errorSpan = document.getElementById('submit-error');
  errorSpan.textContent = '';

  const missions = getMissions();
  const successes = missions.filter(m => m === 'success').length;
  const fails = missions.filter(m => m === 'fail').length;

  if (successes + fails < 3) {
    errorSpan.textContent = 'At least 3 missions must be resolved.';
    return;
  }

  // Collect players
  const rows = document.querySelectorAll('.player-row');
  const players = [];
  for (const row of rows) {
    const selects = row.querySelectorAll('select');
    const playerId = selects[0].value;
    const role = selects[1].value;
    if (!playerId || !role) continue;
    players.push({ player_id: parseInt(playerId), role });
  }

  if (players.length < 5) {
    errorSpan.textContent = 'Need at least 5 players.';
    return;
  }

  // Assassination
  let assassinated_player_id = null;
  if (successes >= 3) {
    assassinated_player_id = parseInt(document.getElementById('assassinated').value) || null;
    if (!assassinated_player_id) {
      errorSpan.textContent = 'Select who was assassinated.';
      return;
    }
  }

  // Mark the assassinated player in the players list
  for (const p of players) {
    p.is_assassinated = (p.player_id === assassinated_player_id);
  }

  const body = {
    num_players: players.length,
    missions,
    players,
    notes: document.getElementById('notes').value.trim() || null,
  };

  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving…';

  try {
    const game = await apiPost('/api/games', body);
    window.location.href = `/game.html?id=${game.id}`;
  } catch (err) {
    errorSpan.textContent = err.message;
    submitBtn.disabled = false;
    submitBtn.textContent = 'Save Game';
  }
}
