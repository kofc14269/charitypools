import { Pool, Participant, Square, ThirteenRunData, SurvivorData } from '../types';

export function exportPoolCsv(activePool: Pool, participants: Participant[], squares: Square[]) {
  if (!activePool) return;

  const csvRows: string[][] = [];
  // Headers
  csvRows.push([
    'Name',
    'Alias',
    'Email',
    'Phone',
    'Total Entries',
    'Entry Details',
    'Total Paid ($)',
    'Total Won ($)',
    'Payment Methods'
  ]);

  participants.forEach(p => {
    let entriesCount = 0;
    let entryDetails = '';
    
    // Calculate entries depending on pool type
    if (activePool.type === 'squares') {
      const pSquares = squares.filter(sq => sq.participantId === p.id);
      entriesCount = pSquares.length;
      entryDetails = pSquares.map(sq => `R${sq.row}C${sq.col}`).join(', ');
    } else if (activePool.type === '13run') {
      const data = activePool.gameData as ThirteenRunData;
      if (data && data.entries) {
        const teams = Object.values(data.entries).filter(e => e.participantId === p.id);
        entriesCount = teams.length;
        entryDetails = teams.map(t => t.teamName).join(', ');
      }
    } else if (activePool.type === 'survivor') {
      const data = activePool.gameData as SurvivorData;
      if (data && data.participants && data.participants[p.id]) {
        entriesCount = 1;
        entryDetails = data.participants[p.id].isEliminated ? 'Eliminated' : 'Active';
      }
    }

    // Calculate financials
    const totalPaid = (p.paymentHistory || []).reduce((sum, t) => sum + t.amount, 0);
    const totalWon = (p.winningsPayoutHistory || []).reduce((sum, t) => sum + t.amount, 0);
    
    const paymentMethods = Array.from(new Set([
      ...(p.paymentHistory || []).map(t => t.method),
      ...(p.winningsPayoutHistory || []).map(t => t.method)
    ])).filter(Boolean).join(', ');

    // Only include participants that have either entries or financial activity
    if (entriesCount > 0 || totalPaid > 0 || totalWon > 0) {
      csvRows.push([
        p.name || '',
        p.alias || '',
        p.email || '',
        p.phone || '',
        String(entriesCount),
        entryDetails,
        totalPaid.toFixed(2),
        totalWon.toFixed(2),
        paymentMethods
      ]);
    }
  });

  // Escape CSV function
  const escapeCsv = (str: string) => {
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvContent = csvRows.map(row => row.map(escapeCsv).join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const safeName = (activePool.name || 'pool').replace(/[^a-z0-9]/gi, '_').toLowerCase();
  link.setAttribute('download', `${safeName}_export.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
