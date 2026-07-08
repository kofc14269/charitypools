
import React from 'react';
import { Pool, ThirteenRunData, Participant } from '../types';
import { MLB_TEAMS } from '../constants/sports';

interface ThirteenRunEngineProps {
  pool: Pool;
  participants: Participant[];
  isAdmin: boolean;
  onUpdateGameData: (data: Partial<ThirteenRunData>) => void;
  liveScores?: any;
  onTeamClick?: (teamId: string) => void;
}

const ThirteenRunEngine: React.FC<ThirteenRunEngineProps> = ({ pool, participants, isAdmin, onUpdateGameData, liveScores, onTeamClick }) => {
  const gameData = pool.gameData as ThirteenRunData;
  const entries = gameData?.entries || {};

  // Map all teams, whether assigned or not
  const allEntries = MLB_TEAMS.map(team => {
    const entry = entries[team.id];
    const participant = participants.find(p => p.id === entry?.participantId);
    return {
      team,
      entry,
      participant
    };
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-indigo-50">
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Objective</p>
          <h3 className="text-xl font-black text-indigo-950 uppercase tracking-tighter">Score every run total (0-13)</h3>
          <p className="text-indigo-400 font-bold uppercase text-[9px] mt-2">The first team to punch all 14 categories wins the pot!</p>
        </div>
        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-indigo-50">
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Current Pot</p>
          <h3 className="text-3xl font-black text-green-600 uppercase tracking-tighter">
            ${(Object.values(entries).filter(e => e.participantId).length * (pool.settings?.costPerBox || 10)).toLocaleString()}
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {allEntries.map(({ team, entry, participant }) => (
          <div key={team.id} className={`bg-white rounded-[2.5rem] shadow-xl border overflow-hidden flex flex-col transition-all ${entry?.isWinner ? 'border-emerald-200 bg-emerald-50/20' : 'border-indigo-50'}`}>
            <div className={`p-6 border-b border-indigo-50 flex items-center justify-between ${participant ? 'bg-indigo-50/30' : 'bg-gray-50/50'}`}>
               <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 bg-white rounded-2xl flex items-center justify-center font-black shadow-sm border ${participant ? 'text-indigo-600 border-indigo-100' : 'text-gray-300 border-gray-100'}`}>
                    {team.id}
                  </div>
                  <div>
                    <h4 className={`text-sm font-black uppercase ${participant ? 'text-indigo-950' : 'text-gray-400'}`}>
                      {participant ? (participant.alias || participant.name).toUpperCase() : 'Available Team'}
                    </h4>
                    <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest">{team.name}</p>
                  </div>
               </div>
               {participant && (
                 <div className="text-right">
                    <p className="text-[10px] font-black text-indigo-950 uppercase">{entry?.punches?.length || 0} / 14</p>
                    <p className="text-[8px] font-bold text-indigo-400 uppercase tracking-widest">Punches</p>
                 </div>
               )}
            </div>
            
            <div className="p-8 flex-1 flex flex-col">
              {participant ? (
                <div className="grid grid-cols-7 gap-3">
                  {[0,1,2,3,4,5,6,7,8,9,10,11,12,13].map((num) => {
                    const hasPunch = entry?.punches?.includes(num);
                    return (
                      <div 
                        key={num} 
                        className={`aspect-square rounded-xl flex flex-col items-center justify-center border-2 transition-all ${hasPunch 
                          ? 'bg-indigo-900 border-indigo-900 text-white shadow-lg' 
                          : 'bg-white border-indigo-50 text-indigo-200'
                        }`}
                      >
                        <span className="text-[10px] font-black leading-none">{num}</span>
                        {hasPunch && <i className="fas fa-check text-[7px] mt-1 text-amber-400"></i>}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
                  <button 
                    onClick={() => onTeamClick?.(team.id)}
                    className="group relative px-8 py-4 bg-indigo-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl hover:bg-black transition-all transform hover:scale-105"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                       <i className="fas fa-plus-circle"></i>
                       Enter Contest
                    </span>
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"></div>
                  </button>
                  <p className="mt-4 text-[8px] font-black text-indigo-300 uppercase tracking-widest">Select {team.name} to start your run</p>
                </div>
              )}
            </div>

            {isAdmin && participant && (
              <div className="px-8 pb-8 flex gap-2">
                <p className="text-[9px] font-black text-indigo-300 uppercase italic">Admin: Auto-punched from live scores</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ThirteenRunEngine;
