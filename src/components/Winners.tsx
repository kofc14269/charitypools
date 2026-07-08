
import React, { useState, useMemo, useEffect } from 'react';
import { Pool, ScoreEntry, GameSettings, ThirteenRunData, SurvivorData } from '../types';
import { resolvePayoutOverride, solvePayoutForEntry, calculateFinancialSummary, parseCustomPayoutValue, formatMoney } from '../utils/finance';

interface WinnersProps {
  activePool: Pool;
  settings: GameSettings;
  onAddScore: (score: ScoreEntry) => void;
  onUpdateScore: (score: ScoreEntry) => void;
  onDeleteScore: (id: string) => void;
  isAdmin: boolean;
}

const SCORE_CHANGE_DEFAULT_LABEL = 'Score Change';
const STANDARD_SCORE_LABELS = ['Q1', 'Half', 'Q3', 'Final'];


const Winners: React.FC<WinnersProps> = ({ activePool, settings, onAddScore, onUpdateScore, onDeleteScore, isAdmin }) => {
  const [teamAScoreInput, setTeamAScoreInput] = useState('');
  const [teamBScoreInput, setTeamBScoreInput] = useState('');
  const [customPayoutInput, setCustomPayoutInput] = useState('');
  const [scoreLabel, setScoreLabel] = useState('Score Update');
  const [editingScoreId, setEditingScoreId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const { scores = [], squares = [], type } = activePool;
  const { payouts, costPerBox, rowNumbers, colNumbers } = settings;

  useEffect(() => {
    if (editingScoreId) return;
    setScoreLabel(payouts.mode === 'scoreChange' || payouts.mode === 'singleWinner' ? SCORE_CHANGE_DEFAULT_LABEL : STANDARD_SCORE_LABELS[0]);
  }, [editingScoreId, payouts.mode]);

  const { totalPot, playerPot, projectedPlayerPot, charityAmount } = useMemo(() => {
    return calculateFinancialSummary(activePool, settings, scores, squares);
  }, [activePool, settings, scores, squares]);

  const scoreLog = useMemo(() => {
    return scores.map((entry, index) => {
      const lastDigitA = entry.teamAScore % 10;
      const lastDigitB = entry.teamBScore % 10;
      const rowIndex = (rowNumbers || []).indexOf(lastDigitA);
      const colIndex = (colNumbers || []).indexOf(lastDigitB);
      const winningSquare = rowIndex === -1 || colIndex === -1
        ? undefined
        : squares.find(square => square.row === rowIndex && square.col === colIndex);

      const payout = solvePayoutForEntry(entry, index, scores, settings, projectedPlayerPot);

      return {
        entry,
        payout,
        winnerSquare: winningSquare,
        winnerLabel: winningSquare
          ? (winningSquare.assigned ? (winningSquare.alias || winningSquare.participantId) : 'UNCLAIMED')
          : 'PENDING',
      };
    }).slice().reverse();
  }, [scores, rowNumbers, colNumbers, squares, settings, projectedPlayerPot]);

  const winnerBreakdown = useMemo(() => {
    const totals = new Map<string, {
      key: string;
      winnerLabel: string;
      displayAlias: string;
      detailLabels: string[];
      totalWinnings: number;
      totalApplied: number;
      wins: number;
      latestEntry: ScoreEntry;
    }>();

    scoreLog.forEach(({ entry, payout, winnerSquare, winnerLabel }) => {
      // Prioritize Alias for grouping, fallback to Winner Label or Square ID
      const participantAlias = winnerSquare?.alias;
      const participantId = winnerSquare?.participantId;
      
      let key = '';
      let displayLabel = '';
      
      if (participantAlias) {
        key = `alias:${participantAlias}`;
        displayLabel = participantAlias;
      } else if (participantId) {
        // Find participant name if alias missing
        const p = activePool.participants.find(p => p.id === participantId);
        displayLabel = p?.alias || p?.name || 'NAME MISSING';
        key = `alias:${displayLabel}`;
      } else if (winnerLabel === 'UNCLAIMED' && winnerSquare) {
        key = `square:${winnerSquare.id}`;
        displayLabel = `UNCLAIMED SQUARE #${winnerSquare.id + 1}`;
      } else {
        key = `label:${winnerLabel || 'PENDING'}`;
        displayLabel = winnerLabel || 'PENDING';
      }

      const existing = totals.get(key);
      const scoreDetail = entry.label || 'Score Update';

      if (existing) {
        existing.totalWinnings += payout || 0;
        existing.totalApplied += entry.amountPaidTowardWinnings || 0;
        existing.wins += 1;
        if (!existing.detailLabels.includes(scoreDetail)) {
          existing.detailLabels.push(scoreDetail);
        }
        // Combine labels for professional look
        if (!existing.winnerLabel.includes(scoreDetail)) {
          existing.winnerLabel = `${existing.winnerLabel} + ${scoreDetail}`;
        }
        if (entry.timestamp > existing.latestEntry.timestamp) {
          existing.latestEntry = entry;
        }
        return;
      }

      totals.set(key, {
        key,
        winnerLabel: displayLabel === winnerLabel ? scoreDetail : displayLabel, // we handle labels differently inside the row now
        displayAlias: displayLabel,
        detailLabels: [scoreDetail],
        totalWinnings: payout || 0,
        totalApplied: entry.amountPaidTowardWinnings || 0,
        wins: 1,
        latestEntry: entry,
      });
    });

    return Array.from(totals.values()).sort((left, right) => {
      if (right.totalWinnings !== left.totalWinnings) return right.totalWinnings - left.totalWinnings;
      return left.displayAlias.localeCompare(right.displayAlias);
    });
  }, [scoreLog, activePool.participants]);

  const clearScoreForm = () => {
    setTeamAScoreInput('');
    setTeamBScoreInput('');
    setCustomPayoutInput('');
    setScoreLabel(payouts.mode === 'scoreChange' || payouts.mode === 'singleWinner' ? SCORE_CHANGE_DEFAULT_LABEL : STANDARD_SCORE_LABELS[0]);
    setEditingScoreId(null);
    setValidationError(null);
  };

  const handleEditScore = (entry: ScoreEntry) => {
    setEditingScoreId(entry.id);
    setTeamAScoreInput(String(entry.teamAScore));
    setTeamBScoreInput(String(entry.teamBScore));
    setScoreLabel(entry.label || (payouts.mode === 'scoreChange' || payouts.mode === 'singleWinner' ? SCORE_CHANGE_DEFAULT_LABEL : STANDARD_SCORE_LABELS[0]));
    setCustomPayoutInput(resolvePayoutOverride(entry)?.toString() || '');
    setValidationError(null);
  };

  const handleScoreSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const teamAScore = Number(teamAScoreInput);
    const teamBScore = Number(teamBScoreInput);
    const customPayout = parseCustomPayoutValue(customPayoutInput);
    const trimmedLabel = scoreLabel.trim() || (payouts.mode === 'scoreChange' || payouts.mode === 'singleWinner' ? SCORE_CHANGE_DEFAULT_LABEL : STANDARD_SCORE_LABELS[0]);

    if (!Number.isInteger(teamAScore) || teamAScore < 0 || !Number.isInteger(teamBScore) || teamBScore < 0) {
      setValidationError('Enter whole-number team scores.');
      return;
    }

    if (!trimmedLabel) {
      setValidationError('Enter a score label.');
      return;
    }

    const existingScore = editingScoreId ? scores.find(score => score.id === editingScoreId) : undefined;
    const nextScore: ScoreEntry = {
      id: existingScore?.id || crypto.randomUUID(),
      teamAScore,
      teamBScore,
      label: trimmedLabel,
      timestamp: existingScore?.timestamp || Date.now(),
    };

    if (customPayout !== undefined) nextScore.customPayout = customPayout;
    if (existingScore?.amountPaidTowardWinnings !== undefined) {
      nextScore.amountPaidTowardWinnings = existingScore.amountPaidTowardWinnings;
    }
    if (existingScore?.winningsPaymentMethod) {
      nextScore.winningsPaymentMethod = existingScore.winningsPaymentMethod;
    }

    if (editingScoreId) onUpdateScore(nextScore);
    else onAddScore(nextScore);

    clearScoreForm();
  };

  // --- 13-RUN LEADERBOARD ---
  if (type === '13run') {
    const gameData = activePool.gameData as ThirteenRunData;
    const entries = Object.values(gameData?.entries || {}).filter(e => e.participantId);
    const sortedEntries = [...entries].sort((a, b) => b.punches.length - a.punches.length);

    return (
      <div className="space-y-8 pb-12">
        <div className="bg-indigo-900 text-white rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-4xl font-black tracking-tighter uppercase mb-2">13-Run Standings</h2>
            <p className="text-indigo-300 font-bold uppercase text-[10px] tracking-widest italic opacity-80">Supporting {settings.charityName}</p>
            <div className="mt-8 flex gap-4">
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5"><p className="text-[9px] font-black text-indigo-300 uppercase mb-1">Total Pot</p><p className="text-xl font-black">${totalPot.toFixed(2)}</p></div>
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5"><p className="text-[9px] font-black text-green-400 uppercase mb-1">Playoff Pool</p><p className="text-xl font-black">${projectedPlayerPot.toFixed(2)}</p></div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {sortedEntries.map((entry, idx) => {
            const p = activePool.participants.find(part => part.id === entry.participantId);
            return (
              <div key={entry.teamId} className={`bg-white border p-6 rounded-[2rem] flex items-center justify-between shadow-sm ${entry.isWinner ? 'border-emerald-500 bg-emerald-50/20' : 'border-indigo-50'}`}>
                <div className="flex items-center gap-6">
                  <div className="text-xl font-black text-indigo-200">#{idx + 1}</div>
                  <div>
                    <h4 className="text-lg font-black text-indigo-950 uppercase">{p?.name || 'Unknown'}</h4>
                    <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{entry.teamName}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-indigo-950">{entry.punches.length} / 14</p>
                  <p className="text-[8px] font-bold text-indigo-400 uppercase tracking-widest">Completed Punches</p>
                </div>
              </div>
            );
          })}
          {sortedEntries.length === 0 && <div className="p-20 text-center bg-white rounded-[3rem] border border-dashed border-indigo-100 italic text-indigo-300 uppercase font-black text-xs">Waiting for assignments...</div>}
        </div>
      </div>
    );
  }

  // --- SURVIVOR FULL LIST ---
  if (type === 'survivor') {
    const gameData = activePool.gameData as SurvivorData;
    const participants = activePool.participants || [];

    return (
      <div className="space-y-8 pb-12">
        <div className="bg-indigo-900 text-white rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-4xl font-black tracking-tighter uppercase mb-2">Survivor Status</h2>
            <p className="text-indigo-300 font-bold uppercase text-[10px] tracking-widest italic opacity-80">Full List of Remaining Participants</p>
            <div className="mt-8 flex gap-4">
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5"><p className="text-[9px] font-black text-indigo-300 uppercase mb-1">Total Pool</p><p className="text-xl font-black">${totalPot}</p></div>
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5"><p className="text-[9px] font-black text-emerald-400 uppercase mb-1">Still Alive</p><p className="text-xl font-black">{participants.filter(p => !gameData.participants?.[p.id]?.isEliminated).length}</p></div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-[3rem] border border-indigo-50 overflow-hidden shadow-sm">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-indigo-50/50 border-b border-indigo-100">
                <th className="px-8 py-5 text-[10px] font-black text-indigo-400 uppercase tracking-widest">Player</th>
                <th className="px-8 py-5 text-[10px] font-black text-indigo-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-indigo-400 uppercase tracking-widest">Last Entry</th>
              </tr>
            </thead>
            <tbody>
              {participants.map(p => {
                const isEliminated = gameData.participants?.[p.id]?.isEliminated;
                return (
                  <tr key={p.id} className="border-b border-indigo-50 hover:bg-gray-50 transition-all">
                    <td className="px-8 py-5">
                      <h4 className={`text-sm font-black uppercase ${isEliminated ? 'text-gray-400 line-through' : 'text-indigo-950'}`}>{p.name}</h4>
                      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{p.alias || '--'}</p>
                    </td>
                    <td className="px-8 py-5">
                      {isEliminated
                        ? <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 rounded-full text-[9px] font-black uppercase tracking-widest"><i className="fas fa-times-circle"></i> Eliminated</span>
                        : <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-widest"><i className="fas fa-check-circle"></i> Still In</span>
                      }
                    </td>
                    <td className="px-8 py-5 text-sm text-gray-400 font-bold uppercase tracking-tighter">Week {gameData.participants?.[p.id]?.picks?.length || 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // --- DEFAULT SQUARES VIEW ---
  return (
    <div className="space-y-8 pb-12">
      <div className="bg-indigo-900 text-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <i className="fas fa-sack-dollar text-[120px] rotate-12"></i>
        </div>
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="space-y-4">
            <div className="inline-block px-3 py-1 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-indigo-300">Match Winners</div>
            <div className="flex items-center gap-4">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter truncate leading-tight">Pot: ${totalPot}</h2>
            </div>
            <p className="text-indigo-300 text-sm font-medium uppercase tracking-widest italic opacity-80 truncate">Supporting {settings.charityName}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
              <p className="text-[9px] font-black text-indigo-300 uppercase mb-1">Charity</p>
              <p className="text-xl font-black">${charityAmount.toFixed(0)}</p>
            </div>
            <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
              <p className="text-[9px] font-black text-green-400 uppercase mb-1">Players</p>
              <p className="text-xl font-black">${projectedPlayerPot.toFixed(0)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className={`grid grid-cols-1 ${isAdmin ? 'xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]' : ''} gap-6`}>
        {isAdmin && (
          <form onSubmit={handleScoreSubmit} className="bg-white rounded-[2.5rem] border border-indigo-50 shadow-sm overflow-hidden">
            <div className="p-6 md:p-8 border-b border-indigo-50 bg-indigo-50/40">
              <h3 className="text-xl font-black text-indigo-950 uppercase">{editingScoreId ? 'Edit Score Entry' : 'Add Score Entry'}</h3>
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-2">
                {payouts.mode === 'scoreChange'
                ? 'Each change logs a new winner.'
                : payouts.mode === 'singleWinner'
                ? 'One winner takes 100% of the player pot.'
                : 'Quarter labels drive the standard payout split.'}
              </p>
            </div>
            <div className="p-6 md:p-8 space-y-5">
              {payouts.mode === 'standard' ? (
                <div>
                  <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Score Label</label>
                  <select
                    aria-label="Score label"
                    value={scoreLabel}
                    onChange={(event) => setScoreLabel(event.target.value)}
                    className="w-full p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 font-black text-indigo-950 outline-none"
                  >
                    {STANDARD_SCORE_LABELS.map(label => (
                      <option key={label} value={label}>{label}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Score Label</label>
                  <input
                    type="text"
                    value={scoreLabel}
                    onChange={(event) => setScoreLabel(event.target.value)}
                    placeholder={SCORE_CHANGE_DEFAULT_LABEL}
                    className="w-full p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 font-black text-indigo-950 outline-none"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">{settings.teamA || 'Team A'} Score</label>
                  <input
                    type="number"
                    aria-label={`${settings.teamA || 'Team A'} score`}
                    min="0"
                    step="1"
                    value={teamAScoreInput}
                    onChange={(event) => setTeamAScoreInput(event.target.value)}
                    className="w-full p-4 rounded-2xl bg-white border border-indigo-100 font-black text-2xl text-indigo-950 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">{settings.teamB || 'Team B'} Score</label>
                  <input
                    type="number"
                    aria-label={`${settings.teamB || 'Team B'} score`}
                    min="0"
                    step="1"
                    value={teamBScoreInput}
                    onChange={(event) => setTeamBScoreInput(event.target.value)}
                    className="w-full p-4 rounded-2xl bg-white border border-indigo-100 font-black text-2xl text-indigo-950 outline-none"
                  />
                </div>
              </div>

              <div>
                <div>
                  <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Custom Payout</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={customPayoutInput}
                    onChange={(event) => setCustomPayoutInput(event.target.value)}
                    placeholder="Optional"
                    className="w-full p-4 rounded-2xl bg-white border border-indigo-100 font-black text-indigo-950 outline-none"
                  />
                </div>
              </div>

              {validationError && (
                <div className="px-4 py-3 rounded-2xl bg-red-50 text-red-600 text-[11px] font-black uppercase tracking-wide">
                  {validationError}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button type="submit" className="flex-1 py-4 px-5 bg-indigo-900 text-white rounded-2xl font-black uppercase tracking-widest shadow-lg hover:bg-black transition-all">
                  {editingScoreId ? 'Update Score' : 'Add Score'}
                </button>
                {editingScoreId && (
                  <button type="button" onClick={clearScoreForm} className="py-4 px-5 bg-white text-indigo-900 rounded-2xl font-black uppercase tracking-widest border border-indigo-100 hover:bg-indigo-50 transition-all">
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </form>
        )}

        <div className="bg-white rounded-[2.5rem] border border-indigo-50 shadow-sm overflow-hidden">
          <div className="p-6 md:p-8 border-b border-indigo-50 bg-white flex items-center justify-between gap-4">
            <div>
              <h3 className="text-xl font-black text-indigo-950 uppercase">Live Winner Breakdown</h3>
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-2">Totals combined by winner and sorted by amount won.</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-indigo-950">{winnerBreakdown.length}</p>
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Winners</p>
            </div>
          </div>

          {winnerBreakdown.length === 0 ? (
            <div className="p-12 md:p-20 text-center text-indigo-300 uppercase font-black text-xs bg-indigo-50/20">
              No score entries have been logged yet.
            </div>
          ) : (
            <div className="p-4 md:p-8 space-y-4 bg-indigo-50/20">
              {winnerBreakdown.map((winner) => (
                <div key={winner.key} className="bg-white p-6 rounded-[2rem] border border-indigo-100 shadow-sm hover:shadow-md transition-all group">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded-lg">
                          {winner.wins} {winner.wins === 1 ? 'Win' : 'Wins'}
                        </span>
                        <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded-lg">
                          {winner.detailLabels?.join(' + ')}
                        </span>
                      </div>
                      <h4 className="text-xl font-black text-indigo-950 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">
                        {winner.displayAlias}
                      </h4>
                      <div className="flex items-center gap-3 text-[10px] font-bold text-indigo-400 uppercase">
                        <span>Latest: {winner.latestEntry.teamAScore}-{winner.latestEntry.teamBScore} ({winner.latestEntry.label})</span>
                        {winner.totalApplied > 0 && (
                          <span className="text-emerald-600">
                            Already Paid {formatMoney(winner.totalApplied)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-left md:text-right border-t md:border-t-0 pt-4 md:pt-0 border-indigo-50">
                      <p className="text-2xl font-black text-indigo-950">{formatMoney(winner.totalWinnings)}</p>
                      {winner.totalWinnings > winner.totalApplied ? (
                        <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest">
                          Balance Due: {formatMoney(winner.totalWinnings - winner.totalApplied)}
                        </p>
                      ) : (
                        <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
                          Account Settled
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {isAdmin && scoreLog.length > 0 && (
          <div className="bg-white rounded-[2.5rem] border border-indigo-50 shadow-sm overflow-hidden">
            <div className="p-6 md:p-8 border-b border-indigo-50 bg-white flex items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-black text-indigo-950 uppercase">Raw Score Entries</h3>
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mt-2">Most recent entries appear first for edits and corrections.</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-indigo-950">{scores.length}</p>
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Entries</p>
              </div>
            </div>

            <div className="divide-y divide-indigo-50">
              {scoreLog.map(({ entry, payout, winnerSquare, winnerLabel }) => (
                <div key={entry.id} className="p-6 md:p-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-widest">{entry.label}</span>
                      <span className="text-sm font-black text-indigo-950">{settings.teamA}: {entry.teamAScore}</span>
                      <span className="text-sm font-black text-indigo-950">{settings.teamB}: {entry.teamBScore}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-[11px] font-bold uppercase tracking-wide text-indigo-400">
                      <span>Winner: <span className="text-indigo-950">{winnerLabel}</span></span>
                      <span>Payout: <span className="text-emerald-600">{formatMoney(payout || 0)}</span></span>
                      {winnerSquare && <span>Square #{winnerSquare.id + 1}</span>}
                      {entry.amountPaidTowardWinnings !== undefined && <span>Applied: {formatMoney(entry.amountPaidTowardWinnings)}{entry.winningsPaymentMethod ? ` via ${entry.winningsPaymentMethod}` : ''}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleEditScore(entry)}
                      className="px-4 py-3 rounded-2xl bg-white text-indigo-900 border border-indigo-100 font-black uppercase tracking-widest text-[10px] hover:bg-indigo-50 transition-all"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteScore(entry.id);
                        if (editingScoreId === entry.id) clearScoreForm();
                      }}
                      className="px-4 py-3 rounded-2xl bg-red-50 text-red-600 border border-red-100 font-black uppercase tracking-widest text-[10px] hover:bg-red-100 transition-all"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Winners;
