
import React, { useState, useMemo } from 'react';
import { Pool, ScoreEntry, GameSettings } from '../types';

interface WinnersProps {
  activePool: Pool;
  settings: GameSettings;
  onAddScore: (score: ScoreEntry) => void;
  onUpdateScore: (score: ScoreEntry) => void;
  onDeleteScore: (id: string) => void;
  isAdmin: boolean;
}

const Winners: React.FC<WinnersProps> = ({ activePool, settings, onAddScore, onUpdateScore, onDeleteScore, isAdmin }) => {
  const [teamAScoreInput, setTeamAScoreInput] = useState('');
  const [teamBScoreInput, setTeamBScoreInput] = useState('');
  const [scoreLabel, setScoreLabel] = useState('Score Update');
  const [editingScoreId, setEditingScoreId] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const { scores = [], squares = [] } = activePool;
  const { payouts, costPerBox, rowNumbers, colNumbers } = settings;

  const totalPot = useMemo(() => squares.length * costPerBox, [squares.length, costPerBox]);
  
  const charityAmount = useMemo(() => {
    if (payouts.charityPayoutType === 'fixed') return payouts.charityFixedAmount || 0;
    return totalPot * (payouts.charityPercent / 100);
  }, [totalPot, payouts.charityPercent, payouts.charityPayoutType, payouts.charityFixedAmount]);

  const payoutPot = totalPot - charityAmount;

  const calculateWinner = (teamA: number, teamB: number): { alias: string; id: number; assigned: boolean } | null => {
    const lastDigitA = teamA % 10;
    const lastDigitB = teamB % 10;
    
    const rowIndex = (rowNumbers || []).indexOf(lastDigitA);
    const colIndex = (colNumbers || []).indexOf(lastDigitB);
    
    if (rowIndex === -1 || colIndex === -1) return null;
    
    const winningSquare = squares.find(s => s.row === rowIndex && s.col === colIndex);
    if (!winningSquare) return null;

    return { 
      alias: winningSquare.assigned ? winningSquare.alias : 'Unassigned', 
      id: winningSquare.id,
      assigned: winningSquare.assigned
    };
  };

  const scoreHistory = useMemo(() => {
    return (scores || []).map((s, index) => {
      const winner = calculateWinner(s.teamAScore, s.teamBScore);
      let payout = 0;

      if (payouts.mode === 'standard') {
        if (payouts.standardPayoutType === 'fixed') {
          payout = payouts.standardSplits[s.label.toLowerCase() as keyof typeof payouts.standardSplits] || 0;
        } else {
          const split = payouts.standardSplits[s.label.toLowerCase() as keyof typeof payouts.standardSplits] || 0;
          payout = payoutPot * (split / 100);
        }
      } else {
        const isZeroZero = s.teamAScore === 0 && s.teamBScore === 0;
        const previousZeroZero = scores.slice(0, index).some(prev => prev.teamAScore === 0 && prev.teamBScore === 0);

        // Initial 0-0 behavior: refund a box if configured
        if (isZeroZero && !previousZeroZero && payouts.scoreChangeInitialRefund !== false) {
          payout = costPerBox; // refund the box cost
        } else if (s.label === 'Final') {
          // Final gets the remaining player pot after charity
          payout = payoutPot;
        } else {
          const multiplier = payouts.scoreChangeMultiplier || 3;
          if (payouts.scoreChangeAppliesTo === 'totalPot') {
            payout = totalPot * multiplier;
          } else {
            payout = costPerBox * multiplier;
          }
        }
      }

      return { ...s, winner, payout };
    });
  }, [scores, payouts, payoutPot, costPerBox, rowNumbers, colNumbers, squares, totalPot]);

  const handleSaveScore = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const a = parseInt(teamAScoreInput);
    const b = parseInt(teamBScoreInput);

    if (isNaN(a) || isNaN(b)) {
      setValidationError("Invalid scores.");
      return;
    }

    if (editingScoreId) {
      onUpdateScore({ id: editingScoreId, teamAScore: a, teamBScore: b, label: scoreLabel, timestamp: Date.now() });
      setEditingScoreId(null);
    } else {
      onAddScore({ id: crypto.randomUUID(), teamAScore: a, teamBScore: b, label: scoreLabel, timestamp: Date.now() });
    }

    setTeamAScoreInput('');
    setTeamBScoreInput('');
  };

  const handleEdit = (entry: ScoreEntry) => {
    setEditingScoreId(entry.id);
    setTeamAScoreInput(entry.teamAScore.toString());
    setTeamBScoreInput(entry.teamBScore.toString());
    setScoreLabel(entry.label);
    setValidationError(null);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Impact Banner (View Only) */}
      {!isAdmin && (
        <div className="bg-indigo-900 text-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
             <i className="fas fa-sack-dollar text-[120px] rotate-12"></i>
          </div>
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-4">
               <div className="inline-block px-3 py-1 bg-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-indigo-300">Live Contest Standings</div>
               <div className="flex items-center gap-4">
                 {settings.teamALogo ? <img src={settings.teamALogo} alt={settings.teamA} className="h-10 object-contain" /> : <div className="h-10 w-10 rounded bg-indigo-100 flex items-center justify-center font-black text-indigo-700">{(settings.teamA||'').slice(0,2).toUpperCase()}</div>}
                 <h2 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tighter truncate leading-tight">Pot: ${totalPot}</h2>
                 {settings.teamBLogo ? <img src={settings.teamBLogo} alt={settings.teamB} className="h-10 object-contain ml-4" /> : <div className="ml-4 h-10 w-10 rounded bg-indigo-100 flex items-center justify-center font-black text-indigo-700">{(settings.teamB||'').slice(0,2).toUpperCase()}</div>}
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
                   <p className="text-xl font-black">${payoutPot.toFixed(0)}</p>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Management Section - Only rendered if isAdmin is true */}
      {isAdmin && (
        <section className={`bg-indigo-50/50 p-8 rounded-[3rem] border-2 transition-all ${editingScoreId ? 'border-orange-500 bg-orange-50/20' : 'border-indigo-100'}`}>
          <h4 className="text-[10px] font-black text-indigo-900 uppercase tracking-widest mb-6">Log Live Score Change</h4>
          <form onSubmit={handleSaveScore} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-1">
              <label className="text-[8px] font-black text-gray-400 uppercase">{settings.teamA} Score</label>
              <input type="number" required value={teamAScoreInput} onChange={e => setTeamAScoreInput(e.target.value)} className="w-full p-4 bg-white rounded-xl font-black text-2xl outline-none" placeholder="0" />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black text-gray-400 uppercase">{settings.teamB} Score</label>
              <input type="number" required value={teamBScoreInput} onChange={e => setTeamBScoreInput(e.target.value)} className="w-full p-4 bg-white rounded-xl font-black text-2xl outline-none" placeholder="0" />
            </div>
            <div className="space-y-1">
              <label className="text-[8px] font-black text-gray-400 uppercase">Label</label>
              <select value={scoreLabel} onChange={e => setScoreLabel(e.target.value)} className="w-full p-4 bg-white rounded-xl font-black text-sm outline-none">
                <option value="Score Update">Score Update</option>
                <option value="Q1">End of Q1</option>
                <option value="Half">Halftime</option>
                <option value="Q3">End of Q3</option>
                <option value="Final">Final Score</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button type="submit" className={`flex-grow py-4 rounded-xl font-black uppercase text-[10px] text-white ${editingScoreId ? 'bg-orange-500' : 'bg-indigo-900'}`}>{editingScoreId ? 'Save' : 'Log'}</button>
              {editingScoreId && <button onClick={() => setEditingScoreId(null)} className="px-4 py-4 bg-white text-gray-400 rounded-xl font-black text-[10px] uppercase">X</button>}
            </div>
          </form>
        </section>
      )}

      {/* Shared View-Only Results List */}
      <div className="space-y-6">
        <h3 className="text-sm font-black text-indigo-900 uppercase tracking-[0.2em] px-4">Match Timeline</h3>

        {scoreHistory.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-gray-100 rounded-[3rem] py-24 text-center">
            <p className="text-gray-400 font-black uppercase text-xs tracking-widest italic">Game in progress... Waiting for first score.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {scoreHistory.slice().reverse().map((entry) => (
              <div key={entry.id} className="bg-white border border-gray-100 rounded-[2.5rem] p-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-sm">
                <div className="flex items-center gap-6 w-full md:w-auto">
                  <div className="text-center px-6 py-4 rounded-[2rem] bg-indigo-50 border border-indigo-100 min-w-[100px]">
                    <p className="text-[8px] font-black uppercase tracking-widest mb-1 text-gray-400">{entry.label}</p>
                    <p className="text-2xl font-black tabular-nums">{entry.teamAScore} - {entry.teamBScore}</p>
                  </div>
                  <div className="flex-grow min-w-0">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Square Holder</p>
                    <h4 className="text-lg font-black uppercase truncate text-indigo-950">
                      {entry.winner?.alias || 'Missing Axis #s'}
                    </h4>
                    {entry.winner && (
                       <span className="text-[9px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-black uppercase">Box #{entry.winner.id + 1}</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-6 w-full md:w-auto">
                   <div className="text-right">
                      <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">Payout</p>
                      <p className="text-3xl font-black text-gray-900">${entry.payout.toFixed(0)}</p>
                   </div>
                   {isAdmin && (
                     <div className="flex gap-2">
                       <button onClick={() => handleEdit(entry)} className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center"><i className="fas fa-edit"></i></button>
                       <button onClick={() => onDeleteScore(entry.id)} className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center"><i className="fas fa-trash"></i></button>
                     </div>
                   )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Winners;
