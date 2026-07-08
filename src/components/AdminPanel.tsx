
import React, { useState, useMemo } from 'react';
import { PoolSettings, GlobalSettings, Square, Pool, Participant, ScoreEntry, PoolType, ThirteenRunData, ThirteenRunEntry } from '../types';
import { MLB_TEAMS } from '../constants/sports';
import { fileToDataUrl, validateImageUrl, optimizeImage } from '../utils/image';
import Stats from './Stats';
import Winners from './Winners';
import AdminOverview from './admin/AdminOverview';
import AdminContests from './admin/AdminContests';
import AdminGlobalSettings from './admin/AdminGlobalSettings';
import AdminPoolOptions from './admin/AdminPoolOptions';
import { calculateFinancialSummary } from '../utils/finance';

type AdminSection = 'overview' | 'pools' | 'options' | 'participants' | 'winners' | 'stats' | 'branding' | 'danger';

interface AdminPanelProps {
  ownerUid: string;
  pools: Pool[];
  activePoolId: string;
  activePool: Pool | null;
  poolSettings: PoolSettings;
  globalSettings: GlobalSettings;
  onUpdateActivePool: (updates: Partial<Pool>) => void;
  onUpdatePoolSettings: (updates: Partial<PoolSettings>) => void;
  onUpdateGlobalSettings: (updates: Partial<GlobalSettings>) => void;
  onUpdateSquare: (squareId: number, updates: Partial<Square>) => void;
  onUpdateParticipant: (participantId: string, updates: Partial<Participant>) => void;
  onUnassignSquare: (squareId: number) => void;
  onClearUserBoxes: (participantId: string) => void;
  onApplyPayment: (participantId: string, amount: number, method: string) => void;
  onEditPayment: (participantId: string, transactionId: string, amount: number, method: string) => void;
  onDeletePayment: (participantId: string, transactionId: string) => void;
  onResetGrid: () => void;
  onAddScore: (score: ScoreEntry) => void;
  onUpdateScore: (score: ScoreEntry) => void;
  onDeleteScore: (scoreId: string) => void;
  onCreatePool: (name: string, type: PoolType, settings: Partial<PoolSettings>) => void;
  onDeletePool: (poolId: string) => void;
  onSwitchPool: (poolId: string) => void;
  onCreateGlobalParticipant: (p: Participant) => void;
  onGenerateNumbers: () => void;
  squares: Square[];
  participants: Participant[];
  allParticipants: Participant[];
  scores: ScoreEntry[];
}

const AdminPanel: React.FC<AdminPanelProps> = ({
  ownerUid,
  pools,
  activePoolId,
  activePool,
  poolSettings,
  globalSettings,
  onUpdateActivePool,
  onUpdatePoolSettings,
  onUpdateGlobalSettings,
  onUpdateSquare,
  onUpdateParticipant,
  onUnassignSquare,
  onClearUserBoxes,
  onApplyPayment,
  onEditPayment,
  onDeletePayment,
  onResetGrid,
  onAddScore,
  onUpdateScore,
  onDeleteScore,
  onCreatePool,
  onDeletePool,
  onSwitchPool,
  onCreateGlobalParticipant,
  onGenerateNumbers,
  squares,
  participants,
  allParticipants,
  scores
}) => {
  const [activeSection, setActiveSection] = useState<AdminSection>('overview');
  const [showAddNameForm, setShowAddNameForm] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingParticipantId, setEditingParticipantId] = useState<string | null>(null);
  const [newNameData, setNewNameData] = useState({ name: '', email: '', phone: '', alias: '' });
  const [newPoolData, setNewPoolData] = useState({ name: '', type: 'squares' as PoolType, teamA: 'Team A', teamB: 'Team B', costPerBox: 10 });

  const financialSummary = useMemo(() => {
    return calculateFinancialSummary(activePool, poolSettings, scores, squares);
  }, [poolSettings, activePool, scores, squares]);

  const handleCreatePool = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPoolData.name.trim()) return;

    const targetType = newPoolData.type === 'squares-1w' ? 'squares' : newPoolData.type;
    const settingsOverride: Partial<PoolSettings> = {
      teamA: newPoolData.teamA,
      teamB: newPoolData.teamB,
      costPerBox: newPoolData.costPerBox,
    };

    if (newPoolData.type === 'squares-1w') {
      settingsOverride.payouts = {
        mode: 'singleWinner',
        standardPayoutType: 'percent',
        charityPayoutType: 'percent',
        charityPercent: 50,
        charityFixedAmount: 500,
        standardSplits: { q1: 20, half: 30, q3: 20, final: 30 },
        scoreChangeMultiplier: 3,
        scoreChangeAppliesTo: 'perBox',
        scoreChangeInitialRefund: true,
      };
    }

    onCreatePool(newPoolData.name, targetType, settingsOverride);
    setShowCreateForm(false);
  };

  const handleAddName = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNameData.name.trim()) return;

    const participantPayload = {
      name: newNameData.name.trim(),
      email: newNameData.email.trim(),
      phone: newNameData.phone.trim(),
      alias: newNameData.alias.trim().toUpperCase(),
    };

    if (editingParticipantId) {
      onUpdateParticipant(editingParticipantId, participantPayload);
      setEditingParticipantId(null);
      setNewNameData({ name: '', email: '', phone: '', alias: '' });
      setShowAddNameForm(false);
      return;
    }

    onCreateGlobalParticipant({
      id: crypto.randomUUID(),
      ...participantPayload,
      paymentHistory: []
    });
    setNewNameData({ name: '', email: '', phone: '', alias: '' });
    setShowAddNameForm(false);
  };

  const handleEditParticipant = (participant: Participant) => {
    setEditingParticipantId(participant.id);
    setNewNameData({
      name: participant.name || '',
      email: participant.email || '',
      phone: participant.phone || '',
      alias: participant.alias || ''
    });
    setShowAddNameForm(true);
  };

  const handleCancelParticipantForm = () => {
    setEditingParticipantId(null);
    setNewNameData({ name: '', email: '', phone: '', alias: '' });
    setShowAddNameForm(false);
  };

  const handleRandomize13Run = () => {
    if (!activePool || activePool.type !== '13run') return;
    if (!window.confirm('Randomly assign participants to MLB teams? Current assignments will be overwritten.')) return;

    const poolParticipants = activePool.participants || [];
    if (poolParticipants.length === 0) {
      alert('Add participants first before randomizing!');
      return;
    }

    const shuffled = [...poolParticipants].sort(() => Math.random() - 0.5);
    const newEntries: { [key: string]: ThirteenRunEntry } = {};

    MLB_TEAMS.forEach((team, idx) => {
      newEntries[team.id] = {
        teamId: team.id,
        teamName: team.name,
        punches: (activePool.gameData as ThirteenRunData)?.entries?.[team.id]?.punches || [],
        isWinner: (activePool.gameData as ThirteenRunData)?.entries?.[team.id]?.isWinner || false,
        participantId: shuffled[idx]?.id || null
      };
    });

    onUpdateActivePool({ gameData: { entries: newEntries } });
  };

  const handleLogoFile = async (file: File, scope: 'global' | 'pool', team: 'A' | 'B') => {
    const optimized = await optimizeImage(file);
    const dataUrl = await fileToDataUrl(optimized);
    if (scope === 'global') {
      onUpdateGlobalSettings(team === 'A' ? { teamALogo: dataUrl } : { teamBLogo: dataUrl });
      return;
    }

    onUpdatePoolSettings(team === 'A' ? { teamALogo: dataUrl } : { teamBLogo: dataUrl });
  };

  const setAndValidateLogoUrl = async (scope: 'global' | 'pool', team: 'A' | 'B', url: string) => {
    const ok = await validateImageUrl(url);
    if (!ok && !window.confirm('Image failed to load. Save the URL anyway?')) return false;

    if (scope === 'global') {
      onUpdateGlobalSettings(team === 'A' ? { teamALogo: url } : { teamBLogo: url });
      return true;
    }

    onUpdatePoolSettings(team === 'A' ? { teamALogo: url } : { teamBLogo: url });
    return true;
  };

  const isSquares = activePool?.type === 'squares';

  const menuItems: Array<{ id: AdminSection; label: string; icon: string }> = [
    { id: 'overview', label: 'Overview', icon: 'fa-th-large' },
    { id: 'pools', label: 'Contests', icon: 'fa-gamepad' },
    { id: 'options', label: isSquares ? 'Squares Options' : 'Pool Options', icon: 'fa-sliders-h' },
    { id: 'participants', label: activePool?.type === '13run' ? 'Draft Board' : 'Names & Teams', icon: 'fa-users' },
    { id: 'winners', label: 'Winners', icon: 'fa-trophy' },
    { id: 'stats', label: 'Participants', icon: 'fa-chart-bar' },
    { id: 'branding', label: 'Organization & Style', icon: 'fa-palette' },
    { id: 'danger', label: 'Danger Zone', icon: 'fa-exclamation-triangle' },
  ];

  return (
    <div className="relative pt-20">
      <div className="max-w-7xl mx-auto px-4 md:px-8">

        {/* BANNER HEADER */}
        <div className="relative z-10 -mt-10 mb-12">
          <div className="bg-indigo-900 rounded-[2.5rem] p-8 shadow-2xl border border-indigo-800 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden">
            <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-l from-indigo-800/50 to-transparent pointer-events-none"></div>
            <div className="flex items-center gap-6 relative z-10">
              <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-indigo-950 font-black text-2xl shadow-xl">CP</div>
              <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">Admin Control Panel</h2>
                <p className="text-indigo-300 font-bold uppercase text-[10px] tracking-[0.2em] mt-2">Master Manager: {globalSettings.charityName || 'Charity Suite'}</p>
              </div>
            </div>
            <button onClick={() => window.location.reload()} className="px-8 py-4 bg-indigo-800 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-black transition-all border border-indigo-700 relative z-10 shadow-lg">Refresh Data</button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8 pb-20">
          <aside className="w-full lg:w-64 flex-shrink-0">
            <nav className="bg-white rounded-[2.5rem] p-4 shadow-xl border border-indigo-50 flex flex-col gap-2">
              {menuItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`flex items-center gap-4 px-6 py-4 rounded-[1.5rem] font-black uppercase text-[10px] tracking-wider transition-all ${activeSection === item.id ? 'bg-indigo-900 text-white shadow-lg' : 'text-indigo-400 hover:bg-indigo-50 hover:text-indigo-900'}`}
                >
                  <i className={`fas ${item.icon} w-5 text-center text-[12px]`}></i>
                  {item.label}
                </button>
              ))}
            </nav>
          </aside>

          <main className="flex-1 min-w-0 bg-white rounded-[3rem] p-10 shadow-2xl border border-indigo-50">
            {activeSection === 'overview' && <AdminOverview financialSummary={financialSummary} ownerUid={ownerUid} activePoolId={activePoolId} pools={pools} />}

            {activeSection === 'pools' && (
              <AdminContests
                pools={pools} activePoolId={activePoolId}
                showCreateForm={showCreateForm} setShowCreateForm={setShowCreateForm}
                newPoolData={newPoolData} setNewPoolData={setNewPoolData}
                handleCreatePool={handleCreatePool} onSwitchPool={onSwitchPool} onDeletePool={onDeletePool}
              />
            )}

            {activeSection === 'participants' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black text-indigo-950 uppercase tracking-tighter">
                    {activePool?.type === '13run' ? 'Draft Board' : 'Manage Participants'}
                  </h3>
                  <div className="flex gap-3">
                    {activePool?.type === '13run' && (
                      <button onClick={handleRandomize13Run} className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all">
                        <i className="fas fa-random mr-2"></i> Randomize Teams
                      </button>
                    )}
                    <button onClick={() => showAddNameForm ? handleCancelParticipantForm() : setShowAddNameForm(true)} className="bg-indigo-900 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] shadow-lg hover:bg-black transition-all">
                      <i className={`fas ${showAddNameForm ? 'fa-times' : 'fa-plus'} mr-2`}></i> {showAddNameForm ? 'Cancel' : 'Add Person'}
                    </button>
                  </div>
                </div>

                {showAddNameForm && (
                  <form onSubmit={handleAddName} className="bg-indigo-50 p-8 rounded-[2rem] border border-indigo-100 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><label className="text-[9px] font-black text-indigo-400 uppercase block mb-1">Full Name</label><input title="Full name" required value={newNameData.name} onChange={e => setNewNameData({ ...newNameData, name: e.target.value })} className="w-full p-4 bg-white rounded-xl font-bold outline-none border-2 border-transparent focus:border-indigo-400 transition-all" /></div>
                      <div><label className="text-[9px] font-black text-indigo-400 uppercase block mb-1">Email</label><input title="Email" type="email" value={newNameData.email} onChange={e => setNewNameData({ ...newNameData, email: e.target.value })} className="w-full p-4 bg-white rounded-xl font-bold outline-none border-2 border-transparent focus:border-indigo-400 transition-all" /></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div><label className="text-[9px] font-black text-indigo-400 uppercase block mb-1">Phone</label><input title="Phone" value={newNameData.phone} onChange={e => setNewNameData({ ...newNameData, phone: e.target.value })} className="w-full p-4 bg-white rounded-xl font-bold outline-none border-2 border-transparent focus:border-indigo-400 transition-all" /></div>
                      <div><label className="text-[9px] font-black text-indigo-400 uppercase block mb-1">Alias</label><input title="Alias" value={newNameData.alias} onChange={e => setNewNameData({ ...newNameData, alias: e.target.value.toUpperCase() })} className="w-full p-4 bg-white rounded-xl font-bold outline-none border-2 border-transparent focus:border-indigo-400 transition-all uppercase" /></div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button type="submit" className="flex-1 py-4 bg-indigo-900 text-white rounded-xl font-black uppercase text-xs tracking-widest shadow-xl">{editingParticipantId ? 'Update Entry' : 'Complete Entry'}</button>
                      {editingParticipantId && <button type="button" onClick={handleCancelParticipantForm} className="sm:w-auto px-6 py-4 bg-white text-indigo-900 rounded-xl font-black uppercase text-xs tracking-widest border border-indigo-100">Cancel Edit</button>}
                    </div>
                  </form>
                )}

                {activePool?.type === '13run' ? (
                  <div className="bg-indigo-50/30 rounded-[2rem] border border-indigo-50 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-indigo-100">
                            <th className="px-6 py-4 text-[10px] font-black text-indigo-400 uppercase">MLB Team</th>
                            <th className="px-6 py-4 text-[10px] font-black text-indigo-400 uppercase">Participant Assignment</th>
                            <th className="px-6 py-4 text-[10px] font-black text-indigo-400 uppercase text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {MLB_TEAMS.map((team) => {
                            const entry = (activePool.gameData as ThirteenRunData)?.entries?.[team.id];
                            return (
                              <tr key={team.id} className="border-b border-indigo-50 hover:bg-white transition-all">
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center font-black text-indigo-900 text-[10px] shadow-sm">{team.id}</div>
                                    <div className="font-black text-indigo-900 uppercase text-xs">{team.name}</div>
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <select
                                    title="Participant assignment"
                                    value={entry?.participantId || ''}
                                    onChange={(e) => {
                                      const newEntries = { ...((activePool.gameData as ThirteenRunData)?.entries || {}) };
                                      newEntries[team.id] = { ...(newEntries[team.id] || { teamId: team.id, teamName: team.name, punches: [], isWinner: false }), participantId: e.target.value || null };
                                      onUpdateActivePool({ gameData: { entries: newEntries } });
                                    }}
                                    className="w-full bg-white px-4 py-2 rounded-xl text-xs font-black text-indigo-900 border-none outline-none shadow-sm focus:ring-2 focus:ring-indigo-400"
                                  >
                                    <option value="">-- UNASSIGNED --</option>
                                    {activePool.participants.map(p => <option key={p.id} value={p.id}>{p.alias ? `${p.name} (${p.alias})` : p.name}</option>)}
                                  </select>
                                </td>
                                <td className="px-6 py-4 text-center">
                                  {entry?.participantId ? <i className="fas fa-check-circle text-emerald-500"></i> : <i className="fas fa-clock text-indigo-100"></i>}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="bg-indigo-50/30 rounded-[2rem] border border-indigo-50 overflow-hidden">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-indigo-100">
                          <th className="px-6 py-4 text-[10px] font-black text-indigo-400 uppercase">Participant</th>
                          <th className="px-6 py-4 text-[10px] font-black text-indigo-400 uppercase">Alias</th>
                          <th className="px-6 py-4 text-[10px] font-black text-indigo-400 uppercase">Contact</th>
                          <th className="px-6 py-4 text-right"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {participants.map(p => (
                          <tr key={p.id} className="border-b border-indigo-50">
                            <td className="px-6 py-4 font-black text-indigo-900 text-sm uppercase">{p.name}</td>
                            <td className="px-6 py-4 text-indigo-500 font-black text-[11px] uppercase">{p.alias || '--'}</td>
                            <td className="px-6 py-4 text-indigo-400 font-bold text-[10px]">{p.email || p.phone || '--'}</td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button onClick={() => handleEditParticipant(p)} className="text-indigo-500 hover:text-indigo-800 px-3 py-1 font-black uppercase text-[9px] tracking-tighter">Edit Entry</button>
                                <button onClick={() => onClearUserBoxes(p.id)} className="text-red-400 hover:text-red-600 px-3 py-1 font-black uppercase text-[9px] tracking-tighter">Remove</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeSection === 'options' && activePool && (
              <AdminPoolOptions
                activePool={activePool} poolSettings={poolSettings} globalSettings={globalSettings}
                onUpdateActivePool={onUpdateActivePool} onUpdatePoolSettings={onUpdatePoolSettings} onGenerateNumbers={onGenerateNumbers}
                handleLogoFile={handleLogoFile} setAndValidateLogoUrl={setAndValidateLogoUrl}
                onOpenDraftBoard={() => setActiveSection('participants')}
              />
            )}

            {activeSection === 'branding' && (
              <AdminGlobalSettings
                globalSettings={globalSettings} onUpdateGlobalSettings={onUpdateGlobalSettings}
                handleLogoFile={handleLogoFile} setAndValidateLogoUrl={setAndValidateLogoUrl}
              />
            )}

            {activeSection === 'stats' && (
              <Stats
                activePool={activePool} squares={squares} participants={participants} scores={scores}
                settings={{ ...globalSettings, ...poolSettings }} poolName={activePool?.name}
                onUpdateSquare={onUpdateSquare} onUpdateParticipant={onUpdateParticipant} onUpdateScore={onUpdateScore}
                onUnassignSquare={onUnassignSquare} onClearUserBoxes={onClearUserBoxes}
                onApplyPayment={onApplyPayment} onEditPayment={onEditPayment} onDeletePayment={onDeletePayment}
              />
            )}

            {activeSection === 'winners' && activePool && (
              <Winners isAdmin={true} activePool={activePool} settings={{ ...globalSettings, ...poolSettings }} onAddScore={onAddScore} onUpdateScore={onUpdateScore} onDeleteScore={onDeleteScore} />
            )}

            {activeSection === 'danger' && (
              <div className="p-10 bg-red-50 rounded-[3rem] border border-red-100 items-center text-center">
                <h3 className="text-xl font-black text-red-900 uppercase mb-4">Danger Zone</h3>
                <button onClick={onResetGrid} className="w-full py-6 bg-white text-red-600 rounded-3xl font-black uppercase tracking-widest shadow-xl hover:bg-black hover:text-white transition-all border-2 border-red-100 border-dashed">CLEAR ALL DATA & RESET GRID</button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
