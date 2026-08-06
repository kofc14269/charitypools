import React from 'react';
import { Pool, PoolType } from '../types';

interface PoolPortalProps {
  pools: Pool[];
  onSelectPool: (poolId: string) => void;
}

const getPoolIcon = (type: PoolType) => {
  switch (type) {
    case 'survivor': return 'fa-football-ball text-orange-500';
    case '13run': return 'fa-baseball-ball text-red-500';
    case 'squares': return 'fa-th text-indigo-500';
    case 'pickem': return 'fa-check-double text-emerald-500';
    default: return 'fa-trophy text-yellow-500';
  }
};

const getPoolTypeLabel = (type: PoolType) => {
  switch (type) {
    case 'survivor': return 'NFL Survivor';
    case '13run': return '13-Run Baseball';
    case 'squares': return 'Grid Squares';
    case 'pickem': return 'Pick\'em';
    default: return 'Contest';
  }
};

const PoolPortal: React.FC<PoolPortalProps> = ({ pools, onSelectPool }) => {
  // Sort pools to show active ones first, maybe by creation date
  const sortedPools = [...pools].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center py-12 px-4 animate-in fade-in duration-500">
      <div className="text-center mb-16">
        <div className="w-24 h-24 mx-auto bg-indigo-900 rounded-3xl flex items-center justify-center text-white text-4xl mb-8 shadow-2xl shadow-indigo-900/30 transform rotate-3">
          <i className="fas fa-ticket-alt -rotate-3"></i>
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-indigo-950 uppercase tracking-tighter mb-4">
          Contest Portal
        </h1>
        <p className="max-w-xl mx-auto text-indigo-400/80 font-bold uppercase text-[10px] md:text-xs tracking-[0.2em] leading-relaxed">
          Select an active pool below to view the board, enter your picks, or check the latest standings.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl w-full">
        {sortedPools.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white rounded-[2rem] border-2 border-dashed border-indigo-100">
            <i className="fas fa-calendar-times text-4xl text-indigo-200 mb-4"></i>
            <h3 className="text-xl font-black text-indigo-900 uppercase">No Active Contests</h3>
            <p className="text-indigo-400 font-bold uppercase text-[10px] tracking-widest mt-2">Check back later for new pools!</p>
          </div>
        ) : (
          sortedPools.map(pool => (
            <button
              key={pool.id}
              onClick={() => onSelectPool(pool.id)}
              className="group relative bg-white p-8 rounded-[2rem] border border-indigo-50 shadow-xl hover:shadow-2xl transition-all duration-300 text-left overflow-hidden transform hover:-translate-y-2 flex flex-col h-full"
            >
              {/* Background Accent */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-[100px] -z-10 transition-transform group-hover:scale-110"></div>
              
              <div className="flex justify-between items-start mb-6">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-md bg-white border border-gray-100 group-hover:scale-110 transition-transform`}>
                  <i className={`fas ${getPoolIcon(pool.type)}`}></i>
                </div>
                {pool.settings?.isLocked ? (
                  <span className="bg-red-50 text-red-600 px-3 py-1.5 rounded-xl font-black uppercase text-[9px] tracking-widest border border-red-100 flex items-center gap-1.5">
                    <i className="fas fa-lock"></i> Locked
                  </span>
                ) : (
                  <span className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-xl font-black uppercase text-[9px] tracking-widest border border-emerald-100 flex items-center gap-1.5">
                    <i className="fas fa-door-open"></i> Open
                  </span>
                )}
              </div>

              <div className="mb-8 flex-1">
                <div className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-2 flex items-center gap-2">
                  <span>{getPoolTypeLabel(pool.type)}</span>
                  <span className="w-1 h-1 rounded-full bg-indigo-200"></span>
                  <span>${pool.settings?.costPerBox || 0}/Entry</span>
                </div>
                <h3 className="text-2xl font-black text-indigo-950 uppercase leading-tight line-clamp-2">
                  {pool.name}
                </h3>
              </div>

              <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-indigo-600 group-hover:text-indigo-900 transition-colors">
                <span>View Contest</span>
                <i className="fas fa-arrow-right ml-2 transform group-hover:translate-x-2 transition-transform"></i>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default PoolPortal;
