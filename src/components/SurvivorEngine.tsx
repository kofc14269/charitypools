
import React, { useState } from 'react';
import { Pool, SurvivorData, Participant, SurvivorPick } from '../types';

interface SurvivorEngineProps {
  pool: Pool;
  participants: Participant[];
  isAdmin: boolean;
  onUpdateGameData: (data: Partial<SurvivorData>) => void;
  liveScores?: any;
}

const NFL_TEAMS = [
  { id: 'ARI', name: 'Cardinals' }, { id: 'ATL', name: 'Falcons' }, { id: 'BAL', name: 'Ravens' },
  { id: 'BUF', name: 'Bills' }, { id: 'CAR', name: 'Panthers' }, { id: 'CHI', name: 'Bears' },
  { id: 'CIN', name: 'Bengals' }, { id: 'CLE', name: 'Browns' }, { id: 'DAL', name: 'Cowboys' },
  { id: 'DEN', name: 'Broncos' }, { id: 'DET', name: 'Lions' }, { id: 'GB', name: 'Packers' },
  { id: 'HOU', name: 'Texans' }, { id: 'IND', name: 'Colts' }, { id: 'JAX', name: 'Jaguars' },
  { id: 'KC', name: 'Chiefs' }, { id: 'LV', name: 'Raiders' }, { id: 'LAC', name: 'Chargers' },
  { id: 'LAR', name: 'Rams' }, { id: 'MIA', name: 'Dolphins' }, { id: 'MIN', name: 'Vikings' },
  { id: 'NE', name: 'Patriots' }, { id: 'NO', name: 'Saints' }, { id: 'NYG', name: 'Giants' },
  { id: 'NYJ', name: 'Jets' }, { id: 'PHI', name: 'Eagles' }, { id: 'PIT', name: 'Steelers' },
  { id: 'SF', name: '49ers' }, { id: 'SEA', name: 'Seahawks' }, { id: 'TB', name: 'Buccaneers' },
  { id: 'TEN', name: 'Titans' }, { id: 'WAS', name: 'Commanders' }
];

const SurvivorEngine: React.FC<SurvivorEngineProps> = ({ pool, participants, isAdmin, onUpdateGameData, liveScores }) => {
  const gameData = pool.gameData as SurvivorData || { participants: {}, currentWeek: 1 };
  const [selectedWeek, setSelectedWeek] = useState(gameData.currentWeek || 1);

  const activeParticipants = (participants || []).map(p => ({
    ...p,
    survivor: gameData.participants?.[p.id] || { picks: [], isEliminated: false }
  }));

  const aliveCount = activeParticipants.filter(p => !p.survivor.isEliminated).length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-indigo-50">
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Status</p>
          <div className="flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
             <h3 className="text-2xl font-black text-indigo-950 uppercase tracking-tighter">Week {gameData.currentWeek}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-indigo-50">
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Alive</p>
          <h3 className="text-2xl font-black text-indigo-950 uppercase tracking-tighter">{aliveCount} / {participants.length}</h3>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-indigo-50">
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Pot Size</p>
          <h3 className="text-2xl font-black text-green-600 uppercase tracking-tighter">${(participants.length * (pool.settings?.costPerBox || 0)).toLocaleString()}</h3>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] shadow-xl border border-indigo-50 overflow-hidden">
        <div className="p-8 border-b border-indigo-50 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-2xl font-black text-indigo-950 uppercase tracking-tighter">Survivor Leaderboard</h2>
            <p className="text-indigo-400 font-bold uppercase text-[9px] tracking-widest mt-1">One pick per week. Lose and you're out.</p>
          </div>
          
          <div className="flex bg-indigo-50 p-1.5 rounded-2xl">
            {[...Array(18)].map((_, i) => (
              <button 
                key={i} 
                onClick={() => setSelectedWeek(i + 1)}
                className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${selectedWeek === i + 1 ? 'bg-indigo-900 text-white shadow-md' : 'text-indigo-400 hover:bg-white'}`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-indigo-50/50">
                <th className="p-6 text-[10px] font-black text-indigo-400 uppercase tracking-widest">Participant</th>
                <th className="p-6 text-[10px] font-black text-indigo-400 uppercase tracking-widest text-center">Status</th>
                <th className="p-6 text-[10px] font-black text-indigo-400 uppercase tracking-widest">W1 Pick</th>
                <th className="p-6 text-[10px] font-black text-indigo-400 uppercase tracking-widest">W2 Pick</th>
                <th className="p-6 text-[10px] font-black text-indigo-400 uppercase tracking-widest">W3 Pick</th>
                <th className="p-6 text-[10px] font-black text-indigo-400 uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-50">
              {activeParticipants.map(participant => (
                <tr key={participant.id} className={`hover:bg-indigo-50/30 transition-colors ${participant.survivor.isEliminated ? 'opacity-60 grayscale' : ''}`}>
                  <td className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center font-black text-indigo-600">
                        {participant.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-black text-indigo-950 uppercase text-xs">{participant.name}</p>
                        <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">{participant.alias || 'No Alias'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-6 text-center">
                    {participant.survivor.isEliminated ? (
                      <span className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-[8px] font-black uppercase tracking-widest">Eliminated (W{participant.survivor.eliminatedWeek})</span>
                    ) : (
                      <span className="px-3 py-1 bg-green-100 text-green-600 rounded-full text-[8px] font-black uppercase tracking-widest">Active</span>
                    )}
                  </td>
                  {[1, 2, 3].map(w => {
                    const pick = participant.survivor.picks.find(p => p.week === w);
                    return (
                      <td key={w} className="p-6">
                        {pick ? (
                          <div className="flex items-center gap-2">
                             <span className="text-xs font-black text-indigo-950 uppercase">{pick.teamId}</span>
                             {pick.status === 'win' && <i className="fas fa-check-circle text-green-500 text-[10px]"></i>}
                             {pick.status === 'loss' && <i className="fas fa-times-circle text-red-500 text-[10px]"></i>}
                          </div>
                        ) : (
                          <span className="text-[10px] text-indigo-200 font-bold italic">No Pick</span>
                        )}
                      </td>
                    )
                  })}
                  <td className="p-6 text-right">
                    {!participant.survivor.isEliminated && (
                      <button className="px-4 py-2 bg-indigo-900 text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-black transition-all">Make Pick</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SurvivorEngine;
