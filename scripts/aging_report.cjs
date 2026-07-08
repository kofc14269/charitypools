const fs = require('fs');
const path = require('path');

function loadJSONCandidates() {
  const candidates = [
    'state.json',
    'squares.json',
    'reports/squares.json',
    'exported_state.json',
    'dist/state.json'
  ];
  const found = [];
  for (const c of candidates) {
    const p = path.join(__dirname, '..', c);
    if (fs.existsSync(p)) found.push({ path: p, name: c });
  }
  return found;
}

function normalizePools(raw) {
  if (!raw) return [];
  if (raw.pools && Array.isArray(raw.pools)) return raw.pools;
  if (raw.pools && typeof raw.pools === 'object') return Object.values(raw.pools).map(p => ({
    ...p,
    squares: Array.isArray(p.squares) ? p.squares : (p.squares ? Object.values(p.squares) : []),
    participants: p.participants || [],
    settings: p.settings || { costPerBox: 10, rowNumbers: Array(10).fill(null), colNumbers: Array(10).fill(null) }
  }));
  if (Array.isArray(raw)) return raw;
  return [raw];
}

function sumPayments(history) {
  if (!Array.isArray(history)) return 0;
  return history.reduce((s, t) => s + (t.amount || 0), 0);
}

function writeCSV(filePath, headers, rows) {
  const out = [headers.join(','), ...rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))].join('\n');
  fs.writeFileSync(filePath, out);
}

function generateReport(state) {
  const pools = normalizePools(state);
  const agingRows = [];
  const grids = [];

  pools.forEach(pool => {
    const poolName = pool.name || pool.id || 'Unnamed Pool';
    const costPerBox = (pool.settings && pool.settings.costPerBox) || 10;
    const squares = pool.squares || [];
    const participants = pool.participants || [];

    const squaresByParticipant = {};
    squares.forEach((sq, idx) => {
      const pid = sq && sq.participantId ? sq.participantId : null;
      if (!pid) return;
      squaresByParticipant[pid] = squaresByParticipant[pid] || [];
      squaresByParticipant[pid].push(typeof sq.id === 'number' ? sq.id : (sq.id || idx));
    });

    participants.forEach(p => {
      const pid = p.id;
      const boxList = (squaresByParticipant[pid] || []).slice().sort((a,b)=>a-b).map(n => (typeof n==='number' ? (n+1) : n));
      const boxCount = boxList.length;
      const totalDue = boxCount * costPerBox;
      const totalPaid = sumPayments(p.paymentHistory || []);
      const outstanding = Math.max(0, totalDue - totalPaid);
      agingRows.push([
        poolName,
        p.alias || '',
        p.name || '',
        p.email || '',
        p.phone || '',
        boxCount,
        boxList.join(';'),
        costPerBox,
        totalDue,
        totalPaid,
        outstanding
      ]);
    });

    Object.keys(squaresByParticipant).forEach(pid => {
      const found = participants.find(p=>p.id===pid);
      if (!found) {
        const boxList = squaresByParticipant[pid].slice().sort((a,b)=>a-b).map(n => (typeof n==='number' ? (n+1) : n));
        const boxCount = boxList.length;
        const totalDue = boxCount * costPerBox;
        agingRows.push([
          poolName,
          '',
          '',
          '',
          '',
          boxCount,
          boxList.join(';'),
          costPerBox,
          totalDue,
          0,
          totalDue
        ]);
      }
    });

    grids.push([
      poolName,
      (pool.settings && pool.settings.rowNumbers) ? pool.settings.rowNumbers.join(';') : '',
      (pool.settings && pool.settings.colNumbers) ? pool.settings.colNumbers.join(';') : ''
    ]);
  });

  const reportsDir = path.join(__dirname, '..', 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  const agingPath = path.join(reportsDir, 'aging_report.csv');
  const gridPath = path.join(reportsDir, 'grid_numbers.csv');

  writeCSV(agingPath, ['Pool','Alias','Name','Email','Phone','BoxesPlayed','BoxIDs','CostPerBox','TotalDue','TotalPaid','Outstanding'], agingRows);
  writeCSV(gridPath, ['Pool','RowNumbers','ColNumbers'], grids);

  console.log('Generated reports:');
  console.log(' -', agingPath);
  console.log(' -', gridPath);
}

function main() {
  const candidates = loadJSONCandidates();
  if (candidates.length === 0) {
    console.error('No candidate JSON state files found. Please export your app state as state.json or place squares.json in the repo root.');
    process.exit(1);
  }

  const prefer = ['state.json','exported_state.json','squares.json','reports/squares.json','dist/state.json'];
  candidates.sort((a,b) => prefer.indexOf(a.name) - prefer.indexOf(b.name));
  const chosen = candidates[0];
  console.log('Using file:', chosen.path);
  const raw = JSON.parse(fs.readFileSync(chosen.path, 'utf8'));
  generateReport(raw);
}

main();
