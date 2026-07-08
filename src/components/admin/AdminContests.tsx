import React from 'react';
import { Pool, PoolType } from '../../types';

interface AdminContestsProps {
  pools: Pool[];
  activePoolId: string;
  showCreateForm: boolean;
  setShowCreateForm: (v: boolean) => void;
  newPoolData: { name: string; type: PoolType; teamA: string; teamB: string; costPerBox: number };
  setNewPoolData: (d: any) => void;
  handleCreatePool: (e: React.FormEvent) => void;
  onSwitchPool: (id: string) => void;
  onDeletePool: (id: string) => void;
}

const AdminContests: React.FC<AdminContestsProps> = ({
  pools, activePoolId, showCreateForm, setShowCreateForm, newPoolData, setNewPoolData, handleCreatePool, onSwitchPool, onDeletePool
}) => {
  // Virtual type used only in the creation form UI — translated to 'squares' + singleWinner settings on submit
  const isSquaresType = newPoolData.type === 'squares' || (newPoolData.type as string) === 'squares-1w';
  const createTypeLabel = String(newPoolData.type || 'squares').toUpperCase();

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-black text-indigo-900 uppercase">Active Contests</h3>
        <button onClick={() => setShowCreateForm(!showCreateForm)} className="bg-indigo-900 text-white px-6 py-3 rounded-xl font-black uppercase text-[10px] shadow-lg shadow-indigo-100"><i className={`fas ${showCreateForm ? 'fa-times' : 'fa-plus'} mr-2`}></i> {showCreateForm ? 'Cancel' : 'New Contest'}</button>
      </div>

      {showCreateForm ? (
        <form onSubmit={handleCreatePool} className="bg-indigo-50 p-8 rounded-3xl border border-indigo-100 space-y-6 animate-in slide-in-from-top-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-[9px] font-black text-indigo-400 uppercase block mb-1">Contest Type</label>
              <select
                title="Contest type"
                value={newPoolData.type}
                onChange={e => setNewPoolData({ ...newPoolData, type: e.target.value as PoolType })}
                className="w-full p-4 bg-white rounded-xl font-black outline-none border-2 border-transparent focus:border-indigo-500 transition-all text-xs"
              >
                <option value="squares">Squares Grid (10x10) — 4 Winners</option>
                <option value="squares-1w">Single Winner Grid (10x10) — 1 Winner</option>
                <option value="survivor">NFL Survivor (Last Person Standing)</option>
                <option value="13run">MLB 13-Run (Run Count Punch-Card)</option>
                <option value="pickem">NFL Pick'em (Weekly Winners)</option>
              </select>
            </div>
            <div><label className="text-[9px] font-black text-indigo-400 uppercase block mb-1">Contest Name</label><input title="Contest name" required value={newPoolData.name} onChange={e => setNewPoolData({ ...newPoolData, name: e.target.value })} className="w-full p-4 bg-white rounded-xl font-bold outline-none" placeholder="e.g. 2025 Big Game" /></div>
            <div><label className="text-[9px] font-black text-indigo-400 uppercase block mb-1">Entry Cost ($)</label><input title="Entry cost" type="number" required value={newPoolData.costPerBox} onChange={e => setNewPoolData({ ...newPoolData, costPerBox: Number(e.target.value) })} className="w-full p-4 bg-white rounded-xl font-bold outline-none" /></div>

            {isSquaresType && (
              <>
                <div><label className="text-[9px] font-black text-indigo-400 uppercase block mb-1">Vertical Team (Rows)</label><input title="Vertical team rows" required value={newPoolData.teamA} onChange={e => setNewPoolData({ ...newPoolData, teamA: e.target.value })} className="w-full p-4 bg-white rounded-xl font-bold outline-none" /></div>
                <div><label className="text-[9px] font-black text-indigo-400 uppercase block mb-1">Horizontal Team (Cols)</label><input title="Horizontal team columns" required value={newPoolData.teamB} onChange={e => setNewPoolData({ ...newPoolData, teamB: e.target.value })} className="w-full p-4 bg-white rounded-xl font-bold outline-none" /></div>
              </>
            )}
          </div>
          <button type="submit" className="w-full py-4 bg-indigo-900 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-black transition-all">
            Initialize {(newPoolData.type as string) === 'squares-1w' ? 'Single Winner Grid' : newPoolData.type === 'squares' ? 'Squares' : createTypeLabel}
          </button>
        </form>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pools.map(p => {
            const contestType = String(p.type || 'squares');
            const contestTypeLabel = contestType.toUpperCase();
            // Detect single-winner squares via payout mode
            const isSingleWinner = contestType === 'squares' && p.settings?.payouts?.mode === 'singleWinner';
            const displayLabel = isSingleWinner ? '1-WINNER' : contestTypeLabel;
            return (
              <div key={p.id} className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${p.id === activePoolId ? 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-500/20' : 'bg-gray-50 border-gray-100'}`}>
                <div className="truncate pr-4">
                  <p className="font-black text-indigo-900 uppercase text-[10px] items-center gap-2 flex mb-1 truncate">
                   <span className={`w-2 h-2 rounded-full ${contestType === 'survivor' ? 'bg-orange-500' : contestType === '13run' ? 'bg-red-500' : isSingleWinner ? 'bg-yellow-500' : 'bg-indigo-500'}`}></span>
                    {(p.name || 'Untitled Pool').toUpperCase()}
                    <span className="text-[7px] bg-indigo-100 text-indigo-500 px-1.5 py-0.5 rounded-full">{displayLabel}</span>
                  </p>
                  <p className="text-[8px] font-bold text-gray-400 uppercase truncate">
                    {contestType === 'squares' ? `${p.settings?.teamA || 'NFC'} vs ${p.settings?.teamB || 'AFC'}` : contestTypeLabel} • ${p.settings?.costPerBox || 0} / Entry
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {p.id !== activePoolId && <button onClick={() => onSwitchPool(p.id)} className="px-4 py-2 bg-indigo-900 text-white rounded-lg text-[8px] font-black uppercase">Select</button>}
                  <button title="Delete contest" onClick={() => onDeletePool(p.id)} className="w-8 h-8 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all"><i className="fas fa-trash-alt text-[10px]"></i></button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  );
};
export default AdminContests;
