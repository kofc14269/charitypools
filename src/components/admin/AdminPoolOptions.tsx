
import React, { useEffect, useState } from 'react';
import { Pool, PoolSettings, GlobalSettings, ThirteenRunData, SurvivorData } from '../../types';
import AdminAxisNumbers from './AdminAxisNumbers';

interface AdminPoolOptionsProps {
    activePool: Pool;
    poolSettings: PoolSettings;
    globalSettings: GlobalSettings;
    onUpdateActivePool: (updates: Partial<Pool>) => void;
    onUpdatePoolSettings: (updates: Partial<PoolSettings>) => void;
    onGenerateNumbers: () => void;
    handleLogoFile: (file: File, scope: 'global' | 'pool', team: 'A' | 'B') => Promise<void>;
    setAndValidateLogoUrl: (scope: 'global' | 'pool', team: 'A' | 'B', url: string) => Promise<boolean>;
    onOpenDraftBoard?: () => void;
}

const AdminPoolOptions: React.FC<AdminPoolOptionsProps> = ({
    activePool,
    poolSettings,
    globalSettings,
    onUpdateActivePool,
    onUpdatePoolSettings,
    onGenerateNumbers,
    handleLogoFile,
    setAndValidateLogoUrl,
    onOpenDraftBoard
}) => {
    const fileInputARef = React.useRef<HTMLInputElement>(null);
    const fileInputBRef = React.useRef<HTMLInputElement>(null);
    const [teamALogoInput, setTeamALogoInput] = useState(poolSettings.teamALogo || '');
    const [teamBLogoInput, setTeamBLogoInput] = useState(poolSettings.teamBLogo || '');
    const poolType = activePool.type || 'squares';

    useEffect(() => {
        setTeamALogoInput(poolSettings.teamALogo || '');
    }, [poolSettings.teamALogo]);

    useEffect(() => {
        setTeamBLogoInput(poolSettings.teamBLogo || '');
    }, [poolSettings.teamBLogo]);

    const isSquares = poolType === 'squares';
    const is13Run = poolType === '13run';
    const isSurvivor = poolType === 'survivor';
    const poolTypeLabel = String(poolType || 'squares').toUpperCase();

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between border-b border-indigo-50 pb-6">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-900 rounded-2xl flex items-center justify-center text-white text-xl shadow-xl">
                        <i className={`fas ${isSquares ? 'fa-th' : is13Run ? 'fa-baseball-ball' : 'fa-football-ball'}`}></i>
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-indigo-950 uppercase tracking-tighter leading-none">{poolTypeLabel} OPTIONS</h3>
                        <p className="text-indigo-300 font-bold uppercase text-[9px] tracking-widest mt-2 px-1">Active: {activePool.name}</p>
                    </div>
                </div>
                <div className="bg-indigo-50 px-6 py-3 rounded-2xl flex flex-col items-center">
                    <p className="text-[8px] font-black text-indigo-400 uppercase mb-1">Set Entry Cost</p>
                    <div className="flex items-center gap-1">
                        <span className="text-sm font-black text-indigo-300">$</span>
                        <input
                            title="Entry cost"
                            type="number"
                            value={poolSettings.costPerBox}
                            onChange={e => onUpdatePoolSettings({ costPerBox: Number(e.target.value) })}
                            className="w-16 bg-transparent border-none text-xl font-black text-indigo-950 focus:ring-0 p-0 text-center"
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* LEFT COLUMN: BASIC POOL DATA */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white p-6 rounded-[2rem] border border-indigo-50 shadow-sm space-y-4">
                        <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block">Contest Display Name</label>
                        <input
                            title="Contest display name"
                            value={activePool.name}
                            onChange={e => onUpdateActivePool({ name: e.target.value })}
                            className="w-full p-4 bg-indigo-50/50 rounded-xl font-black text-indigo-950 uppercase text-xs"
                        />
                    </div>

                    {/* CHARITY GOAL SECTION (MOVED TO OPTIONS) */}
                    <div className="bg-indigo-900 p-6 rounded-[2rem] text-white space-y-4 shadow-xl">
                        <label className="text-[10px] font-black text-indigo-300 uppercase tracking-widest block flex items-center gap-2">
                            <i className="fas fa-hand-holding-heart"></i> Charity Split
                        </label>
                        <div className="space-y-3">
                            <select
                                title="Charity split type"
                                value={poolSettings.payouts?.charityPayoutType || 'percent'}
                                onChange={e => onUpdatePoolSettings({ payouts: { ...(poolSettings.payouts || {}), charityPayoutType: e.target.value as any } })}
                                className="w-full p-3 bg-white/10 rounded-xl font-black uppercase text-[9px] border-none outline-none"
                            >
                                <option value="percent">Percentage of Pot</option>
                                <option value="fixed">Fixed Dollar Amount</option>
                            </select>
                            <div className="flex items-center gap-3">
                                {poolSettings.payouts?.charityPayoutType === 'fixed' ? (
                                    <input title="Charity fixed amount" type="number" value={poolSettings.payouts?.charityFixedAmount || 0} onChange={e => onUpdatePoolSettings({ payouts: { ...(poolSettings.payouts || {}), charityFixedAmount: Number(e.target.value) } })} className="flex-1 p-4 bg-white/10 rounded-xl font-black text-2xl text-center outline-none" />
                                ) : (
                                    <input title="Charity percentage" type="number" value={poolSettings.payouts?.charityPercent || 0} onChange={e => onUpdatePoolSettings({ payouts: { ...(poolSettings.payouts || {}), charityPercent: Number(e.target.value) } })} className="flex-1 p-4 bg-white/10 rounded-xl font-black text-2xl text-center outline-none" />
                                )}
                                <span className="text-xl font-black text-indigo-400">{poolSettings.payouts?.charityPayoutType === 'fixed' ? '$' : '%'}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: SPORT-SPECIFIC OPTIONS */}
                <div className="lg:col-span-2 space-y-8">

                    {/* SQUARES SPECIFIC TOOLS */}
                    {isSquares && (
                        <div className="space-y-8">
                            <div className="bg-white border border-indigo-50 p-8 rounded-[2.5rem] shadow-sm space-y-6">
                                <label className="text-[10px] font-black text-indigo-950 uppercase tracking-widest block mb-4 border-b pb-4 border-gray-50 flex items-center gap-2 font-black">
                                    <i className="fas fa-trophy text-indigo-400"></i> Grid Payout Structure
                                </label>
                                <div className="flex items-center gap-6">
                                    <select
                                        title="Payout mode"
                                        value={poolSettings.payouts?.mode || 'standard'}
                                        onChange={e => onUpdatePoolSettings({ payouts: { ...(poolSettings.payouts || {}), mode: e.target.value as any } })}
                                        className="p-4 rounded-xl bg-indigo-50/50 border-none font-bold outline-none text-indigo-950 uppercase text-[10px]"
                                    >
                                        <option value="standard">Standard (by Quarter)</option>
                                        <option value="scoreChange">Score Change (per change)</option>
                                        <option value="singleWinner">1 Winner (10×10 Grid)</option>
                                    </select>
                                </div>
                                {poolSettings.payouts?.mode === 'standard' ? (
                                    <div className="grid grid-cols-4 gap-4 pt-4 border-t border-gray-50">
                                        {['q1', 'half', 'q3', 'final'].map(q => (
                                            <div key={q} className="space-y-2">
                                                <label className="text-[9px] font-black text-indigo-300 uppercase block text-center">{q}</label>
                                                <input title={`${q} payout`} type="number" value={(poolSettings.payouts?.standardSplits as any)?.[q] || 0} onChange={e => onUpdatePoolSettings({ payouts: { ...(poolSettings.payouts || {}), standardSplits: { ...((poolSettings.payouts?.standardSplits as any) || {}), [q]: Number(e.target.value) } } })} className="w-full p-4 bg-gray-50 rounded-xl font-black text-center text-lg focus:ring-2 focus:ring-indigo-400 outline-none" />
                                            </div>
                                        ))}
                                    </div>
                                ) : poolSettings.payouts?.mode === 'scoreChange' ? (
                                    <div className="p-6 bg-indigo-50/30 rounded-2xl flex items-center gap-8">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-indigo-900 uppercase block">Multiplier</label>
                                            <input title="Score change multiplier" type="number" value={poolSettings.payouts?.scoreChangeMultiplier || 3} onChange={e => onUpdatePoolSettings({ payouts: { ...(poolSettings.payouts || {}), scoreChangeMultiplier: Number(e.target.value) } })} className="w-24 p-4 bg-white rounded-xl font-black text-center text-xl" />
                                        </div>
                                        <div className="flex items-center gap-3 pt-6">
                                            <input title="Enable 0-0 refund" type="checkbox" checked={!!poolSettings.payouts?.scoreChangeInitialRefund} onChange={e => onUpdatePoolSettings({ payouts: { ...(poolSettings.payouts || {}), scoreChangeInitialRefund: e.target.checked } })} className="w-6 h-6 rounded" />
                                            <label className="text-[9px] font-black text-indigo-900 uppercase">0-0 Refund</label>
                                        </div>
                                    </div>
                                ) : poolSettings.payouts?.mode === 'singleWinner' ? (
                                    <div className="p-6 bg-yellow-50 border border-yellow-100 rounded-2xl flex items-start gap-5">
                                        <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center text-white text-lg flex-shrink-0">
                                            <i className="fas fa-trophy"></i>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-yellow-900 uppercase tracking-widest">Winner Takes All</p>
                                            <p className="text-[9px] font-bold text-yellow-700 uppercase leading-relaxed">100% of the player pot goes to one winning square based on the final score. Use the 10×10 grid to assign boxes.</p>
                                        </div>
                                    </div>
                                ) : null}
                            </div>

                            <div className="bg-white border border-indigo-50 p-8 rounded-[2.5rem] shadow-sm">
                                <label className="text-[10px] font-black text-indigo-950 uppercase tracking-widest block mb-4 border-b pb-4 border-gray-50 flex items-center gap-2 font-black">
                                    <i className="fas fa-sort-numeric-down text-indigo-400"></i> Grid Number Tools
                                </label>
                                <AdminAxisNumbers
                                    poolSettings={poolSettings}
                                    onUpdatePoolSettings={onUpdatePoolSettings}
                                    onGenerateNumbers={onGenerateNumbers}
                                />
                            </div>

                            {/* CONTEST RULES */}
                            <div className="bg-white border border-indigo-50 p-8 rounded-[2.5rem] shadow-sm space-y-6">
                                <div className="flex items-center justify-between border-b pb-4 border-gray-50">
                                    <label className="text-[10px] font-black text-indigo-950 uppercase tracking-widest flex items-center gap-2 font-black">
                                        <i className="fas fa-scroll text-indigo-400"></i> Contest Rules
                                    </label>
                                    <span className="text-gray-300 font-bold uppercase text-[8px] italic">Only applies to this contest</span>
                                </div>
                                <textarea
                                    title="Contest rules"
                                    rows={6}
                                    value={poolSettings.rules || ''}
                                    onChange={e => onUpdatePoolSettings({ rules: e.target.value })}
                                    placeholder="Enter rules specific to this contest...&#10;&#10;• Payouts: Q1 25%, Half 25%, Q3 25%, Final 25%&#10;• Grid numbers are randomized after all entries are confirmed"
                                    className="w-full p-6 bg-slate-50 border-none rounded-3xl font-medium text-slate-800 text-sm outline-none focus:ring-4 focus:ring-indigo-500/5 leading-relaxed placeholder:text-slate-300"
                                />
                                <div className="p-4 bg-amber-50/50 rounded-2xl flex items-center gap-4">
                                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-amber-500 flex-shrink-0">
                                        <i className="fas fa-lightbulb"></i>
                                    </div>
                                    <p className="text-[10px] font-bold text-amber-700 uppercase tracking-tight">Tip: Use bullet points for a professional look.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 13-RUN SPECIFIC OPTIONS */}
                    {is13Run && (
                        <div className="bg-white border border-indigo-50 p-8 rounded-[2.5rem] shadow-sm space-y-8">
                            <label className="text-[10px] font-black text-indigo-950 uppercase tracking-widest block mb-4 border-b pb-4 border-gray-50 flex items-center gap-2 font-black">
                                <i className="fas fa-baseball-ball text-indigo-400"></i> MLB Contest Rules
                            </label>
                            <div className="p-8 bg-indigo-50 border border-indigo-100 rounded-3xl items-center text-center space-y-4">
                                <div className="w-16 h-16 bg-white rounded-2xl mx-auto flex items-center justify-center text-indigo-900 text-2xl shadow-sm">
                                    <i className="fas fa-random"></i>
                                </div>
                                <h4 className="text-xl font-black text-indigo-950 uppercase">Ready for Randomization?</h4>
                                <p className="text-indigo-400 text-xs font-bold uppercase tracking-tighter max-w-sm mx-auto">Once your 30 participants are confirmed, use the Draft Board to randomly shuffle them across all MLB teams.</p>
                                <button type="button" onClick={onOpenDraftBoard} className="px-8 py-3 bg-indigo-900 text-white rounded-xl font-black uppercase text-[10px]">Go to Draft Board</button>
                            </div>
                        </div>
                    )}




                    {/* LOGO OVERRIDES (FOR ALL SPORTS) */}
                    <div className="bg-white border border-indigo-50 p-8 rounded-[2.5rem] shadow-sm space-y-6">
                        <label className="text-[10px] font-black text-indigo-950 uppercase tracking-widest block border-b pb-4 border-gray-50 flex items-center gap-2 font-black">
                            <i className="fas fa-paint-brush text-indigo-400"></i> Visual Overrides
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {['A', 'B'].map((team) => (
                                <div key={team} className="space-y-3">
                                    <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block">Team {team} Overwrite</label>
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center overflow-hidden border border-gray-100">
                                            {(poolSettings as any)[`team${team}Logo`] ? (
                                                <img src={(poolSettings as any)[`team${team}Logo`]} alt={`Team ${team} logo`} className="w-full h-full object-contain" />
                                            ) : <i className="fas fa-image text-gray-200"></i>}
                                        </div>
                                        <div className="flex-1 flex gap-2">
                                            <input title={`Upload team ${team} logo`} ref={team === 'A' ? fileInputARef : fileInputBRef} type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoFile(f, 'pool', team as 'A' | 'B'); e.currentTarget.value = ''; }} className="hidden" />
                                            <button onClick={() => (team === 'A' ? fileInputARef : fileInputBRef).current?.click()} className="flex-1 py-3 bg-indigo-50 text-indigo-900 rounded-xl font-black uppercase text-[8px] shadow-sm">Upload</button>
                                            {(poolSettings as any)[`team${team}Logo`] && <button onClick={() => onUpdatePoolSettings({ [`team${team}Logo`]: '' })} className="px-3 bg-red-50 text-red-500 rounded-xl font-black uppercase text-[8px]">X</button>}
                                        </div>
                                    </div>
                                    <input
                                        title={`Team ${team} logo URL`}
                                        value={team === 'A' ? teamALogoInput : teamBLogoInput}
                                        onChange={e => team === 'A' ? setTeamALogoInput(e.target.value) : setTeamBLogoInput(e.target.value)}
                                        onBlur={async () => {
                                            const currentValue = team === 'A' ? teamALogoInput : teamBLogoInput;
                                            const saved = await setAndValidateLogoUrl('pool', team as 'A' | 'B', currentValue);
                                            if (!saved) {
                                                if (team === 'A') setTeamALogoInput(poolSettings.teamALogo || '');
                                                else setTeamBLogoInput(poolSettings.teamBLogo || '');
                                            }
                                        }}
                                        className="w-full p-3 bg-indigo-50 border-none rounded-xl text-[10px] font-bold outline-none"
                                        placeholder="https://.../logo.png"
                                    />
                                </div>
                            ))}
                        </div>
                        <p className="text-[9px] font-bold text-gray-300 uppercase italic">Leave blank to use the default organization logo.</p>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default AdminPoolOptions;
