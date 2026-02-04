const fs = require('fs');
const path = require('path');

function loadJSONCandidates() {
  const candidates = [
    'state.json',
    'squares.json',
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
  // If the file itself looks like an array of pools
  if (Array.isArray(raw)) return raw;
  // fallback: maybe the file is a single pool
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
    squares.forEach(sq => {
      const pid = sq && sq.participantId ? sq.participantId : null;
      if (!pid) return;
      squaresByParticipant[pid] = squaresByParticipant[pid] || [];
      // accept either id or object
      squaresByParticipant[pid].push(typeof sq.id === 'number' ? sq.id : (sq.id || sq.indexOf));
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

    // also include participants discovered via squares but not in participants list
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

  // Sort by Name then Alias (case-insensitive) and insert subtotals by Name
  const sorted = agingRows.slice().sort((a, b) => {
    const nameA = (a[2] || '').toString().toLowerCase();
    const nameB = (b[2] || '').toString().toLowerCase();
    if (nameA === nameB) {
      const aliasA = (a[1] || '').toString().toLowerCase();
      const aliasB = (b[1] || '').toString().toLowerCase();
      return aliasA.localeCompare(aliasB);
    }
    return nameA.localeCompare(nameB);
  });

  const rowsWithSubtotals = [];
  let currentName = null;
  let subtotalDue = 0;
  let subtotalPaid = 0;
  let subtotalOutstanding = 0;
  let subtotalBoxes = 0;

  const pushSubtotal = (name) => {
    if (name === null) return;
    rowsWithSubtotals.push([
      'SUBTOTAL',
      '',
      name,
      '',
      '',
      subtotalBoxes,
      '',
      '',
      subtotalDue,
      subtotalPaid,
      subtotalOutstanding
    ]);
  };

  sorted.forEach(row => {
    const name = row[2] || '';
    const due = Number(row[8] || 0);
    const paid = Number(row[9] || 0);
    const outstanding = Number(row[10] || 0);
    const boxes = Number(row[5] || 0);

    if (currentName === null) {
      currentName = name;
    }

    if (name !== currentName) {
      // push subtotal for previous name
      pushSubtotal(currentName);
      // reset
      currentName = name;
      subtotalDue = 0;
      subtotalPaid = 0;
      subtotalOutstanding = 0;
      subtotalBoxes = 0;
    }

    rowsWithSubtotals.push(row);
    subtotalDue += due;
    subtotalPaid += paid;
    subtotalOutstanding += outstanding;
    subtotalBoxes += boxes;
  });

  // push last group's subtotal
  if (currentName !== null) pushSubtotal(currentName);

  // grand totals
  const grand = rowsWithSubtotals.reduce((acc, r) => {
    // skip subtotal rows when summing grand totals
    if ((r[0] || '').toString() === 'SUBTOTAL') return acc;
    acc.due += Number(r[8] || 0);
    acc.paid += Number(r[9] || 0);
    acc.out += Number(r[10] || 0);
    acc.boxes += Number(r[5] || 0);
    return acc;
  }, { due: 0, paid: 0, out: 0, boxes: 0 });

  rowsWithSubtotals.push(['GRAND TOTAL', '', '', '', '', grand.boxes, '', '', grand.due, grand.paid, grand.out]);

  const agingPath = path.join(__dirname, '..', 'aging_report.csv');
  const gridPath = path.join(__dirname, '..', 'grid_numbers.csv');

  writeCSV(agingPath, ['Pool','Alias','Name','Email','Phone','BoxesPlayed','BoxIDs','CostPerBox','TotalDue','TotalPaid','Outstanding'], rowsWithSubtotals);
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

  // Prefer state.json then exported_state.json then squares.json
  const prefer = ['state.json','exported_state.json','squares.json','dist/state.json'];
  candidates.sort((a,b) => prefer.indexOf(a.name) - prefer.indexOf(b.name));
  const chosen = candidates[0];
  console.log('Using file:', chosen.path);
  const raw = JSON.parse(fs.readFileSync(chosen.path, 'utf8'));
  generateReport(raw);
}

main();
