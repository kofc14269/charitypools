
import React, { useMemo, useState } from 'react';
import { Square, GameSettings, Participant, PaymentTransaction, ScoreEntry, Pool, ThirteenRunData } from '../types';
import { solvePayoutForEntry, calculateFinancialSummary, parseCustomPayoutValue } from '../utils/finance';

const WINNINGS_PAYMENT_METHODS = ['Cash', 'Venmo', 'PayPal', 'Zelle', 'Other'];

interface StatsProps {
  activePool: Pool | null;
  squares: Square[];
  participants: Participant[];
  settings: GameSettings;
  scores: ScoreEntry[];
  poolName?: string;
  onUpdateSquare: (id: number, updates: Partial<Square>) => void;
  onUpdateParticipant: (id: string, updates: Partial<Participant>) => void;
  onUpdateScore: (score: ScoreEntry) => void;
  onUnassignSquare: (id: number) => void;
  onClearUserBoxes: (participantId: string) => void;
  onApplyPayment: (participantId: string, amount: number, method: string, note?: string) => void;
  onEditPayment: (participantId: string, transactionId: string, amount: number, method: string, note?: string) => void;
  onDeletePayment: (participantId: string, transactionId: string) => void;
}

const Stats: React.FC<StatsProps> = ({
  activePool,
  squares,
  participants,
  settings,
  scores,
  poolName,
  onUpdateSquare,
  onUpdateParticipant,
  onUpdateScore,
  onUnassignSquare,
  onClearUserBoxes,
  onApplyPayment,
  onEditPayment,
  onDeletePayment
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentModalParticipant, setPaymentModalParticipant] = useState<any | null>(null);
  const [editModalParticipant, setEditModalParticipant] = useState<Participant | null>(null);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentNote, setPaymentNote] = useState('');
  const [editingWinningsTransactionId, setEditingWinningsTransactionId] = useState<string | null>(null);
  const [winningsPayoutAmount, setWinningsPayoutAmount] = useState('');
  const [winningsPayoutMethod, setWinningsPayoutMethod] = useState('Cash');
  const [winningsPayoutNote, setWinningsPayoutNote] = useState('');

  const [editFormData, setEditFormData] = useState({ name: '', email: '', phone: '', alias: '' });

  const getParticipantAlias = (participant: Participant) => String(participant.alias || '').trim().toUpperCase();

  const costPerBox = settings?.costPerBox || 10;
  const safeParticipants = useMemo(() => participants || [], [participants]);
  const safeSquares = useMemo(() => squares || [], [squares]);

  const { totalPot, projectedPlayerPot } = useMemo(() => {
    return calculateFinancialSummary(activePool, settings, scores, squares);
  }, [activePool, settings, scores, squares]);

  const resolvedWinningEntries = useMemo<Array<{ participantId: string; entry: ScoreEntry; payout: number; paidOut: number; paymentMethod: string }>>(() => {
    if (activePool?.type !== 'squares') return [];

    const rowNumbers = settings?.rowNumbers || [];
    const colNumbers = settings?.colNumbers || [];
    const resolvedEntries: Array<{ participantId: string; entry: ScoreEntry; payout: number; paidOut: number; paymentMethod: string; }> = [];

    scores.forEach((entry, index) => {
      const lastDigitA = entry.teamAScore % 10;
      const lastDigitB = entry.teamBScore % 10;
      const rowIndex = rowNumbers.indexOf(lastDigitA);
      const colIndex = colNumbers.indexOf(lastDigitB);
      if (rowIndex === -1 || colIndex === -1) return;

      const winningSquare = safeSquares.find(square => square.row === rowIndex && square.col === colIndex);
      const participantId = winningSquare?.participantId;
      if (!participantId) return;

      const payout = solvePayoutForEntry(entry, index, scores, settings, projectedPlayerPot);

      resolvedEntries.push({
        participantId,
        entry,
        payout: payout || 0,
        paidOut: entry.amountPaidTowardWinnings || 0,
        paymentMethod: entry.winningsPaymentMethod || '',
      });
    });

    return resolvedEntries;
  }, [activePool?.type, safeSquares, scores, settings, projectedPlayerPot]);

  const participantWinnings = useMemo(() => {
    const totals = new Map<string, number>();
    resolvedWinningEntries.forEach(({ participantId, payout }) => {
      totals.set(participantId, (totals.get(participantId) || 0) + payout);
    });
    return totals;
  }, [resolvedWinningEntries]);

  const participantWinningsPaidOut = useMemo(() => {
    const totals = new Map<string, number>();
    safeParticipants.forEach(participant => {
      const payoutHistoryTotal = (participant.winningsPayoutHistory || []).reduce((sum, transaction) => sum + transaction.amount, 0);
      if (payoutHistoryTotal > 0) {
        totals.set(participant.id, payoutHistoryTotal);
      }
    });

    resolvedWinningEntries.forEach(({ participantId, paidOut }) => {
      if (totals.has(participantId)) return;
      totals.set(participantId, (totals.get(participantId) || 0) + paidOut);
    });
    return totals;
  }, [resolvedWinningEntries, safeParticipants]);

  const participantWinningEntries = useMemo(() => {
    const grouped = new Map<string, Array<{ entry: ScoreEntry; payout: number; paidOut: number; paymentMethod: string }>>();
    resolvedWinningEntries.forEach(({ participantId, entry, payout, paidOut, paymentMethod }) => {
      const existing = grouped.get(participantId) || [];
      existing.push({ entry, payout, paidOut, paymentMethod });
      grouped.set(participantId, existing);
    });

    grouped.forEach((entries, participantId) => {
      grouped.set(participantId, entries.sort((left, right) => right.entry.timestamp - left.entry.timestamp));
    });

    return grouped;
  }, [resolvedWinningEntries]);

  const roster = useMemo(() => {
    return safeParticipants.map(p => {
      let entryCount = 0;
      if (activePool?.type === '13run') {
        entryCount = Object.values((activePool.gameData as ThirteenRunData)?.entries || {}).filter(e => e.participantId === p.id).length;
      } else if (activePool?.type === 'survivor') {
        entryCount = 1; // Generic 1 entry per participant for survivor unless otherwise specified
      } else {
        entryCount = safeSquares.filter(s => s.participantId === p.id).length;
      }

      const totalPaid = (p.paymentHistory || []).reduce((sum, t) => sum + t.amount, 0);
      const totalOwed = entryCount * costPerBox;
      const totalWon = participantWinnings.get(p.id) || 0;
      const winningsPaidOut = participantWinningsPaidOut.get(p.id) || 0;
      const paidOutEntries = (p.winningsPayoutHistory || []).length > 0
        ? (p.winningsPayoutHistory || []).filter(entry => entry.amount > 0).map(entry => ({ paymentMethod: entry.method }))
        : (participantWinningEntries.get(p.id) || []).filter(entry => entry.paidOut > 0);
      const singleWinningsPaymentMethod = paidOutEntries.length === 1
        ? (paidOutEntries[0].paymentMethod || '')
        : '';
      const netOwed = Math.max(0, totalOwed - totalPaid - totalWon);

      return {
        ...p,
        entryCount,
        totalPaid,
        totalOwed,
        totalWon,
        winningsPaidOut,
        singleWinningsPaymentMethod,
        netOwed,
        squareIds: activePool?.type === 'squares' ? safeSquares.filter(s => s.participantId === p.id).map(s => s.id) : [],
      };
    }).sort((a, b) => (a.alias || '').localeCompare(b.alias || ''));
  }, [safeSquares, safeParticipants, costPerBox, activePool, participantWinnings, participantWinningsPaidOut, participantWinningEntries]);

  const allTransactions = useMemo(() => {
    const txs: any[] = [];
    roster.forEach(p => {
      (p.paymentHistory || []).forEach(t => {
        txs.push({ pAlias: p.alias, pName: p.name, pEmail: p.email, pPhone: p.phone, pId: p.id, t });
      });
    });
    return txs.sort((a, b) => b.t.timestamp - a.t.timestamp);
  }, [roster]);

  const totals = useMemo(() => {
    const totalPotential = totalPot;
    const totalCollected = roster.reduce((sum, p) => sum + (p.totalPaid || 0), 0);
    return {
      totalDue: totalPotential,
      totalCollected: totalCollected,
      outstanding: Math.max(0, totalPotential - totalCollected),
      percentCollected: totalPotential > 0 ? (totalCollected / totalPotential) * 100 : 0
    };
  }, [totalPot, roster]);

  const filteredRoster = roster.filter(p =>
    (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.alias || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedParticipantStats = editModalParticipant
    ? roster.find(participant => participant.id === editModalParticipant.id)
    : null;

  const openAddPaymentModal = (p: any) => {
    const balance = Math.max(0, p.netOwed || 0);
    setPaymentModalParticipant(p);
    setEditingTransactionId(null);
    setPaymentAmount(balance > 0 ? balance.toString() : '');
    setPaymentMethod('Cash');
    setPaymentNote('');
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalParticipant) return;
    const amount = parseFloat(paymentAmount);
    if (!isNaN(amount) && amount >= 0) {
      if (editingTransactionId) onEditPayment(paymentModalParticipant.id, editingTransactionId, amount, paymentMethod, paymentNote);
      else onApplyPayment(paymentModalParticipant.id, amount, paymentMethod, paymentNote);
      setPaymentModalParticipant(null);
      setEditingTransactionId(null);
      setPaymentNote('');
    }
  };

  const openEditParticipantModal = (participant: Participant & { totalWon?: number; winningsPaidOut?: number; netOwed?: number; entryCount?: number }) => {
    setEditModalParticipant(participant);
    setEditFormData({
      name: participant.name || '',
      email: participant.email || '',
      phone: participant.phone || '',
      alias: participant.alias || '',
    });
    setEditingWinningsTransactionId(null);
    setWinningsPayoutAmount('');
    setWinningsPayoutMethod('Cash');
    setWinningsPayoutNote('');
  };

  const handleSaveParticipant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalParticipant) return;
    onUpdateParticipant(editModalParticipant.id, {
      name: editFormData.name.trim(),
      email: editFormData.email.trim(),
      phone: editFormData.phone.trim(),
      alias: editFormData.alias.trim().toUpperCase(),
    });
    setEditModalParticipant(null);
    setEditingWinningsTransactionId(null);
    setWinningsPayoutAmount('');
    setWinningsPayoutMethod('Cash');
    setWinningsPayoutNote('');
  };

  const handleEditWinningsTransaction = (transaction: PaymentTransaction) => {
    setEditingWinningsTransactionId(transaction.id);
    setWinningsPayoutAmount(String(transaction.amount));
    setWinningsPayoutMethod(transaction.method || 'Cash');
    setWinningsPayoutNote(transaction.note || '');
  };

  const handleDeleteWinningsTransaction = (transactionId: string) => {
    if (!editModalParticipant) return;
    onUpdateParticipant(editModalParticipant.id, {
      winningsPayoutHistory: (editModalParticipant.winningsPayoutHistory || []).filter(transaction => transaction.id !== transactionId)
    });
    setEditModalParticipant({
      ...editModalParticipant,
      winningsPayoutHistory: (editModalParticipant.winningsPayoutHistory || []).filter(transaction => transaction.id !== transactionId)
    });
    if (editingWinningsTransactionId === transactionId) {
      setEditingWinningsTransactionId(null);
      setWinningsPayoutAmount('');
      setWinningsPayoutMethod('Cash');
      setWinningsPayoutNote('');
    }
  };

  const handleSaveWinningsPayout = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModalParticipant) return;
    const amount = parseCustomPayoutValue(winningsPayoutAmount);
    if (amount === undefined) return;

    const noteRaw = winningsPayoutNote.trim();

    const nextTransaction: PaymentTransaction = {
      id: editingWinningsTransactionId || crypto.randomUUID(),
      amount,
      method: winningsPayoutMethod,
      timestamp: Date.now(),
    };
    if (noteRaw) {
      nextTransaction.note = noteRaw;
    }

    const existingHistory = editModalParticipant.winningsPayoutHistory || [];
    const winningsPayoutHistory = editingWinningsTransactionId
      ? existingHistory.map(transaction => {
          if (transaction.id === editingWinningsTransactionId) {
            const updated = { ...transaction, amount, method: winningsPayoutMethod };
            if (noteRaw) {
              updated.note = noteRaw;
            } else {
              delete updated.note;
            }
            return updated;
          }
          return transaction;
        })
      : [...existingHistory, nextTransaction];

    onUpdateParticipant(editModalParticipant.id, { winningsPayoutHistory });
    setEditModalParticipant({ ...editModalParticipant, winningsPayoutHistory });
    setEditingWinningsTransactionId(null);
    setWinningsPayoutAmount('');
    setWinningsPayoutMethod('Cash');
    setWinningsPayoutNote('');
  };

  return (
    <div className="space-y-6 md:space-y-12 pb-24">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6">
        <div className="bg-indigo-900 p-4 md:p-6 rounded-2xl md:rounded-3xl text-white shadow-xl">
          <p className="text-indigo-300 text-[8px] md:text-xs font-black uppercase tracking-widest mb-1">Total Pledged</p>
          <p className="text-xl md:text-4xl font-black">${totals.totalDue.toFixed(2)}</p>
        </div>
        <div className="bg-white border-2 border-green-500/10 p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-lg">
          <p className="text-green-600 text-[8px] md:text-xs font-black uppercase tracking-widest mb-1">Collected</p>
          <p className="text-xl md:text-4xl font-black text-gray-900">${totals.totalCollected.toFixed(2)}</p>
        </div>
        <div className="bg-white border-2 border-orange-500/10 p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-lg">
          <p className="text-orange-600 text-[8px] md:text-xs font-black uppercase tracking-widest mb-1">Outstanding</p>
          <p className="text-xl md:text-4xl font-black text-gray-900">${totals.outstanding.toFixed(2)}</p>
        </div>
        <div className="bg-indigo-50 p-4 md:p-6 rounded-2xl md:rounded-3xl flex items-center justify-center gap-2">
          <span className="text-xl md:text-2xl font-black text-indigo-900">{Math.round(totals.percentCollected)}%</span>
          <span className="text-[7px] md:text-[9px] font-black text-gray-400 uppercase leading-none">Goal<br />Progress</span>
        </div>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl md:rounded-[2.5rem] overflow-hidden shadow-xl">
        <div className="p-4 md:p-8 border-b bg-gray-50 flex items-center justify-between">
          <h3 className="text-lg md:text-xl font-black text-gray-900 uppercase">Participants & Contributions</h3>
          <div className="relative w-64">
            <input type="text" placeholder="Filter names..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-4 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-500" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                <th className="px-4 md:px-8 py-3 md:py-5">Player</th>
                <th className="px-4 md:px-8 py-3 md:py-5">Financial Status</th>
                <th className="px-4 md:px-8 py-3 md:py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredRoster.map((p) => {
                const balance = Math.max(0, p.netOwed || 0);
                return (
                  <tr key={p.id} className="hover:bg-indigo-50 transition-colors">
                    <td className="px-4 md:px-8 py-4">
                      <div className="space-y-1 max-w-[180px]">
                        <p className="font-black text-xs md:text-sm text-gray-900 truncate">{p.name || 'Player'}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[9px] text-indigo-600 font-black uppercase tracking-widest">{getParticipantAlias(p) || 'NO ALIAS'}</span>
                          <span className="text-[9px] text-gray-400 font-bold uppercase">{p.entryCount} Entries</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 md:px-8 py-4">
                      <div className="flex flex-col">
                        <span className="text-xs md:text-sm font-black text-indigo-900">Paid: ${p.totalPaid.toFixed(2)}</span>
                        <span className="text-[8px] text-emerald-600 font-bold uppercase">Won: ${p.totalWon.toFixed(2)}</span>
                        <span className="text-[8px] text-indigo-500 font-bold uppercase">Paid Out: ${p.winningsPaidOut.toFixed(2)}</span>
                        {p.singleWinningsPaymentMethod && <span className="text-[8px] text-sky-600 font-bold uppercase">Paid Out Via: {p.singleWinningsPaymentMethod}</span>}
                        <span className={`text-[8px] font-bold uppercase ${balance > 0 ? 'text-red-500' : 'text-green-600'}`}>Owed: ${balance.toFixed(2)}</span>
                      </div>
                    </td>
                    <td className="px-4 md:px-8 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEditParticipantModal(p)} className="bg-white text-indigo-900 px-4 py-2 rounded-xl text-[9px] font-black uppercase border border-indigo-100 shadow-sm hover:bg-indigo-50 transition-all">Manage</button>
                        <button onClick={() => openAddPaymentModal(p)} className="bg-indigo-900 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase shadow-lg hover:bg-black transition-all">Add Payment</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {paymentModalParticipant && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-indigo-950/60 backdrop-blur-md">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden">
            <div className={`p-6 text-white bg-indigo-900 flex justify-between items-center`}>
              <div>
                <h3 className="font-black uppercase text-sm">Add Payment Log</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mt-1">
                  {paymentModalParticipant.name || 'Player'}
                  {paymentModalParticipant.alias ? ` (${String(paymentModalParticipant.alias).toUpperCase()})` : ''}
                </p>
              </div>
              <button type="button" title="Close payment modal" aria-label="Close payment modal" onClick={() => setPaymentModalParticipant(null)}><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={handleConfirmPayment} className="p-6 space-y-4">
              <div><label htmlFor="payment-amount" className="text-[9px] font-black uppercase text-gray-400 block mb-2">Amount ($)</label><input id="payment-amount" required autoFocus type="number" step="0.01" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} className="w-full p-4 bg-gray-50 rounded-xl font-black text-lg outline-none focus:ring-2 focus:ring-indigo-500" /></div>
              <div><label className="text-[9px] font-black uppercase text-gray-400 block mb-2">Method</label><div className="grid grid-cols-2 gap-2">{['Cash', 'Venmo', 'PayPal', 'Other'].map(m => (<button key={m} type="button" onClick={() => setPaymentMethod(m)} className={`py-3 rounded-xl font-black uppercase text-[10px] border-2 transition-all ${paymentMethod === m ? 'bg-indigo-900 text-white' : 'bg-white text-gray-400'}`}>{m}</button>))}</div></div>
              <button type="submit" className={`w-full bg-green-600 text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs shadow-xl`}>Confirm Payment</button>
            </form>
          </div>
        </div>
      )}

      {editModalParticipant && (
        <div className="fixed inset-0 z-[170] flex items-center justify-center p-4 bg-indigo-950/60 backdrop-blur-md">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 bg-indigo-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-black uppercase text-base">Manage Participant</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300 mt-1">
                  {editModalParticipant.name || 'Player'}
                  {editModalParticipant.alias ? ` (${String(editModalParticipant.alias).toUpperCase()})` : ''}
                </p>
              </div>
              <button type="button" title="Close participant manager" aria-label="Close participant manager" onClick={() => { setEditModalParticipant(null); setEditingWinningsTransactionId(null); setWinningsPayoutAmount(''); setWinningsPayoutMethod('Cash'); setWinningsPayoutNote(''); }}><i className="fas fa-times"></i></button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-2xl bg-indigo-50 p-4">
                  <p className="text-[9px] font-black uppercase text-indigo-400">Entries</p>
                  <p className="text-xl font-black text-indigo-950">{selectedParticipantStats?.entryCount || 0}</p>
                </div>
                <div className="rounded-2xl bg-emerald-50 p-4">
                  <p className="text-[9px] font-black uppercase text-emerald-600">Won</p>
                  <p className="text-xl font-black text-emerald-700">${(selectedParticipantStats?.totalWon || 0).toFixed(2)}</p>
                </div>
                <div className="rounded-2xl bg-sky-50 p-4">
                  <p className="text-[9px] font-black uppercase text-sky-600">Paid Out</p>
                  <p className="text-xl font-black text-sky-700">${(selectedParticipantStats?.winningsPaidOut || 0).toFixed(2)}</p>
                </div>
                <div className="rounded-2xl bg-amber-50 p-4">
                  <p className="text-[9px] font-black uppercase text-amber-600">Net Owed</p>
                  <p className="text-xl font-black text-amber-700">${(selectedParticipantStats?.netOwed || 0).toFixed(2)}</p>
                </div>
              </div>

              <form onSubmit={handleSaveParticipant} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label htmlFor="participant-full-name" className="text-[9px] font-black uppercase text-gray-400 block mb-2">Full Name</label><input id="participant-full-name" value={editFormData.name} onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))} className="w-full p-4 bg-gray-50 rounded-xl font-bold outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                  <div><label htmlFor="participant-alias" className="text-[9px] font-black uppercase text-gray-400 block mb-2">Alias</label><input id="participant-alias" value={editFormData.alias} onChange={(e) => setEditFormData(prev => ({ ...prev, alias: e.target.value.toUpperCase() }))} className="w-full p-4 bg-gray-50 rounded-xl font-bold uppercase outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                  <div><label htmlFor="participant-email" className="text-[9px] font-black uppercase text-gray-400 block mb-2">Email</label><input id="participant-email" type="email" value={editFormData.email} onChange={(e) => setEditFormData(prev => ({ ...prev, email: e.target.value }))} className="w-full p-4 bg-gray-50 rounded-xl font-bold outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                  <div><label htmlFor="participant-phone" className="text-[9px] font-black uppercase text-gray-400 block mb-2">Phone</label><input id="participant-phone" value={editFormData.phone} onChange={(e) => setEditFormData(prev => ({ ...prev, phone: e.target.value }))} className="w-full p-4 bg-gray-50 rounded-xl font-bold outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                </div>
                <div className="flex justify-end">
                  <button type="submit" className="bg-indigo-900 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-black transition-all">Save Participant</button>
                </div>
              </form>

              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-black uppercase text-gray-900">Winning Entries</h4>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">Read-only list of wins attached to this participant.</p>
                </div>
                {(participantWinningEntries.get(editModalParticipant.id) || []).length === 0 ? (
                  <div className="rounded-2xl bg-gray-50 p-6 text-center text-[10px] font-black uppercase tracking-widest text-gray-400">No winning entries yet.</div>
                ) : (
                  <div className="space-y-3">
                    {(participantWinningEntries.get(editModalParticipant.id) || []).map(({ entry, payout }) => (
                      <div key={entry.id} className="rounded-2xl border border-gray-100 p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div>
                          <p className="text-sm font-black text-gray-900 uppercase">{entry.label}</p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">Score {entry.teamAScore}-{entry.teamBScore} • Payout ${payout.toFixed(2)}</p>
                        </div>
                        <div className="rounded-xl bg-gray-50 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-gray-400">
                          Win Record
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-black uppercase text-gray-900">Winner Payout Entries</h4>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">Track winnings paid out once per participant, with as many payout logs as needed.</p>
                </div>

                <form onSubmit={handleSaveWinningsPayout} className="rounded-2xl border border-gray-100 p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="winner-payout-amount" className="text-[9px] font-black uppercase text-gray-400 block mb-2">Amount Paid</label>
                      <input id="winner-payout-amount" type="number" step="0.01" value={winningsPayoutAmount} onChange={(e) => setWinningsPayoutAmount(e.target.value)} className="w-full p-4 bg-gray-50 rounded-xl font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label htmlFor="winner-payout-method" className="text-[9px] font-black uppercase text-gray-400 block mb-2">Payment Method</label>
                      <select id="winner-payout-method" value={winningsPayoutMethod} onChange={(e) => setWinningsPayoutMethod(e.target.value)} className="w-full p-4 bg-gray-50 rounded-xl font-bold outline-none focus:ring-2 focus:ring-indigo-500">
                        {WINNINGS_PAYMENT_METHODS.map(method => (
                          <option key={method} value={method}>{method}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="winner-payout-note" className="text-[9px] font-black uppercase text-gray-400 block mb-2">Note</label>
                      <input id="winner-payout-note" value={winningsPayoutNote} onChange={(e) => setWinningsPayoutNote(e.target.value)} className="w-full p-4 bg-gray-50 rounded-xl font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                  </div>
                  <div className="flex gap-3 justify-end">
                    {editingWinningsTransactionId && <button type="button" onClick={() => { setEditingWinningsTransactionId(null); setWinningsPayoutAmount(''); setWinningsPayoutMethod('Cash'); setWinningsPayoutNote(''); }} className="px-4 py-3 rounded-xl border border-gray-200 font-black uppercase text-[10px] text-gray-600">Cancel</button>}
                    <button type="submit" className="px-4 py-3 rounded-xl bg-emerald-600 text-white font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-emerald-700 transition-all">{editingWinningsTransactionId ? 'Update Payout' : 'Add Payout'}</button>
                  </div>
                </form>

                {(editModalParticipant.winningsPayoutHistory || []).length === 0 ? (
                  <div className="rounded-2xl bg-gray-50 p-6 text-center text-[10px] font-black uppercase tracking-widest text-gray-400">No participant payout entries yet.</div>
                ) : (
                  <div className="space-y-3">
                    {(editModalParticipant.winningsPayoutHistory || []).slice().sort((left, right) => right.timestamp - left.timestamp).map((transaction) => (
                      <div key={transaction.id} className="rounded-2xl border border-gray-100 p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        <div>
                          <p className="text-sm font-black text-gray-900 uppercase">${transaction.amount.toFixed(2)} via {transaction.method}</p>
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">{new Date(transaction.timestamp).toLocaleString()}{transaction.note ? ` • ${transaction.note}` : ''}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button type="button" onClick={() => handleEditWinningsTransaction(transaction)} className="px-4 py-3 rounded-xl bg-white text-indigo-900 border border-indigo-100 font-black uppercase tracking-widest text-[10px] hover:bg-indigo-50 transition-all">Edit</button>
                          <button type="button" onClick={() => handleDeleteWinningsTransaction(transaction.id)} className="px-4 py-3 rounded-xl bg-red-50 text-red-600 border border-red-100 font-black uppercase tracking-widest text-[10px] hover:bg-red-100 transition-all">Delete</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stats;
