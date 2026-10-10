let data, pool, answer, guesses, maxGuesses, over;

const $ = (id) => document.getElementById(id);

function formatHp(entry) {
  if (entry.hpLabel) return entry.hpLabel;
  const n = entry.hp;
  if (n == null) return 'Unknown';
  const units = [[1e15, 'Q'], [1e12, 'T'], [1e9, 'B'], [1e6, 'M']];
  for (const [v, s] of units) {
    if (n >= v) return +(n / v).toFixed(3) + s;
  }
  return n.toLocaleString();
}

// Same answer for everyone on the same day; each mode gets a different one.
function dailyIndex(mode, size) {
  const day = Math.floor(Date.now() / 86400000);
  let h = day;
  for (const c of mode) h = (h * 31 + c.charCodeAt(0)) % 1000003;
  return h % size;
}

function textCell(g, a) {
  const show = g == null ? 'Unknown' : g;
  return [show, g != null && g === a ? 'green' : 'red'];
}

// "All", "All except KMS", "GMS only", "JMS/CMS/GMS" -> set of servers.
// Labels that aren't server lists (Seasonal, Event, Removed) return null.
const SERVERS = ['KMS', 'GMS', 'JMS', 'CMS', 'TMS', 'MSEA'];
function servers(label) {
  if (label == null) return null;
  if (label === 'All') return SERVERS;
  let m = label.match(/^All except (.+)$/);
  if (m) return SERVERS.filter((s) => s !== m[1]);
  m = label.match(/^(\w+) only$/);
  if (m) return [m[1]];
  const parts = label.split('/');
  return parts.every((p) => SERVERS.includes(p)) ? parts : null;
}

function regionCell(g, a) {
  const show = g == null ? 'Unknown' : g;
  if (g != null && g === a) return [show, 'green'];
  const gs = servers(g), as = servers(a);
  if (gs && as && gs.some((s) => as.includes(s))) return [show, 'yellow'];
  return [show, 'red'];
}

// Yellow when close, red when far. close(g, a) decides what "close" means per column.
function numberCell(g, a, show, close) {
  if (g == null || a == null) return [show, 'red'];
  if (g === a) return [show, 'green'];
  return [show + (g < a ? ' ↑' : ' ↓'), close(g, a) ? 'yellow' : 'red'];
}
const closePhases = (g, a) => Math.abs(g - a) <= 1;
const closeHp = (g, a) => Math.max(g, a) / Math.min(g, a) <= 3;
const closeLevel = (g, a) => Math.abs(g - a) <= 10;

function start() {
  const mode = $('mode').value;
  pool = data.pools[mode === 'story' ? 'normal' : mode];
  answer = pool[dailyIndex(mode, pool.length)];
  maxGuesses = data.attempts[mode];
  guesses = [];
  over = false;
  $('rows').innerHTML = '';
  $('bosses').innerHTML = pool.map((e) => `<option value="${e.name}">`).join('');
  $('guess').value = '';
  updateStatus();
}

function updateStatus(msg) {
  const left = maxGuesses == null ? 'unlimited' : maxGuesses - guesses.length;
  $('status').textContent = msg || `Guesses left: ${left}`;
}

function guess() {
  if (over) return;
  const name = $('guess').value.trim();
  const g = pool.find((e) => e.name.toLowerCase() === name.toLowerCase());
  if (!g) return updateStatus('Pick a boss from the list.');
  if (guesses.includes(g.name)) return updateStatus('Already guessed.');
  guesses.push(g.name);
  $('guess').value = '';

  const cells = [
    [g.name, g.name === answer.name ? 'green' : 'red'],
    textCell(g.world, answer.world),
    textCell(g.gender, answer.gender),
    regionCell(g.region, answer.region),
    numberCell(g.phases, answer.phases, g.phases ?? 'Unknown', closePhases),
    numberCell(g.hp, answer.hp, formatHp(g), closeHp),
    numberCell(g.level, answer.level, g.level ?? 'Unknown', closeLevel),
  ];
  const tr = document.createElement('tr');
  for (const [text, cls] of cells) {
    const td = document.createElement('td');
    td.textContent = text;
    td.className = cls;
    tr.appendChild(td);
  }
  $('rows').prepend(tr);

  if (g.name === answer.name) {
    over = true;
    updateStatus(`Correct! It was ${answer.name}.`);
  } else if (maxGuesses != null && guesses.length >= maxGuesses) {
    over = true;
    updateStatus(`Out of guesses. It was ${answer.name}.`);
  } else {
    updateStatus();
  }
}

$('mode').addEventListener('change', start);
$('go').addEventListener('click', guess);
$('guess').addEventListener('keydown', (e) => { if (e.key === 'Enter') guess(); });

fetch('data/bosses.json')
  .then((r) => r.json())
  .then((d) => { data = d; start(); })
  .catch(() => { $('status').textContent = 'Could not load data/bosses.json'; });
