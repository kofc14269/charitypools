const escapeHtml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

export const printLeaderboard = (winnerLeaderboard: { alias: string; totalWon: number }[]) => {
  const leaderboardRows = winnerLeaderboard.length === 0
    ? '<tr><td colspan="2" style="padding:16px 0;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;">No winners logged yet.</td></tr>'
    : winnerLeaderboard
      .map((winner, index) => `
          <tr>
            <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;font-weight:700;">#${index + 1} ${escapeHtml(winner.alias)}</td>
            <td style="padding:12px 0;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:800;">$${winner.totalWon.toFixed(2)}</td>
          </tr>
        `)
      .join('');

  const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=960,height=720');
  if (!printWindow) return false;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title></title>
        <style>
          @page { margin: 0.5in; }
          :root { color-scheme: light; font-family: Arial, sans-serif; }
          * { box-sizing: border-box; }
          body { margin: 0; padding: 32px; color: #111827; background: #ffffff; }
          h1 { margin: 0 0 8px; font-size: 28px; font-weight: 900; letter-spacing: 0.18em; }
          table { width: 100%; border-collapse: collapse; }
          thead th { padding: 0 0 12px; border-bottom: 2px solid #d1d5db; text-align: left; font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.12em; }
          thead th:last-child { text-align: right; }
          @media print { body { padding: 24px; } }
        </style>
      </head>
      <body>
        <h1>WINNERS SUMMARY</h1>
        <table>
          <thead><tr><th>Alias</th><th>Total Won</th></tr></thead>
          <tbody>${leaderboardRows}</tbody>
        </table>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  return true;
};

export const exportGridCSV = (squares: any[], getLabel: (type: 'row' | 'col', i: number) => any, participantMap: any, costPerBox: number) => {
  const headers = ["Square #", "Row Num", "Col Num", "Player Alias", "Real Name", "Email", "Phone", "Status"];
  const csvRows = (squares || []).map(sq => {
    const p = sq.participantId ? participantMap[sq.participantId] : null;
    return [
      sq.id + 1,
      getLabel('row', sq.row),
      getLabel('col', sq.col),
      sq.assigned ? sq.alias : "Unassigned",
      p ? p.name : "",
      p ? p.email : "",
      p ? p.phone : "",
      sq.paidAmount >= costPerBox ? "Paid" : (sq.assigned ? "Pending" : "Available")
    ];
  });

  csvRows.sort((a, b) => {
    const phoneA = String(a[6] || "").replace(/\D/g, '');
    const phoneB = String(b[6] || "").replace(/\D/g, '');
    if (!phoneA && phoneB) return 1;
    if (phoneA && !phoneB) return -1;
    return phoneA.localeCompare(phoneB);
  });

  const content = [headers, ...csvRows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `grid_mapping_${new Date().toISOString().split('T')[0]}.csv`);
  link.click();
};
